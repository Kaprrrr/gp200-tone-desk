// Everything a member saves lives in their own browser (localStorage).
// Nothing is sent anywhere. Export/Import in the Data tab is the backup.
import type { IrSlot, PedalSlotRead, SnapTone, SongTone } from '../shared/types.ts';

export interface Db {
  version: 1;
  snaptones: SnapTone[];
  irs: IrSlot[];
  songs: SongTone[];
}

const KEY = 'gp200-tone-desk:db';
export const emptyDb = (): Db => ({ version: 1, snaptones: [], irs: [], songs: [] });

export function loadDb(): { db: Db; persistent: boolean } {
  try {
    const raw = localStorage.getItem(KEY);
    return { db: raw ? { ...emptyDb(), ...JSON.parse(raw) } : emptyDb(), persistent: true };
  } catch {
    return { db: emptyDb(), persistent: false };
  }
}

export function persistDb(db: Db): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
    return true;
  } catch {
    return false;
  }
}

export const now = () => new Date().toISOString();
export const newId = () => crypto.randomUUID();

export const newSnapTone = (fields: Partial<SnapTone> = {}): SnapTone => ({
  id: newId(),
  slot: null,
  pedalName: '',
  fullName: '',
  kind: 'amp',
  basedOn: '',
  character: 'other',
  source: '',
  defaults: { gain: 50, volume: 50, bass: 50, middle: 50, treble: 50 },
  tags: [],
  notes: '',
  lastSeenOnPedal: null,
  updatedAt: now(),
  ...fields,
});

/**
 * Merge a fresh read of the pedal's slots into the library. Entries keep their
 * notes; a capture no longer in its slot stays in the library, marked off-pedal.
 */
export function mergePedalRead(db: Db, read: PedalSlotRead): { db: Db; changes: string[] } {
  const stamp = now();
  const changes: string[] = [];
  const snaptones = db.snaptones.map((s) => ({ ...s }));

  for (const s of snaptones) {
    if (s.slot === null) continue;
    const onPedal = read.snaptones.find((r) => r.slot === s.slot);
    if (!onPedal || onPedal.empty || onPedal.name !== s.pedalName) {
      changes.push(`"${s.pedalName}" is no longer in its slot`);
      s.slot = null;
      s.updatedAt = stamp;
    }
  }
  for (const r of read.snaptones) {
    if (r.empty) continue;
    const inSlot = snaptones.find((s) => s.slot === r.slot);
    if (inSlot) {
      inSlot.lastSeenOnPedal = stamp;
      continue;
    }
    // Same capture reloaded, possibly into a different slot: reuse its entry.
    const known = snaptones.find((s) => s.slot === null && s.pedalName === r.name);
    if (known) {
      known.slot = r.slot;
      known.lastSeenOnPedal = stamp;
      known.updatedAt = stamp;
      changes.push(`"${r.name}" is back on the pedal`);
      continue;
    }
    snaptones.push(newSnapTone({ slot: r.slot, pedalName: r.name, fullName: r.name, kind: r.slot < 5 ? 'amp' : 'pedal', lastSeenOnPedal: stamp }));
    changes.push(`New capture "${r.name}"`);
  }

  const irs = read.irs.map((r): IrSlot => {
    const prev = db.irs.find((i) => i.slot === r.slot);
    if (prev && prev.name !== r.name && !r.empty) changes.push(`IR ${r.slot + 1} is now "${r.name}"`);
    return { slot: r.slot, name: r.empty ? '' : r.name, empty: r.empty, notes: prev && prev.name === r.name ? prev.notes : '', lastSeenOnPedal: stamp };
  });

  return { db: { ...db, snaptones, irs }, changes };
}

/** Accept a backup file; throws with a readable message if it isn't one. */
export function parseBackup(text: string): Db {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a Tone Desk backup.");
  }
  const d = data as Partial<Db>;
  if (!d || d.version !== 1 || !Array.isArray(d.snaptones) || !Array.isArray(d.songs)) throw new Error("That file isn't a Tone Desk backup.");
  return { ...emptyDb(), ...d } as Db;
}

export function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const safeFilename = (s: string) => s.replace(/[<>:"/\\|?*]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 60) || 'song';
