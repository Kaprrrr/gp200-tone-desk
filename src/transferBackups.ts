import { checkSlot, presetFromPrst, prstFromPreset } from './midi/protocol.ts';

export interface TransferBackup {
  id: string;
  slot: number;
  name: string;
  createdAt: string;
  bytes: number[];
}

const KEY = 'gp200-tone-desk:pedal-backups';

export function loadTransferBackups(storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): TransferBackup[] {
  const backups: TransferBackup[] = JSON.parse(storage.getItem(KEY) ?? '[]');
  if (!Array.isArray(backups)) throw new Error('The saved pedal backups cannot be read.');
  // Earlier versions stored newest first. Keep that one when upgrading.
  const latest = backups.slice(0, 1);
  for (const backup of latest) {
    checkSlot(backup.slot);
    if (typeof backup.id !== 'string' || typeof backup.name !== 'string' || typeof backup.createdAt !== 'string'
      || !Array.isArray(backup.bytes) || backup.bytes.some((b) => !Number.isInteger(b) || b < 0 || b > 255)) {
      throw new Error('The saved pedal backups cannot be read.');
    }
    presetFromPrst(Uint8Array.from(backup.bytes), backup.slot);
  }
  if (backups.length > 1) storage.setItem(KEY, JSON.stringify(latest));
  return latest;
}

/** A storage failure must abort the transfer before its first write. */
export function retainTransferBackup(preset: Uint8Array, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): TransferBackup {
  const backup: TransferBackup = {
    id: crypto.randomUUID(), slot: preset[6],
    name: new TextDecoder().decode(preset.slice(28, 44)).replace(/\0.*$/, ''),
    createdAt: new Date().toISOString(), bytes: [...prstFromPreset(preset)],
  };
  try {
    const serialized = JSON.stringify([backup]);
    storage.setItem(KEY, serialized);
    if (storage.getItem(KEY) !== serialized) throw new Error('Backup did not persist');
  } catch {
    throw new Error('Could not keep a preset backup in this browser. Nothing was written. Allow browser storage or free some space, then retry.');
  }
  return backup;
}
