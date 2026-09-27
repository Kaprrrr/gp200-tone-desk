import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Assembly, frame, unframe, validatePreset, presetFromPrst, writePayload, presetDifferences, readRequest } from '../src/midi/protocol.ts';
import { PRST_TEMPLATE_B64 } from '../src/prstTemplate.ts';

const captured = JSON.parse(readFileSync(new URL('./fixtures/preset-58-A.json', import.meta.url), 'utf8'))
  .map((s) => Uint8Array.from(s.split(' ').map((b) => parseInt(b, 16))));
const assemble = (chunks, size = 1176) => {
  const assembly = new Assembly(size);
  let result = null;
  for (const chunk of chunks) result = assembly.add(chunk) ?? result;
  return result;
};

test('Given an official editor import capture, when encoding the same patch, then every transmitted byte matches', () => {
  const imported = JSON.parse(readFileSync(new URL('./fixtures/import-58-A.json', import.meta.url), 'utf8'))
    .map(s => Uint8Array.from(s.split(' ').map(b => parseInt(b, 16))));
  const file = new Uint8Array(readFileSync(new URL('./fixtures/control-test.prst', import.meta.url)));
  assert.deepEqual(frame(writePayload(presetFromPrst(file, 228), 228)), imported);
});

test('Given real 58-A replies, when decoded, then length and offsets use 7-bit words', () => {
  assert.equal(unframe(captured[0]).total, 1176);
  assert.deepEqual(captured.map((m) => unframe(m).offset), [0, 185, 370, 555, 740, 925, 1110]);
  const preset = assemble(captured);
  validatePreset(preset, 228);
  assert.equal(new TextDecoder().decode(preset.slice(28, 32)), 'test');
  assert.equal(preset[840 + 4], 10);
  assert.throws(() => validatePreset(preset, 0), /different slot/);
});

test('Given duplicate and reordered chunks, when assembled, then missing data cannot report success', () => {
  assert.equal(assemble([...captured.slice(0, 6), captured[0]]), null);
  assert.deepEqual(assemble([...captured].reverse()), assemble(captured));
  const broken = captured[0].slice();
  broken[13] ^= 1;
  assert.throws(() => assemble([captured[0], broken]), /Conflicting/);
});

test('Given a full preset, when framed for writing, then all seven chunks contain only MIDI-safe bytes', () => {
  const expected = presetFromPrst(Uint8Array.from(Buffer.from(PRST_TEMPLATE_B64, 'base64')), 228);
  const payload = writePayload(expected, 228);
  const chunks = frame(payload);
  assert.equal(payload.length, 1184);
  assert.equal(chunks.length, 7);
  assert.deepEqual(chunks[0].slice(9, 13), new Uint8Array([0x20, 9, 0, 0]));
  assert.deepEqual(chunks[1].slice(11, 13), new Uint8Array([55, 1]));
  assert.ok(chunks.every((c) => c.slice(1, -1).every((b) => b < 128)));
  assert.deepEqual(assemble(chunks, 1184), payload);
  assert.deepEqual(payload.slice(8, 16), new Uint8Array([1, 0, 4, 0, 228, 0, 228, 0]));
  assert.deepEqual(payload.slice(16), expected.slice(8));
});

test('Given changed first knobs, User IR, bypass and RVB, when verified, then each difference is detected', () => {
  const expected = assemble(captured);
  const actual = expected.slice();
  actual[120 + 3 * 72 + 12] ^= 1;
  actual[120 + 5 * 72 + 10] = 0x10;
  actual[120 + 8 * 72 + 5] ^= 1;
  actual[120 + 9 * 72 + 12] ^= 1;
  assert.deepEqual(presetDifferences(expected, actual), ['AMP knobs', 'CAB model', 'DLY on/off', 'RVB knobs']);
});

test('Given corrupt files or invalid slots, when preparing a transfer, then it fails before writing', () => {
  const prst = Uint8Array.from(Buffer.from(PRST_TEMPLATE_B64, 'base64'));
  prst[68] ^= 1;
  assert.throws(() => presetFromPrst(prst, 228), /checksum/);
  for (const slot of [-1, 256, NaN, 1.5]) assert.throws(() => readRequest(slot), /out of range/);
  for (const slot of [0, 127, 128, 228, 255]) assert.equal(unframe(readRequest(slot)).data[6], slot);
});
