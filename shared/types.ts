// Types shared by the local server and the browser app.

export type ModuleId = 'PRE' | 'WAH' | 'DST' | 'AMP' | 'NR' | 'CAB' | 'EQ' | 'MOD' | 'DLY' | 'RVB' | 'VOL';
export const MODULES: ModuleId[] = ['PRE', 'WAH', 'DST', 'AMP', 'NR', 'CAB', 'EQ', 'MOD', 'DLY', 'RVB', 'VOL'];

export interface CatalogParam {
  /** Hardware parameter ID within the 15-float preset block, not the editor's display idx. */
  id: number;
  name: string;
  kind: 'knob' | 'slider' | 'switch' | 'combox';
  default: number;
  min: number;
  max: number;
  step?: number;
  /** Tempo sync changes a time/rate value into a note-division index. */
  tempoSync?: boolean;
  options?: string[];
}

export interface CatalogEntry {
  name: string;
  module: ModuleId;
  code: number;
  index: number;
  params: CatalogParam[];
  type?: string;
  basedOn?: string;
  description?: string;
  snaptoneSlot?: number; // SnapTone entries: pedal slot 0-4 (AMP) / 5-9 (DST)
  irSlot?: number; // CAB "User IR" entries: pedal IR slot 0-19
}

export interface Catalog {
  source: string;
  modules: Record<ModuleId, CatalogEntry[]>;
}

/** A NAM capture you own. It may or may not currently be loaded into a pedal slot. */
export interface SnapTone {
  id: string;
  /** Pedal slot 0-9 it's loaded in (0-4 = AMP block, 5-9 = DST block), or null if not on the pedal. */
  slot: number | null;
  /** Name as the pedal reports it (max 15 chars). */
  pedalName: string;
  /** Your full descriptive name, e.g. "Fender Super Reverb - Normal ch, edge of breakup". */
  fullName: string;
  kind: 'amp' | 'pedal' | 'amp+pedal' | 'other';
  basedOn: string;
  character: 'clean' | 'edge' | 'crunch' | 'high-gain' | 'fuzz' | 'other';
  /** Where you got it (TONE3000 / ToneHunt URL, pack name...). */
  source: string;
  /** Recommended starting knob values. SnapTone Gain/Volume: 0 = -24 dB, 50 = unity, 100 = +24 dB. */
  defaults: { gain: number; volume: number; bass: number; middle: number; treble: number };
  tags: string[];
  notes: string;
  lastSeenOnPedal: string | null;
  updatedAt: string;
}

export interface IrSlot {
  slot: number;
  name: string;
  empty: boolean;
  notes: string;
  lastSeenOnPedal: string | null;
}

export interface PatchBlock {
  module: ModuleId;
  enabled: boolean;
  /** Catalog model name, e.g. "UK 800" or "SnapTone". */
  model: string;
  /** model "SnapTone": pedal SnapTone slot 0-9. model "User IR": IR slot 0-19. Otherwise null. */
  snaptoneSlot: number | null;
  params: { name: string; value: number }[];
  note: string;
}

export interface SongTone {
  id: string;
  title: string;
  artist: string;
  part: string; // "Rhythm", "Lead", "Clean intro"...
  tuning: string;
  guitar: string; // guitar / pickup position notes
  presetSlot: string; // pedal preset you saved it to, e.g. "12-B"
  blocks: PatchBlock[];
  summary: string;
  /** Claude's reasoning for the choices. */
  why?: string;
  playingTips: string;
  notes: string;
  source: 'ai' | 'manual';
  createdAt: string;
  updatedAt: string;
}

export interface Suggestion {
  summary: string;
  why: string;
  playingTips: string;
  tuning: string;
  blocks: PatchBlock[];
  warnings: string[];
}

export interface PedalSlotRead {
  snaptones: { slot: number; name: string; empty: boolean }[];
  irs: { slot: number; name: string; empty: boolean }[];
}
