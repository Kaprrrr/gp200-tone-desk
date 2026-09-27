// The envelope carries decoded byte counts, not opcodes or preset numbers.
// Confirmed against GP-200 FW 1.8 replies captured on 2026-09-26.
import { PRST_TEMPLATE_B64 } from '../prstTemplate.ts';

export const HEADER = [0xf0, 0x21, 0x25, 0x7e, 0x47, 0x50, 0x2d, 0x32];
export const PRESET_SIZE = 1176;

export function checkSlot(slot: number) {
  if (!Number.isInteger(slot) || slot < 0 || slot > 255) throw new Error('Preset slot out of range');
}

export function frame(payload: Uint8Array, command = 0x12, chunkSize = 183): Uint8Array[] {
  if (!payload.length || payload.length > 16383) throw new Error('Invalid MIDI payload length');
  if (!Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize > 185) throw new Error('Invalid MIDI chunk size');
  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < payload.length; offset += chunkSize) {
    const nibbles = [...payload.slice(offset, offset + chunkSize)].flatMap((b) => [b >> 4, b & 15]);
    chunks.push(new Uint8Array([...HEADER, command, payload.length & 127, payload.length >> 7,
      offset & 127, offset >> 7, ...nibbles, 0xf7]));
  }
  return chunks;
}

export function unframe(msg: Uint8Array): { command: number; total: number; offset: number; data: Uint8Array } | null {
  if (msg.length < 16 || !HEADER.every((b, i) => msg[i] === b) || msg.at(-1) !== 0xf7) return null;
  if ([...msg.slice(8, -1)].some((b) => b > 127)) return null;
  const nibbles = msg.slice(13, -1);
  if (nibbles.length % 2 || nibbles.some((b) => b > 15)) return null;
  const total = msg[9] | (msg[10] << 7);
  const offset = msg[11] | (msg[12] << 7);
  const data = Uint8Array.from({ length: nibbles.length / 2 }, (_, i) => (nibbles[i * 2] << 4) | nibbles[i * 2 + 1]);
  if (!total || offset + data.length > total) return null;
  return { command: msg[8], total, offset, data };
}

/** Collect a complete response; duplicates cannot hide missing chunks. */
export class Assembly {
  private data: Uint8Array;
  private covered: Uint8Array;
  constructor(readonly total: number) {
    this.data = new Uint8Array(total);
    this.covered = new Uint8Array(total);
  }
  get receivedBytes(): number { return this.covered.reduce((sum, byte) => sum + byte, 0); }
  add(msg: Uint8Array): Uint8Array | null {
    const part = unframe(msg);
    if (!part || part.command !== 0x12 || part.total !== this.total) return null;
    for (let i = 0; i < part.data.length; i++) {
      const at = part.offset + i;
      if (this.covered[at] && this.data[at] !== part.data[i]) throw new Error('Conflicting pedal response chunks');
      this.data[at] = part.data[i];
      this.covered[at] = 1;
    }
    return this.covered.every(Boolean) ? this.data.slice() : null;
  }
}

export function readRequest(slot: number): Uint8Array {
  checkSlot(slot);
  const payload = new Uint8Array(16);
  payload.set([0, 0, 4, 0, 1, 0, slot, 0, 1, 0, 4, 0, slot, 0, slot, 0]);
  return frame(payload, 0x11)[0];
}

export function validatePreset(data: Uint8Array, slot: number) {
  checkSlot(slot);
  if (data.length !== PRESET_SIZE || data[0] !== 0 || data[2] !== 4 || data[4] !== 1 || data[6] !== slot || data[7] !== 0
    || data[8] !== 2 || data[10] !== 88 || data[12] !== slot || data[13] !== 0) {
    throw new Error('The pedal returned an invalid preset or a different slot');
  }
  for (let b = 0; b < 11; b++) {
    const at = 120 + b * 72;
    if (data[at] !== 20 || data[at + 2] !== 68 || data[at + 4] !== b || data[at + 5] > 1) {
      throw new Error(`Invalid effect block ${b} in the pedal response`);
    }
  }
}

export function presetFromPrst(prst: Uint8Array, slot: number): Uint8Array {
  checkSlot(slot);
  if (prst.length !== 1224 || String.fromCharCode(...prst.slice(0, 4)) !== 'TSRP') throw new Error('Invalid GP-200 patch file');
  const sum = prst.slice(0, 1222).reduce((s, b) => s + b, 0) & 65535;
  if (sum !== ((prst[1222] << 8) | prst[1223])) throw new Error('Patch file checksum does not match');
  const data = new Uint8Array(PRESET_SIZE);
  data.set([0, 0, 4, 0, 1, 0, slot, 0]);
  // The file wraps these records in a 48-byte header and an 8-byte trailer.
  data.set(prst.slice(48, 1216), 8);
  data[12] = slot;
  data[13] = 0;
  data[104] = slot;
  data[105] = 0;
  validatePreset(data, slot);
  return data;
}

export function writePayload(preset: Uint8Array, slot: number): Uint8Array {
  validatePreset(preset, slot);
  const data = new Uint8Array(PRESET_SIZE + 8);
  data.set(preset.slice(0, 8));
  data.set([1, 0, 4, 0, slot, 0, slot, 0], 8);
  data.set(preset.slice(8), 16);
  return data;
}

/** Preserve all saved records, including assignments not exposed by Tone Desk. */
export function prstFromPreset(preset: Uint8Array): Uint8Array<ArrayBuffer> {
  validatePreset(preset, preset[6]);
  const prst = Uint8Array.from(atob(PRST_TEMPLATE_B64), (c) => c.charCodeAt(0));
  prst.set(preset.slice(8), 48);
  const sum = prst.slice(0, 1222).reduce((a, b) => a + b, 0) & 65535;
  prst[1222] = sum >> 8;
  prst[1223] = sum & 255;
  return prst;
}

export function saveRequest(slot: number, preset: Uint8Array): Uint8Array {
  validatePreset(preset, slot);
  const data = new Uint8Array(24);
  data.set([3, 0x20, 20, 0, slot, 0, 0, 0]);
  data.set(preset.slice(28, 44), 8);
  return frame(data)[0];
}

/** Compare musical settings, excluding reserved bytes and runtime pedal position. */
export function presetDifferences(expected: Uint8Array, actual: Uint8Array): string[] {
  const differences: string[] = [];
  const same = (at: number, size: number) => expected.slice(at, at + size).every((b, i) => b === actual[at + i]);
  if (!same(28, 16)) differences.push('preset name');
  if (!same(106, 13)) differences.push('signal chain');
  const names = ['PRE', 'WAH', 'DST', 'AMP', 'NR', 'CAB', 'EQ', 'MOD', 'DLY', 'RVB', 'VOL'];
  for (let b = 0; b < 11; b++) {
    const at = 120 + b * 72;
    if (!same(at + 5, 1)) differences.push(`${names[b]} on/off`);
    if (!same(at + 8, 4)) differences.push(`${names[b]} model`);
    if (!same(at + 12, 60)) differences.push(`${names[b]} knobs`);
  }
  return differences;
}
