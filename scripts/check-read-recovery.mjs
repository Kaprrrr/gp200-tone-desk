// Read-only hardware regression: drop two requests, then reopen actual Web MIDI ports.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { build } from 'vite';
import { presetDifferences, validatePreset } from '../src/midi/protocol.ts';

const processes = execFileSync('tasklist', ['/FI', 'IMAGENAME eq GP-200.exe', '/FO', 'CSV', '/NH'], { encoding: 'utf8', windowsHide: true });
if (processes.toLowerCase().includes('"gp-200.exe"')) throw new Error('Close the official editor first.');
const bundle = await build({ configFile: false, logLevel: 'error', build: {
  write: false, lib: { entry: resolve('src/midi/gp200.ts'), name: 'ToneDeskMidi', formats: ['iife'] },
} });
const code = (Array.isArray(bundle) ? bundle[0] : bundle).output.find((item) => item.type === 'chunk').code;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const context = await browser.newContext({ permissions: ['midi', 'midi-sysex'] });
  const page = await context.newPage();
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await page.addScriptTag({ content: code });
  const result = await page.evaluate(async () => {
    const request = navigator.requestMIDIAccess.bind(navigator);
    let dropsLeft = 0;
    let dropped = 0;
    let portOpens = 0;
    const messages = [];
    navigator.requestMIDIAccess = async (options) => {
      const access = await request(options);
      for (const input of access.inputs.values()) {
        if (!input.name?.includes('GP-200')) continue;
        const open = input.open.bind(input);
        input.open = () => { portOpens++; return open(); };
      }
      for (const output of access.outputs.values()) {
        if (!output.name?.includes('GP-200')) continue;
        const send = output.send.bind(output);
        output.send = (bytes, timestamp) => {
          if (bytes[8] !== 0x11) throw new Error('Read-only test blocked a non-query command.');
          const total = bytes[9] | bytes[10] << 7;
          const drop = total === 16 && dropsLeft > 0;
          messages.push({ time: Date.now(), dropped: drop, bytes: [...bytes] });
          if (drop) { dropsLeft--; dropped++; return; }
          send(bytes, timestamp);
        };
      }
      return access;
    };
    const pedal = await ToneDeskMidi.GP200.connect();
    try {
      const before = [...await pedal.readPreset(231)];
      dropsLeft = 2;
      const recovered = [...await pedal.readPreset(231)];
      const after = [...await pedal.readPreset(231)];
      return { before, recovered, after, dropped, portOpens, messages };
    } finally { await pedal.close(); }
  });
  writeFileSync('data/read-recovery-hardware.json', JSON.stringify(result, null, 2) + '\n');
  assert.equal(result.dropped, 2);
  assert.equal(result.portOpens, 2);
  for (const bytes of [result.before, result.recovered, result.after]) validatePreset(Uint8Array.from(bytes), 231);
  assert.deepEqual(presetDifferences(Uint8Array.from(result.before), Uint8Array.from(result.recovered)), []);
  assert.deepEqual(presetDifferences(Uint8Array.from(result.before), Uint8Array.from(result.after)), []);
  assert.ok(result.messages.every((m) => m.bytes[8] === 0x11));
  console.log('PASS: 58-D read before and after two dropped requests; real Web MIDI ports reopened; preset unchanged; no writes or preset selections.');
} finally { await browser.close(); }
