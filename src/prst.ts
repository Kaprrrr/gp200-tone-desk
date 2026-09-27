// Build a GP-200 patch file (.prst) the official editor can import
// ("Import Patches" -> pick a target slot). The editor then writes it to the
// pedal reliably - blocks on/off, SnapTones, User IRs and every knob.
//
// Layout from phash/gp200editor docs/prst-format.md + PRSTEncoder (GPL-3.0):
// 1224 bytes; name @0x44, author @0x54, routing @0x8C, 11 effect blocks of
// 72 bytes from 0xA0 (+4 index, +5 on/off, +8 effect code LE, +12 15x float32
// params by hardware ID), checksum = sum(bytes[0..0x4C5]) & 0xFFFF stored big-endian @0x4C6.
import catalogJson from '../shared/catalog.json' with { type: 'json' };
import { MODULES, type Catalog, type CatalogEntry, type PatchBlock } from '../shared/types.ts';
import { PRST_TEMPLATE_B64 } from './prstTemplate.ts';

const catalog = catalogJson as unknown as Catalog;
const SIZE = 1224;
const BLOCKS_AT = 0xa0;
const BLOCK_SIZE = 0x48;
const CHECKSUM_AT = 0x4c6;

function entryFor(b: PatchBlock): CatalogEntry | undefined {
  return catalog.modules[b.module].find((e) =>
    b.model === 'SnapTone' ? e.snaptoneSlot === b.snaptoneSlot : b.model === 'User IR' ? e.irSlot === b.snaptoneSlot : e.name === b.model,
  );
}

/** Pedal-safe patch name: printable ASCII, max 16 chars. */
export function prstName(title: string) {
  return title.replace(/[^\x20-\x7e]/g, '').replace(/[<>:"/\\|?*]/g, '').trim().slice(0, 16) || 'Tone Desk';
}

export function encodePrst(blocks: PatchBlock[], name: string, author = 'Tone Desk'): Uint8Array<ArrayBuffer> {
  if (!blocks.length) throw new Error('Add at least one effect block before sending this patch.');
  const seen = new Set<string>();
  for (const block of blocks) {
    if (!MODULES.includes(block.module) || seen.has(block.module)) throw new Error('The patch has an invalid or duplicate effect block.');
    seen.add(block.module);
    const entry = entryFor(block);
    if (!entry) throw new Error(`${block.module}: choose a valid model or capture slot before sending.`);
    for (const param of block.params) {
      const spec = entry.params.find((p) => p.name === param.name);
      if (!spec || !Number.isFinite(param.value) || param.value < spec.min || param.value > spec.max
        || (spec.options && !Number.isInteger(param.value))) {
        throw new Error(`${block.module}: ${param.name} has an invalid value. Edit the patch before sending.`);
      }
    }
  }
  // Start from a real editor-exported blank preset; only overwrite what we model.
  const buf = Uint8Array.from(atob(PRST_TEMPLATE_B64), (c) => c.charCodeAt(0));
  if (buf.length !== SIZE) throw new Error('Bad .prst template');
  const v = new DataView(buf.buffer);
  const ascii = (at: number, s: string, max: number) => {
    buf.fill(0, at, at + max);
    for (let i = 0; i < max && i < s.length; i++) buf[at + i] = s.charCodeAt(i) & 0x7f;
  };

  v.setUint32(0x1c, Math.floor(Date.now() / 1000) >>> 0, true);
  ascii(0x44, prstName(name), 16);
  ascii(0x54, author, 16);

  MODULES.forEach((module, index) => {
    const base = BLOCKS_AT + index * BLOCK_SIZE;
    const block = blocks.find((b) => b.module === module);
    const entry = block && entryFor(block);
    if (!entry) {
      // Not in this patch: keep the template's model and settings, bypassed (VOL stays on).
      buf[base + 5] = module === 'VOL' ? buf[base + 5] : 0;
      return;
    }
    buf[base + 4] = index;
    buf[base + 5] = block.enabled ? 1 : 0;
    v.setUint32(base + 8, entry.code >>> 0, true);
    // Cabinets share hidden mic settings at IDs 0/2/3/4. Keep the editor template's
    // valid values; the exposed Volume/Low Cut/High Cut overwrite IDs 1/5/6.
    if (module !== 'CAB') buf.fill(0, base + 12, base + 72);
    // Every captured EV 51 preset retains 50 in its unexposed parameter 5.
    // Preserve that baseline instead of replacing it with a guessed zero.
    if (module === 'AMP' && entry.code === 0x0700005a) v.setFloat32(base + 12 + 5 * 4, 50, true);
    for (const p of entry.params) {
      const value = block.params.find((x) => x.name === p.name)?.value ?? p.default;
      // Tempo-synced values use note indices, not the milliseconds/Hz exposed by this UI.
      if (p.tempoSync && value !== 0) throw new Error(`${module} ${entry.name}: set ${p.name} to OFF and use the time/rate control. Tempo sync is not supported yet.`);
      if (!Number.isInteger(p.id) || p.id < 0 || p.id >= 15 || !Number.isFinite(value)
        || value < p.min || value > p.max || (p.options && !Number.isInteger(value))) {
        throw new Error(`${module}: ${p.name} has an invalid parameter definition or value.`);
      }
      v.setFloat32(base + 12 + p.id * 4, value, true);
    }
  });

  let sum = 0;
  for (let i = 0; i < CHECKSUM_AT; i++) sum += buf[i];
  v.setUint16(CHECKSUM_AT, sum & 0xffff, false);
  return buf;
}

export function downloadPrst(blocks: PatchBlock[], title: string) {
  const name = prstName(title);
  downloadPrstBytes(encodePrst(blocks, name), `${name}.prst`);
}

export function downloadPrstBytes(bytes: Uint8Array, filename: string) {
  const url = URL.createObjectURL(new Blob([Uint8Array.from(bytes)], { type: 'application/octet-stream' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
