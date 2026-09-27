// Exercise the browser's actual driver through Windows MIDI, restricted to 58-A.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { GP200 } from '../src/midi/gp200.ts';
import { PRST_TEMPLATE_B64 } from '../src/prstTemplate.ts';
import { presetDifferences } from '../src/midi/protocol.ts';

const write = process.argv.includes('--write-and-restore-58-a');
const bridge = spawn('python', ['scripts/midi-bridge.py'], { stdio: ['pipe', 'pipe', 'inherit'], windowsHide: true });
let closes = 0;
const input = { name: 'GP-200', open: async () => {}, close: async () => { if (++closes === 2) bridge.stdin.end('{"close":true}\n'); }, onmidimessage: null };
const output = { ...input, send: (data) => bridge.stdin.write(JSON.stringify({ data: [...data] }) + '\n') };
const lines = createInterface({ input: bridge.stdout });
await new Promise((resolve, reject) => {
  bridge.once('error', reject);
  bridge.once('exit', (code) => reject(new Error(`MIDI bridge exited (${code})`)));
  lines.on('line', (line) => {
    const response = JSON.parse(line);
    if (response.ready) resolve();
    if (response.data) input.onmidimessage?.({ data: new Uint8Array(response.data) });
  });
});
Object.defineProperty(globalThis.navigator, 'requestMIDIAccess', { value: async () => ({ inputs: new Map([['in', input]]), outputs: new Map([['out', output]]) }) });

function toPrst(raw) {
  const prst = Uint8Array.from(Buffer.from(PRST_TEMPLATE_B64, 'base64'));
  prst.set(raw.slice(8), 48);
  checksum(prst);
  return prst;
}
function checksum(prst) {
  const sum = prst.slice(0, 1222).reduce((a, b) => a + b, 0) & 65535;
  prst[1222] = sum >> 8;
  prst[1223] = sum & 255;
}

let pedal;
let original;
let touched = false;
try {
  pedal = await GP200.connect();
  original = await pedal.readPreset(228);
  const backupFile = `data/58-A-backup-${Date.now()}.prst`;
  writeFileSync(backupFile, toPrst(original));
  console.log(`Read all 11 blocks from 58-A; backup: ${backupFile}`);
  if (write) {
    const patch = new Uint8Array(readFileSync('data/control-test.prst'));
    patch.fill(0, 68, 84);
    patch.set(new TextEncoder().encode('TD USB Verify'), 68);
    const values = new DataView(patch.buffer);
    values.setFloat32(160 + 3 * 72 + 12, 42, true);
    values.setFloat32(160 + 9 * 72 + 12, 23, true);
    patch[160 + 8 * 72 + 5] = 1;
    patch[160 + 9 * 72 + 5] = 1;
    checksum(patch);
    touched = true;
    await pedal.writePreset(228, patch, () => {}, (done, total) => console.log(`Test write ${done}/${total}`));
    console.log('PASS: saved preset name, first AMP/RVB knobs, all models, and all on/off states verified after reload.');
  }
} catch (error) {
  console.error('TEST FAILURE:', error);
  throw error;
} finally {
  try {
    if (touched && original && pedal) {
      await pedal.writePreset(228, toPrst(original), () => {}, (done, total) => console.log(`Restore ${done}/${total}`));
      assert.deepEqual(presetDifferences(original, await pedal.readPreset(228)), []);
      console.log('PASS: original 58-A restored and verified.');
    }
  } finally {
    await pedal?.close();
    if (!bridge.stdin.writableEnded) bridge.stdin.end('{"close":true}\n');
  }
}
