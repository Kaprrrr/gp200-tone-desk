// Web MIDI driver for the Valeton GP-200.
//
// Message formats come from phash/gp200editor's docs/sysex-protocol.md (GPL-3)
// and were checked against this pedal (FW 1.8) on 2026-09-26:
// - The "assignment query" (CMD 0x11, sub 0x1C) is really the IR / SnapTone
//   slot-name query: reply byte 14 = 0x09 IR / 0x02 SnapTone, slot at 21-22,
//   byte 26 = 1 when empty, name nibble-encoded from byte 27.
// - Preset select (CMD 0x12, sub 0x08) takes the slot as two nibbles at 25-26;
//   the pedal echoes the same message back.
// - Effect change (sub 0x14) and param change (sub 0x18) are nibble-encoded
//   payloads with a tag byte 0xEC at payload[6] - the layout from the user's
//   gp-patch-lab phone app. Param values are plain float32 (exact knob values,
//   ms, Hz...). Both verified by eye on the pedal on 2026-09-26.
// - The legacy live-edit methods are partial. The UI uses full-preset writes,
//   verified by saved-preset readback, including bypass states and first knobs.
// Only one program can hold the pedal's MIDI port on Windows, so close the
// official GP-200 editor before connecting.
import type { PedalSlotRead } from '../../shared/types.ts';
import { Assembly, checkSlot, frame, PRESET_SIZE, presetDifferences, presetFromPrst, readRequest, unframe, validatePreset, writePayload } from './protocol.ts';

const HDR = [0xf0, 0x21, 0x25, 0x7e, 0x47, 0x50, 0x2d, 0x32];
const SLOT_NAME_REF = [
  0x01, 0x00, 0x00, 0x0c, 0x0e, 0x07, 0x03, 0x0b, 0x02, 0x00, 0x00, 0x07, 0x02, 0x04, 0x0f, 0x06, 0x05, 0x00, 0x09, 0x00, 0x0c,
  0x0f, 0x0e, 0x0d, 0x0a, 0x00, 0x0b, 0x09, 0x08, 0x07, 0x05, 0x0e, 0x08, 0x00, 0x02, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
];
const KIND_IR = 0x09;
const KIND_SNAPTONE = 0x02;
export const IR_SLOTS = 20;
export const SNAPTONE_SLOTS = 10;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const GOODBYE = [...HDR, 0x11, 0x04, 0, 0, 0, 0, 0x02, 0x02, 0, 0, 0, 0, 0, 0xf7];
const isMsg = (cmd: number, sub: number) => (m: Uint8Array) => m[0] === 0xf0 && m[8] === cmd && m[9] === sub;

function nibbleDecode(d: Uint8Array): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < d.length; i += 2) out.push((d[i] << 4) | d[i + 1]);
  return out;
}

function nibbleEncode(d: Uint8Array): number[] {
  const out: number[] = [];
  for (const b of d) out.push((b >> 4) & 0x0f, b & 0x0f);
  return out;
}

/** Block index used by live-edit messages. */
export const BLOCK_INDEX = { PRE: 0, WAH: 1, DST: 2, AMP: 3, NR: 4, CAB: 5, EQ: 6, MOD: 7, DLY: 8, RVB: 9, VOL: 10 } as const;

export interface LiveBlock {
  block: number;
  code: number;
  params: { idx: number; value: number }[];
}

export const slotLabel = (slot: number) => `${Math.floor(slot / 4) + 1}-${'ABCD'[slot % 4]}`;

/** "12-B", "12B" or "12 b" -> 45; null if it doesn't parse. */
export function parseSlotLabel(label: string): number | null {
  const m = label.trim().match(/^(\d{1,2})\s*-?\s*([abcd])$/i);
  if (!m) return null;
  const bank = Number(m[1]);
  if (bank < 1 || bank > 64) return null;
  return (bank - 1) * 4 + 'ABCD'.indexOf(m[2].toUpperCase());
}

export class GP200 {
  private queue: Uint8Array[] = [];
  private listeners = new Set<(slot: number) => void>();
  private busy = false;
  private closed = false;

  private async exclusive<T>(operation: () => Promise<T>): Promise<T> {
    if (this.busy) throw new Error('The pedal is busy. Wait for the current transfer to finish.');
    this.busy = true;
    try { return await operation(); } finally { this.busy = false; }
  }

  private constructor(
    private input: MIDIInput,
    private output: MIDIOutput,
  ) {
    input.onmidimessage = (e) => {
      if (!e.data) return;
      const msg = new Uint8Array(e.data);
      // Preset change echo (also sent when you turn the pedal's knob/footswitch).
      if (isMsg(0x12, 0x08)(msg) && msg[14] === 0x08) {
        const slot = (msg[25] << 4) | msg[26];
        this.listeners.forEach((fn) => fn(slot));
      }
      this.queue.push(msg);
      if (this.queue.length > 200) this.queue.shift();
    };
  }

  static async connect(): Promise<GP200> {
    if (!navigator.requestMIDIAccess) throw new Error('This browser has no Web MIDI. Use Chrome or Edge.');
    const access = await navigator.requestMIDIAccess({ sysex: true });
    const find = <T extends MIDIPort>(ports: Map<string, T>) => [...ports.values()].find((p) => p.name?.includes('GP-200'));
    const input = find(access.inputs as unknown as Map<string, MIDIInput>);
    const output = find(access.outputs as unknown as Map<string, MIDIOutput>);
    if (!input || !output) throw new Error('GP-200 not found. Is it plugged in and powered on?');
    try {
      await input.open();
      await output.open();
    } catch {
      await Promise.allSettled([input.close(), output.close()]);
      throw new Error('The GP-200 MIDI port is busy. Close the official GP-200 editor and try again.');
    }
    const pedal = new GP200(input, output);
    try {
      await pedal.handshake();
      return pedal;
    } catch (error) {
      await pedal.close();
      throw error;
    }
  }

  onPresetChange(fn: (slot: number) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  async close() {
    if (this.busy) throw new Error('Wait for the pedal transfer to finish before disconnecting.');
    if (this.closed) return;
    try { this.send(GOODBYE); await sleep(100); }
    catch { /* An unplugged device cannot receive goodbye; its ports still need closing. */ }
    finally {
      this.closed = true;
      this.input.onmidimessage = null;
      this.queue = [];
      await Promise.allSettled([this.input.close(), this.output.close()]);
    }
  }

  private send(bytes: number[] | Uint8Array) {
    if (this.closed) throw new Error('The pedal connection is closed. Reconnect the pedal.');
    this.output.send(bytes);
  }

  private async waitFor(pred: (m: Uint8Array) => boolean, ms: number): Promise<Uint8Array | null> {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const i = this.queue.findIndex(pred);
      if (i >= 0) return this.queue.splice(i, 1)[0];
      await sleep(5);
    }
    return null;
  }

  private async handshake() {
    // The pedal sometimes ignores the first hello after another program talked to it.
    let hello: Uint8Array | null = null;
    for (let attempt = 0; attempt < 3 && !hello; attempt++) {
      this.send([...HDR, 0x11, 0x04, 0, 0, 0, 0, 0x01, 0x02, 0, 0, 0, 0, 0, 0xf7]);
      hello = await this.waitFor(isMsg(0x12, 0x08), 2500);
    }
    if (!hello) {
      throw new Error("The GP-200 didn't answer. Unplug and replug the USB cable, then try again.");
    }
    this.send([...HDR, 0x11, 0x12, 0, 0, 0, 0xf7]); // editor mode
    await sleep(150);
    await this.readCurrentPreset();
    this.send([...HDR, 0x11, 0x0a, 0, 0, 0, 0, 0, 0x01, 0, 0, 0x06, 0, 0, 0x0d, 0x04, 0x0f, 0x07, 0x08, 0x0b, 0, 0, 0x0c, 0x0b, 0x04, 0x05, 0xf7]);
    await this.waitFor(isMsg(0x12, 0x0a), 3000);
    await sleep(1200);
    this.queue = [];
  }

  /** Active preset slot (0-255), from the state dump. */
  async currentPreset(): Promise<number> {
    return this.exclusive(() => this.readCurrentPreset());
  }

  private async readCurrentPreset(): Promise<number> {
    for (let attempt = 0; attempt < 3; attempt++) {
      this.queue = this.queue.filter((m) => !isMsg(0x12, 0x4e)(m));
      this.send([...HDR, 0x11, 0x04, 0, 0, 0, 0, 0x06, 0x01, 0, 0, 0, 0, 0, 0xf7]);
      const chunks: Uint8Array[] = [];
      for (let i = 0; i < 5; i++) {
        const c = await this.waitFor(isMsg(0x12, 0x4e), 2000);
        if (c) chunks.push(c);
      }
      const first = chunks.find((c) => c[11] === 0 && c[12] === 0);
      if (first) {
        const d = nibbleDecode(first.slice(13, first.length - 1));
        return d[8] | (d[9] << 8);
      }
      await sleep(300);
    }
    throw new Error("Couldn't read the active preset from the pedal.");
  }

  async selectPreset(slot: number) {
    return this.exclusive(() => this.switchPreset(slot));
  }

  private async switchPreset(slot: number) {
    checkSlot(slot);
    const matches = (msg: Uint8Array) => msg.length === 30 && isMsg(0x12, 0x08)(msg) && msg[14] === 8 && ((msg[25] << 4) | msg[26]) === slot;
    for (let attempt = 0; attempt < 3; attempt++) {
      this.queue = this.queue.filter((msg) => !matches(msg));
      this.send([...HDR, 0x12, 0x08, 0, 0, 0, 0, 0x08, 0x01, 0, 0, 0x04, 0, 0, 0, 0, 0, 0, slot >> 4, slot & 0x0f, 0, 0, 0xf7]);
      if (await this.waitFor(matches, 1500)) return;
    }
    throw new Error(`The pedal did not confirm preset ${slotLabel(slot)}.`);
  }

  private async renewSession() {
    try { this.send(GOODBYE); await sleep(100); }
    catch { /* Retry port opening even when the old MIDI session cannot send. */ }
    await Promise.allSettled([this.input.close(), this.output.close()]);
    await this.input.open();
    await this.output.open();
    this.queue = [];
    // Called under the existing operation lock; handshake uses private reads.
    await this.handshake();
  }

  private async readPresetData(slot: number, onRecovery?: () => void): Promise<Uint8Array> {
    checkSlot(slot);
    const matches = (msg: Uint8Array) => unframe(msg)?.total === PRESET_SIZE;
    let mostReceived = 0;
    for (let attempt = 0; attempt < 3; attempt++) {
      // Repeating a request may not repair a stalled MIDI session. Reopen once,
      // then retry only the read, never the preset write.
      if (attempt === 2) {
        onRecovery?.();
        await this.renewSession();
      }
      this.queue = this.queue.filter((msg) => !matches(msg));
      const assembly = new Assembly(PRESET_SIZE);
      this.send(readRequest(slot));
      const deadline = Date.now() + 3000;
      while (Date.now() < deadline) {
        const msg = await this.waitFor(matches, Math.max(1, deadline - Date.now()));
        if (!msg) break;
        const data = assembly.add(msg);
        mostReceived = Math.max(mostReceived, assembly.receivedBytes);
        if (data) {
          validatePreset(data, slot);
          return data;
        }
      }
      await sleep(150);
    }
    throw new Error(`Could not read preset ${slotLabel(slot)} after reconnecting (${mostReceived}/${PRESET_SIZE} bytes received). Close other Tone Desk tabs and the official editor. If it still fails, unplug USB, power-cycle the pedal, reconnect USB, then click Reconnect pedal.`);
  }

  async readPreset(slot: number): Promise<Uint8Array> {
    return this.exclusive(() => this.readPresetData(slot));
  }

  /** Write every block and verify the destination after reloading it from storage. */
  async writePreset(slot: number, prst: Uint8Array, backup: (data: Uint8Array) => void,
    onProgress?: (done: number, total: number) => void, onRecovery?: () => void) {
    const expected = presetFromPrst(prst, slot);
    return this.exclusive(async () => {
      let original: Uint8Array;
      try { original = await this.readPresetData(slot, onRecovery); }
      catch (error) { throw new Error(`Could not back up ${slotLabel(slot)}. No preset was written. ${error instanceof Error ? error.message : String(error)}`); }
      // Retain the existing preset before the first write, including its assignments.
      backup(original);
      await sleep(1000);
      const chunks = frame(writePayload(expected, slot));
      const total = chunks.length + 2;
      onProgress?.(0, total);
      try {
        for (let i = 0; i < chunks.length; i++) {
          this.send(chunks[i]);
          await sleep(10);
          onProgress?.(i + 1, total);
        }
        // The official import commits these records directly. A live-buffer SAVE
        // afterward can overwrite the import with the previously active tone.
        await sleep(2000);
        await this.switchPreset(slot);
        await sleep(800);
        onProgress?.(total - 1, total);
        const actual = await this.readPresetData(slot, onRecovery);
        const differences = presetDifferences(expected, actual);
        if (differences.length) throw new Error(`Transfer was not verified: ${differences.join(', ')}.`);
        onProgress?.(total, total);
      } catch (error) {
        throw new Error(`Preset ${slotLabel(slot)} may have changed, but the transfer was not confirmed. ${error instanceof Error ? error.message : String(error)} Your previous preset is available under Undo last send.`);
      }
    });
  }

  private effectChange(block: number, code: number) {
    const d = new Uint8Array(20);
    d[2] = 0x04; d[6] = 0xec; d[8] = 0x16; d[10] = 0x08; d[12] = block;
    new DataView(d.buffer).setUint32(16, code >>> 0, true);
    return [...HDR, 0x12, 0x14, 0, 0, 0, ...nibbleEncode(d), 0xf7];
  }

  private paramChange(block: number, idx: number, value: number) {
    const d = new Uint8Array(24);
    d[2] = 0x04; d[6] = 0xec; d[8] = 0x05; d[10] = 0x0c; d[12] = block; d[13] = idx;
    new DataView(d.buffer).setFloat32(20, value, true);
    return [...HDR, 0x12, 0x18, 0, 0, 0, ...nibbleEncode(d), 0xf7];
  }

  /**
   * Load effects + knob values into a preset live. Nothing is stored until the
   * player presses SAVE on the pedal.
   *
   * Verified on FW 1.8: effect changes and most knobs land, but a block's FIRST
   * knob (idx 0) often doesn't, and switching presets right before sending makes
   * the pedal drop the edits while it reloads. So we only switch when needed and
   * then wait, and the UI lists the first knobs for the player to check by hand.
   */
  async loadPatch(preset: number, blocks: LiveBlock[], onProgress?: (done: number, total: number) => void) {
    const total = blocks.length * 2;
    let done = 0;
    const log = (...a: unknown[]) => console.log('[Tone Desk send]', ...a);
    log('start', { preset, blocks: blocks.map((b) => [b.block, b.code.toString(16), b.params.length]) });
    if ((await this.currentPreset().catch(() => -1)) !== preset) {
      await this.selectPreset(preset);
      log('switched preset; waiting for it to load');
      await sleep(3000);
    }
    const sendParams = async (b: LiveBlock) => {
      for (const p of b.params) {
        this.send(this.paramChange(b.block, p.idx, p.value));
        await sleep(60);
      }
      // Re-send the first knob last, once the block is open for editing.
      const first = b.params.find((p) => p.idx === 0);
      if (first) {
        this.send(this.paramChange(b.block, first.idx, first.value));
        await sleep(60);
      }
    };
    for (const b of blocks) {
      this.queue = this.queue.filter((m) => !isMsg(0x12, 0x0c)(m));
      this.send(this.effectChange(b.block, b.code));
      // The pedal confirms an effect change with sub 0x0C (only when the effect actually changes).
      const ok = await this.waitFor(isMsg(0x12, 0x0c), 1500);
      log('block', b.block, 'effect', b.code.toString(16), ok ? 'confirmed' : 'no confirm (unchanged?)');
      await sleep(250);
      await sendParams(b);
      onProgress?.(++done, total);
    }
    // Second pass: re-send every knob now that all algorithms have settled.
    for (const b of blocks) {
      await sendParams(b);
      onProgress?.(++done, total);
    }
    log('done');
  }

  private slotNameQuery(kind: number, slot: number) {
    const hdr = [0x00, 0x00, 0x00, kind === KIND_SNAPTONE ? 0x01 : 0x00, kind, 0x01, 0x00, 0x01, 0x08];
    return [...HDR, 0x11, 0x1c, ...hdr, 0x00, 0x00, (slot >> 4) & 0x0f, slot & 0x0f, 0x00, 0x00, 0x00, ...SLOT_NAME_REF, 0xf7];
  }

  private async readSlotName(kind: number, slot: number) {
    const matches = (m: Uint8Array) => isMsg(0x12, 0x1c)(m) && m[14] === kind && ((m[21] << 4) | m[22]) === slot;
    for (let attempt = 0; attempt < 3; attempt++) {
      this.send(this.slotNameQuery(kind, slot));
      const r = await this.waitFor(matches, 1200);
      if (!r) continue;
      const empty = r[26] === 1;
      const d = nibbleDecode(r.slice(27, r.length - 1)).slice(5);
      const end = d.indexOf(0);
      const name = String.fromCharCode(...(end < 0 ? d : d.slice(0, end))).trim();
      return { slot, name: empty ? '' : name, empty };
    }
    throw new Error(`No reply for ${kind === KIND_IR ? 'IR' : 'SnapTone'} slot ${slot}.`);
  }

  /** Read the names in all SnapTone and User IR slots. */
  async readSlots(onProgress?: (done: number, total: number) => void): Promise<PedalSlotRead> {
    return this.exclusive(() => this.readSlotNames(onProgress));
  }

  private async readSlotNames(onProgress?: (done: number, total: number) => void): Promise<PedalSlotRead> {
    const total = SNAPTONE_SLOTS + IR_SLOTS;
    const result: PedalSlotRead = { snaptones: [], irs: [] };
    for (let s = 0; s < SNAPTONE_SLOTS; s++) {
      result.snaptones.push(await this.readSlotName(KIND_SNAPTONE, s));
      onProgress?.(result.snaptones.length, total);
    }
    for (let s = 0; s < IR_SLOTS; s++) {
      result.irs.push(await this.readSlotName(KIND_IR, s));
      onProgress?.(SNAPTONE_SLOTS + result.irs.length, total);
    }
    return result;
  }
}
