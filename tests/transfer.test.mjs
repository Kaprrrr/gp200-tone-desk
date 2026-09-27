import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { encodePrst } from '../src/prst.ts';
import { PRST_TEMPLATE_B64 } from '../src/prstTemplate.ts';
import { Assembly, presetFromPrst, prstFromPreset } from '../src/midi/protocol.ts';
import { loadTransferBackups, retainTransferBackup } from '../src/transferBackups.ts';

const assembly = new Assembly(1176);
let original;
for (const hex of JSON.parse(readFileSync(new URL('./fixtures/preset-58-A.json', import.meta.url)))) {
  original = assembly.add(Uint8Array.from(hex.split(' ').map((b) => parseInt(b, 16)))) ?? original;
}
const block = (module, model, slot, params = []) => ({ module, model, snaptoneSlot: slot, enabled: true, params, note: '' });

test('Given a captured preset, when saved as a backup file, then all saved records survive the round trip', () => {
  assert.deepEqual(presetFromPrst(prstFromPreset(original), 228), original);
});

test('Given SnapTone and User IR choices, when building a song preset, then slots, first knobs and bypass states are encoded', () => {
  const prst = encodePrst([
    block('AMP', 'SnapTone', 3, [{ name: 'Gain', value: 42 }]),
    block('CAB', 'User IR', 7, [{ name: 'Volume', value: 39 }]),
    { ...block('RVB', 'Room', null, [{ name: 'Mix', value: 23 }]), enabled: false },
  ], 'Test song');
  const data = presetFromPrst(prst, 228);
  const view = new DataView(data.buffer);
  assert.equal(view.getUint32(120 + 3 * 72 + 8, true), 0x0f000003);
  assert.equal(view.getFloat32(120 + 3 * 72 + 12, true), 42);
  assert.equal(view.getUint32(120 + 5 * 72 + 8, true), 0x0a100007);
  assert.equal(view.getFloat32(120 + 5 * 72 + 16, true), 39);
  assert.equal(view.getFloat32(120 + 9 * 72 + 12, true), 23);
  assert.equal(data[120 + 9 * 72 + 5], 0);
  assert.equal(data[120 + 8 * 72 + 5], 0);
});

test('Given the reported Beautiful Strange patch, when encoded, then delay times cannot occupy feedback slots', () => {
  const blocks = JSON.parse(readFileSync(new URL('./fixtures/beautiful-strange-blocks.json', import.meta.url), 'utf8'));
  const data = presetFromPrst(encodePrst(blocks, 'Beautiful Strange'), 231);
  const view = new DataView(data.buffer);
  const knobs = (block) => Array.from({ length: 15 }, (_, i) => view.getFloat32(120 + block * 72 + 12 + i * 4, true));
  // Hardware parameter IDs, independent of the catalog's display order.
  assert.deepEqual(knobs(8).slice(0, 9), [22, 30, 643, 18, 25, 857, 0, 0, 0]);
  const cab = knobs(5);
  assert.equal(cab[1], 50);
  assert.equal(cab[5], 80);
  assert.equal(cab[6], 7500);
  const template = Buffer.from(PRST_TEMPLATE_B64, 'base64');
  for (const id of [0, 2, 3, 4]) assert.equal(cab[id], template.readFloatLE(160 + 5 * 72 + 12 + id * 4));
  assert.deepEqual(knobs(3).slice(0, 7), [50, 45, 45, 55, 50, 60, 48]);
});

test('Given a captured SUP Star cab, when encoding its exposed controls, then parameter positions match the real pedal', () => {
  const assembly = new Assembly(1176);
  let captured;
  for (const hex of JSON.parse(readFileSync(new URL('./fixtures/preset-10-D.json', import.meta.url), 'utf8'))) {
    captured = assembly.add(Uint8Array.from(hex.split(' ').map((b) => parseInt(b, 16)))) ?? captured;
  }
  const at = 120 + 5 * 72;
  const data = presetFromPrst(encodePrst([block('CAB', 'SUP Star', null, [
    { name: 'Volume', value: 100 }, { name: 'Low Cut', value: 19 }, { name: 'High Cut', value: 20001 },
  ])], 'Cab mapping'), 39);
  assert.deepEqual(data.slice(at + 8, at + 12), captured.slice(at + 8, at + 12));
  for (const id of [1, 5, 6]) {
    assert.deepEqual(data.slice(at + 12 + id * 4, at + 16 + id * 4), captured.slice(at + 12 + id * 4, at + 16 + id * 4));
  }
});

test('Given an unresolved model or invalid knob, when building a preset, then it fails before writing', () => {
  for (const blocks of [[], [block('AMP', 'SnapTone', null)], [block('AMP', 'missing', null)],
    [block('RVB', 'Room', null, [{ name: 'Mix', value: NaN }])],
    [block('RVB', 'Room', null, [{ name: 'Mix', value: 101 }])],
    [block('RVB', 'Room', null), block('RVB', 'Room', null)]]) {
    assert.throws(() => encodePrst(blocks, 'Invalid'));
  }
});

test('Given a song level, when exporting, then the final volume block carries its full range and all other effects stay identical', () => {
  const amp = block('AMP', 'SnapTone', 3, [{ name: 'Gain', value: 42 }]);
  const original = presetFromPrst(encodePrst([amp], 'Level'), 228);
  for (const value of [0, 72, 100]) {
    const data = presetFromPrst(encodePrst([amp, block('VOL', 'Volume', null, [{ name: 'Volume', value }])], 'Level'), 228);
    assert.deepEqual(data.slice(120, 840), original.slice(120, 840));
    assert.deepEqual([...data.slice(108, 119)], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.equal(data[845], 1);
    assert.equal(new DataView(data.buffer).getFloat32(852, true), value);
  }
});

test('Given EV 51, when setting Presence, then the captured hidden baseline remains separate', () => {
  const bytes = encodePrst([block('AMP', 'EV 51', null, [{ name: 'Presence', value: 63 }])], 'EV test');
  const view = new DataView(bytes.buffer);
  assert.equal(view.getFloat32(160 + 3 * 72 + 12 + 5 * 4, true), 50);
  assert.equal(view.getFloat32(160 + 3 * 72 + 12 + 6 * 4, true), 63);
});

test('Given an existing backup, when sending again, then only the latest previous preset survives reload', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const first = retainTransferBackup(original, storage);
  const second = retainTransferBackup(original, storage);
  const backups = loadTransferBackups(storage);
  assert.equal(backups.length, 1);
  assert.equal(backups[0].id, second.id);
  assert.notEqual(backups[0].id, first.id);
  assert.deepEqual(presetFromPrst(Uint8Array.from(backups[0].bytes), 228), original);
  assert.equal(JSON.parse([...values.values()][0]).length, 1);
});

test('Given a backup history from an older version, when loaded, then only its newest backup is retained', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const first = retainTransferBackup(original, storage);
  const second = retainTransferBackup(original, storage);
  const key = [...values.keys()][0];
  values.set(key, JSON.stringify([second, first]));
  assert.deepEqual(loadTransferBackups(storage), [second]);
  assert.deepEqual(JSON.parse(values.get(key)), [second]);
});

test('Given full or ineffective storage, when retaining the original, then the transfer must abort', () => {
  for (const setItem of [() => { throw new Error('Quota exceeded'); }, () => {}]) {
    assert.throws(() => retainTransferBackup(original, { getItem: () => null, setItem }), /Nothing was written/);
  }
});
