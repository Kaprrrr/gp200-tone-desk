// Run the actual single-file UI against hardware, restricted to approved slot 58-A.
import { chromium, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import catalog from '../shared/catalog.json' with { type: 'json' };

if (!process.argv.includes('--write-and-restore-58-a')) throw new Error('Explicit --write-and-restore-58-a is required.');
const processes = execFileSync('tasklist', ['/FI', 'IMAGENAME eq GP-200.exe', '/FO', 'CSV', '/NH'], { encoding: 'utf8', windowsHide: true });
if (processes.toLowerCase().includes('"gp-200.exe"')) throw new Error('Close the official editor first.');
const entry = catalog.modules.AMP.find((e) => e.snaptoneSlot === undefined);
const block = (module, model, params) => ({ module, model, params, snaptoneSlot: null, enabled: true, note: '' });
const song = {
  id: 'hardware-ui-test', title: 'TD Browser Test', artist: '', part: '', tuning: 'E standard', guitar: '', presetSlot: '58-A',
  blocks: [block('AMP', entry.name, [{ name: entry.params[0].name, value: 42 }]),
    block('RVB', 'Room', [{ name: 'Mix', value: 23 }])],
  summary: '', playingTips: '', notes: '', source: 'manual', createdAt: '', updatedAt: '',
};
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ permissions: ['midi', 'midi-sysex'], viewport: { width: 1280, height: 1100 } });
const page = await context.newPage();
let attempted = false;
let restored = false;
await page.exposeFunction('retainMidiEvidence', (event) => appendFileSync('data/browser-hardware.jsonl', JSON.stringify(event) + '\n'));
await page.addInitScript((song) => {
  localStorage.setItem('gp200-tone-desk:db', JSON.stringify({ version: 1, songs: [song], snaptones: [], irs: [] }));
  const access = navigator.requestMIDIAccess.bind(navigator);
  navigator.requestMIDIAccess = async (options) => {
    const midi = await access(options);
    for (const input of midi.inputs.values()) input.addEventListener('midimessage', (e) => window.retainMidiEvidence({ t: Date.now(), dir: 'in', bytes: [...e.data] }));
    for (const output of midi.outputs.values()) {
      const send = output.send.bind(output);
      output.send = (bytes, timestamp) => {
        window.retainMidiEvidence({ t: Date.now(), dir: 'out', bytes: [...bytes] });
        send(bytes, timestamp);
      };
    }
    return midi;
  };
}, song);
page.on('dialog', async (dialog) => {
  if (dialog.type() === 'confirm' && dialog.message().startsWith('Replace the saved preset at 58-A ')) await dialog.accept();
  else await dialog.dismiss();
});
page.on('pageerror', (error) => console.error('PAGE ERROR:', error.message));
try {
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await page.getByRole('combobox', { name: 'My songs', exact: false }).selectOption(song.id);
  await page.getByRole('button', { name: 'Connect pedal', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Send to 58-A', exact: true })).toBeEnabled({ timeout: 60000 });
  console.log('Browser connected and finished reading capture slots.');
  attempted = true;
  await page.getByRole('button', { name: 'Send to 58-A', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved and verified 58-A', { timeout: 20000 });
  console.log('PASS: actual browser Send button saved and verified the generated song patch.');
  await page.screenshot({ path: 'data/browser-hardware-saved.png', fullPage: true });
} finally {
  try {
    if (attempted) {
      const backups = await page.evaluate(() => JSON.parse(localStorage.getItem('gp200-tone-desk:pedal-backups') ?? '[]'));
      const original = backups.at(-1);
      if (original) {
        writeFileSync('data/browser-58-A-original.prst', Uint8Array.from(original.bytes));
        await page.getByText('Undo last send', { exact: true }).click();
        const row = page.locator('.backup-row').last();
        await row.getByRole('button', { name: 'Restore 58-A', exact: true }).click();
        await expect(page.getByRole('status')).toContainText('Restored and verified 58-A', { timeout: 20000 });
        restored = true;
        console.log('PASS: actual browser Restore button restored and verified original 58-A.');
        await page.screenshot({ path: 'data/browser-hardware-restored.png', fullPage: true });
      }
    }
    await page.getByRole('tab', { name: 'Pedal', exact: true }).click();
    const disconnect = page.getByRole('button', { name: 'Disconnect', exact: true });
    if (await disconnect.count()) await disconnect.click();
    console.log(`Browser hardware check complete. Restore verified: ${restored}`);
  } finally {
    await browser.close();
  }
}
