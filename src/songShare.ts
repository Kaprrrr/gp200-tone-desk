// Song patch files members can share. The file carries a description of any
// SnapTones / IRs the patch uses, since everyone's pedal holds different ones.
import type { IrSlot, PatchBlock, SnapTone, SongTone } from '../shared/types.ts';
import { snapSlotLabel } from './format.ts';

const KIND = 'gp200-tone-desk/song';

interface SongFile {
  kind: typeof KIND;
  version: 1;
  song: Omit<SongTone, 'id' | 'createdAt' | 'updatedAt'>;
  snaptones: { slot: number; pedalName: string; fullName: string; basedOn: string; character: string; source: string }[];
  irs: { slot: number; name: string; notes: string }[];
}

export function exportSong(song: SongTone, snaptones: SnapTone[], irs: IrSlot[]): string {
  const { id: _id, createdAt: _c, updatedAt: _u, presetSlot: _p, ...rest } = song;
  const used = (model: string) => song.blocks.filter((b) => b.model === model && b.snaptoneSlot !== null).map((b) => b.snaptoneSlot!);
  const file: SongFile = {
    kind: KIND,
    version: 1,
    song: { ...rest, presetSlot: '' },
    snaptones: snaptones
      .filter((s) => s.slot !== null && used('SnapTone').includes(s.slot))
      .map((s) => ({ slot: s.slot!, pedalName: s.pedalName, fullName: s.fullName, basedOn: s.basedOn, character: s.character, source: s.source })),
    irs: irs.filter((i) => used('User IR').includes(i.slot)).map((i) => ({ slot: i.slot, name: i.name, notes: i.notes })),
  };
  return JSON.stringify(file, null, 2);
}

/**
 * Read a shared song file and remap its SnapTone/IR slots onto this member's
 * pedal by name. Anything they don't have is listed so they can swap it.
 */
export function importSong(text: string, mySnaps: SnapTone[], myIrs: IrSlot[]): { song: SongFile['song']; missing: string[] } {
  let file: SongFile;
  try {
    file = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a Tone Desk song.");
  }
  if (file?.kind !== KIND || !file.song || !Array.isArray(file.song.blocks)) throw new Error("That file isn't a Tone Desk song.");

  const missing: string[] = [];
  const blocks: PatchBlock[] = file.song.blocks.map((b) => {
    if (b.snaptoneSlot === null) return b;
    const slot = b.snaptoneSlot;
    if (b.model === 'SnapTone') {
      const theirs = file.snaptones.find((s) => s.slot === b.snaptoneSlot);
      const mine = theirs && mySnaps.find((s) => s.slot !== null && (s.pedalName === theirs.pedalName || (s.fullName && s.fullName === theirs.fullName)));
      if (mine && (b.module === 'AMP') === mine.slot! < 5) return { ...b, snaptoneSlot: mine.slot };
      if (mine) {
        missing.push(`${b.module}: you have "${mine.fullName || mine.pedalName}", but in ${snapSlotLabel(mine.slot!)}. Load it into a ${b.module} slot, or use it from the other block.`);
        return { ...b, snaptoneSlot: null };
      }
      const what = theirs ? `"${theirs.fullName || theirs.pedalName}"${theirs.basedOn ? ` (based on ${theirs.basedOn})` : ''}${theirs.source ? ` from ${theirs.source}` : ''}` : 'a capture';
      missing.push(`${b.module}: uses SnapTone ${what}, which isn't on your pedal. Pick a similar capture of yours or a built-in model.`);
      return { ...b, snaptoneSlot: null, note: `${b.note ? `${b.note} · ` : ''}Original: ${theirs ? theirs.fullName || theirs.pedalName : `SnapTone ${snapSlotLabel(slot)}`}` };
    }
    if (b.model === 'User IR') {
      const theirs = file.irs.find((i) => i.slot === b.snaptoneSlot);
      const mine = theirs && myIrs.find((i) => !i.empty && i.name === theirs.name);
      if (mine) return { ...b, snaptoneSlot: mine.slot };
      missing.push(`CAB: uses User IR "${theirs?.name ?? `IR ${slot + 1}`}", which isn't on your pedal. Pick one of your IRs or a built-in cab.`);
      return { ...b, snaptoneSlot: null, note: `${b.note ? `${b.note} · ` : ''}Original IR: ${theirs?.name ?? '?'}` };
    }
    return b;
  });

  return { song: { ...file.song, blocks, presetSlot: '' }, missing };
}
