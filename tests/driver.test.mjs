import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { GP200 } from '../src/midi/gp200.ts';
import { Assembly, frame, unframe } from '../src/midi/protocol.ts';
import { PRST_TEMPLATE_B64 } from '../src/prstTemplate.ts';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/preset-58-A.json', import.meta.url), 'utf8'));
const chunks = fixture.map((s) => Uint8Array.from(s.split(' ').map((b) => parseInt(b, 16))));
const prst = Uint8Array.from(Buffer.from(PRST_TEMPLATE_B64, 'base64'));

function device({ ignoreWrites = false, wrongSlot = false, stall = '' } = {}) {
  let reopened = false;
  const input = { onmidimessage: null, open: async () => { reopened = true; }, close: async () => {} };
  const initial = new Assembly(1176);
  let stored;
  for (const c of chunks) stored = initial.add(c) ?? stored;
  if (wrongSlot) stored[6] = 0;
  let write = new Assembly(1184);
  const sent = [];
  const receive = (data) => input.onmidimessage({ data });
  let reads = 0;
  const output = { open: async () => {}, close: async () => {}, send(message) {
    const msg = new Uint8Array(message);
    sent.push(msg);
    const part = unframe(msg);
    if (!part) return;
    if (part.command === 0x11 && part.total === 4 && part.data[0] === 1) frame(Uint8Array.of(1, 32, 4, 0, 1, 0, 2, 0)).forEach(receive);
    if (part.command === 0x11 && part.total === 4 && part.data[0] === 6) {
      const state = new Uint8Array(846); state[8] = 228;
      frame(state, 0x12, 185).forEach(receive);
    }
    if (part.command === 0x11 && part.total === 10) frame(new Uint8Array(10)).forEach(receive);
    if (part.command === 0x11 && part.total === 16) {
      reads++;
      const stalled = stall === 'always' || (!reopened && (stall === 'backup' || (stall === 'verify' && reads > 1)));
      const reply = frame(stored, 0x12, 185);
      (stalled ? reply.slice(0, 2) : reply).forEach(receive);
    }
    if (part.command === 0x12 && part.total === 1184 && !ignoreWrites) {
      const full = write.add(msg);
      if (full) {
        stored = new Uint8Array([...full.slice(0, 8), ...full.slice(16)]);
        write = new Assembly(1184);
      }
    }
    if (part.command === 0x12 && part.total === 8 && part.data[0] === 0x08) receive(msg);
  } };
  return { pedal: new GP200(input, output), sent };
}

test('Given a responsive pedal, when writing 58-A, then backup precedes writes and success follows a full readback', async () => {
  const { pedal, sent } = device();
  let backedUp = false;
  const progress = [];
  await pedal.writePreset(228, prst, (data) => {
    assert.equal(data.length, 1176);
    assert.ok(sent.every((m) => m[8] === 0x11));
    backedUp = true;
  }, (done, total) => progress.push([done, total]));
  assert.equal(backedUp, true);
  assert.deepEqual(progress.at(-1), [9, 9]);
  assert.equal(sent.filter((m) => unframe(m)?.total === 1184).length, 7);
  assert.equal(sent.at(-1)[8], 0x11);
});

test('Given partial backup reads, when the session reopens, then a complete backup still precedes the only write', async () => {
  const { pedal, sent } = device({ stall: 'backup' });
  let recoveries = 0;
  await pedal.writePreset(228, prst, (data) => {
    assert.equal(data.length, 1176);
    assert.ok(sent.every((m) => m[8] === 0x11));
  }, undefined, () => recoveries++);
  assert.equal(recoveries, 1);
  assert.equal(sent.filter((m) => unframe(m)?.total === 1184).length, 7);
});

test('Given stalled verification reads, when recovering, then the driver retries reads without rewriting the preset', async () => {
  const { pedal, sent } = device({ stall: 'verify' });
  let recoveries = 0;
  await pedal.writePreset(228, prst, () => {}, undefined, () => recoveries++);
  assert.equal(recoveries, 1);
  assert.equal(sent.filter((m) => unframe(m)?.total === 1184).length, 7);
  assert.equal(sent.filter((m) => unframe(m)?.total === 16).length, 4);
});

test('Given permanently incomplete reads, when recovery fails, then no preset is backed up or written', async () => {
  const { pedal, sent } = device({ stall: 'always' });
  await assert.rejects(pedal.writePreset(228, prst, () => assert.fail('Incomplete backup')), /No preset was written.*370\/1176 bytes/);
  assert.ok(sent.every((m) => m[8] === 0x11));
  await pedal.close();
});

test('Given ignored write messages, when sending a preset, then the driver reports failure instead of success', async () => {
  const { pedal } = device({ ignoreWrites: true });
  await assert.rejects(pedal.writePreset(228, prst, () => {}), /Transfer was not verified/);
});

test('Given a failed backup or wrong destination reply, when sending, then no write reaches the pedal', async () => {
  for (const wrongSlot of [false, true]) {
    const { pedal, sent } = device({ wrongSlot });
    await assert.rejects(pedal.writePreset(228, prst, () => { throw new Error('Storage full'); }), /Storage full|different slot/);
    assert.ok(sent.every((m) => m[8] === 0x11));
  }
});

test('Given a transfer in progress, when another command starts, then it cannot interleave with the transfer', async () => {
  const { pedal } = device();
  const write = pedal.writePreset(228, prst, () => {});
  await assert.rejects(pedal.selectPreset(0), /busy/);
  await assert.rejects(pedal.readSlots(), /busy/);
  await assert.rejects(pedal.close(), /finish/);
  await write;
});
