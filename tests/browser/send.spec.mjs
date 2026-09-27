import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const captured = JSON.parse(readFileSync(new URL('../fixtures/preset-58-A.json', import.meta.url)))
  .map((hex) => hex.split(' ').map((b) => parseInt(b, 16)));
const reportedBlocks = JSON.parse(readFileSync(new URL('../fixtures/beautiful-strange-blocks.json', import.meta.url), 'utf8'));
const block = (module, model, snaptoneSlot, params) => ({ module, model, snaptoneSlot, params, enabled: true, note: '' });
export const song = {
  id: 'transfer-test', title: 'TD Song Verify', artist: '', part: '', tuning: 'E standard', guitar: '', presetSlot: '58-A',
  blocks: [block('AMP', 'SnapTone', 0, [{ name: 'Gain', value: 42 }]), block('RVB', 'Room', null, [{ name: 'Mix', value: 23 }])],
  summary: '', playingTips: '', notes: '', source: 'manual', createdAt: '', updatedAt: '',
};

async function openApp(page, options = {}) {
  await page.addInitScript(({ captured, song, options }) => {
    if (!localStorage.getItem('gp200-tone-desk:db')) {
      const songs = options.secondSong ? [song, { ...song, id: 'reference', title: 'Reference tone' }] : [song];
      localStorage.setItem('gp200-tone-desk:db', JSON.stringify({ version: 1, songs, snaptones: [], irs: [] }));
    }
    const hdr = [240, 33, 37, 126, 71, 80, 45, 50];
    const decode = (m) => Array.from({ length: (m.length - 14) / 2 }, (_, i) => m[13 + 2 * i] * 16 + m[14 + 2 * i]);
    const frame = (data, offset = 0, total = data.length) => new Uint8Array([...hdr, 18, total & 127, total >> 7, offset & 127, offset >> 7, ...data.flatMap((b) => [b >> 4, b & 15]), 247]);
    let stored = captured.flatMap(decode);
    Object.defineProperty(window, 'mockStoredPreset', { get: () => stored });
    let pending = new Array(1184);
    window.mockWrites = 0;
    window.mockIgnoreWrites = options.ignoreWrites;
    window.mockStallReads = false;
    window.mockPortOpens = 0;
    const input = { name: 'GP-200', open: async () => { window.mockPortOpens++; window.mockStallReads = false; }, close: async () => {}, onmidimessage: null };
    const receive = (msg) => input.onmidimessage?.({ data: msg });
    const output = { name: 'GP-200', open: async () => {}, close: async () => {}, send(bytes) {
      const m = [...bytes], d = decode(m), total = m[9] | m[10] << 7, offset = m[11] | m[12] << 7;
      if (m[8] === 17 && total === 4 && d[0] === 1) receive(frame([1, 32, 4, 0, 1, 0, 2, 0]));
      else if (m[8] === 17 && total === 4 && d[0] === 6) {
        for (let i = 0; i < 5; i++) receive(frame(i ? new Array(12).fill(0) : [7, 16, 8, 0, 0, 0, 0, 0, 228, 0, 0, 0], i * 12, 846));
      } else if (m[8] === 17 && total === 10) receive(frame(new Array(10).fill(0)));
      else if (m[8] === 17 && total === 16) {
        if (window.mockStallReads) return;
        for (let i = 0; i < stored.length; i += 185) receive(frame(stored.slice(i, i + 185), i, stored.length));
      } else if (m[8] === 17 && total === 28) {
        const response = new Uint8Array(70);
        response.set(hdr); response[8] = 18; response[9] = 28; response[14] = m[14];
        response[21] = m[21]; response[22] = m[22]; response[26] = 1;
        response[69] = 247; receive(response);
      } else if (m[8] === 18 && total === 1184) {
        window.mockWrites++;
        for (let i = 0; i < d.length; i++) pending[offset + i] = d[i];
        if (offset + d.length === 1184 && !window.mockIgnoreWrites) stored = [...pending.slice(0, 8), ...pending.slice(16)];
      } else if (m[8] === 18 && total === 8 && d[0] === 8) receive(bytes);
    } };
    Object.defineProperty(navigator, 'requestMIDIAccess', { value: async () => ({ inputs: new Map([['in', input]]), outputs: new Map([['out', output]]) }) });
    if (options.storageFull) {
      const save = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { if (key.endsWith('pedal-backups')) throw new Error('Quota exceeded'); return save.call(this, key, value); };
    }
  }, { captured, song: { ...song, blocks: options.blocks ?? song.blocks }, options });
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await page.getByRole('combobox', { name: 'My songs', exact: false }).selectOption(song.id);
  await page.getByRole('button', { name: 'Connect pedal', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Send to 58-A', exact: true })).toBeEnabled({ timeout: 15000 });
}

test('Given a connected pedal, when Send is cancelled, then no preset write occurs', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('.brand-icon')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /^data:image\/png;base64,/);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Send to 58-A', exact: true }).click();
  expect(await page.evaluate(() => window.mockWrites)).toBe(0);
});

test('Given a song, when sent and restored, then both operations verify and the backup survives reload', async ({ page }) => {
  await openApp(page);
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Send to 58-A', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Pedal', exact: true })).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('Saved and verified 58-A', { timeout: 15000 });
  await expect(page.locator('details').filter({ has: page.locator('summary', { hasText: 'Undo last send' }) })).not.toHaveAttribute('open');
  await page.getByText('Undo last send', { exact: true }).click();
  await expect(page.getByText('58-A: test', { exact: true })).toBeVisible();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup', exact: true }).click();
  const download = await downloadEvent;
  expect(readFileSync(await download.path()).length).toBe(1224);
  await page.getByRole('button', { name: 'Restore 58-A', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Restored and verified 58-A: test', { timeout: 15000 });
  await page.reload();
  await page.getByRole('combobox', { name: 'My songs', exact: false }).selectOption(song.id);
  await page.getByText('Undo last send', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Download backup', exact: true })).toHaveCount(1);
  await expect(page.getByText('58-A: test', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gp200-tone-desk:pedal-backups')).length)).toBe(1);
  await page.screenshot({ path: 'data/send-browser-review.png', fullPage: true });
});

test('Given a pedal that ignores writes, when sending, then failure retains the original backup', async ({ page }) => {
  await openApp(page, { ignoreWrites: true });
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Send to 58-A', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Transfer was not verified', { timeout: 15000 });
  await page.getByText('Undo last send', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restore 58-A', exact: true })).toBeEnabled();
  await expect(page.getByText('Saved and verified', { exact: false })).toHaveCount(0);
});

test('Given full browser storage, when sending, then no preset write occurs', async ({ page }) => {
  await openApp(page, { storageFull: true });
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Send to 58-A', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Nothing was written');
  expect(await page.evaluate(() => window.mockWrites)).toBe(0);
});

test('Given the reported noisy song, when sending from the browser, then the pedal receives correct feedback and cab parameter IDs', async ({ page }) => {
  await openApp(page, { blocks: reportedBlocks });
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Send to 58-A', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved and verified 58-A', { timeout: 15000 });
  const bytes = Buffer.from(await page.evaluate(() => window.mockStoredPreset));
  const values = (block) => Array.from({ length: 15 }, (_, id) => bytes.readFloatLE(120 + block * 72 + 12 + id * 4));
  expect(values(8).slice(0, 9)).toEqual([22, 30, 643, 18, 25, 857, 0, 0, 0]);
  expect(values(5)[1]).toBe(50);
  expect(values(5)[5]).toBe(80);
  expect(values(5)[6]).toBe(7500);
});

test('Given unsupported tempo sync, when sending, then the UI rejects it before writing', async ({ page }) => {
  await openApp(page, { blocks: [block('DLY', 'Dual Echo', null, [{ name: 'Sync A', value: 1 }, { name: 'Time A', value: 643 }])] });
  await page.getByRole('button', { name: 'Send to 58-A', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('set Sync A to OFF');
  expect(await page.evaluate(() => window.mockWrites)).toBe(0);
});

test('Given a fractional modulation rate, when editing it, then the slider and saved song keep tenths', async ({ page }) => {
  await openApp(page, { blocks: [block('MOD', 'G-Chorus', null, [{ name: 'Rate', value: 0.5 }])] });
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const rate = page.getByRole('slider', { name: /^Rate/ });
  await expect(rate).toHaveAttribute('step', '0.1');
  await expect(rate).toHaveValue('0.5');
  await rate.fill('0.7');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gp200-tone-desk:db')).songs[0]);
  expect(saved.blocks[0].params.find((p) => p.name === 'Rate').value).toBe(0.7);
});

test('Given two songs, when balancing one output level, then it persists independently and sends without changing amp gain', async ({ page }) => {
  await openApp(page, { secondSong: true });
  const level = page.getByRole('slider', { name: 'Song output level', exact: false });
  await expect(level).toHaveValue('100');
  await level.fill('72');
  await expect(page.getByRole('status')).toContainText('Send to pedal to apply');
  expect(await page.evaluate(() => window.mockWrites)).toBe(0);
  const picker = page.getByRole('combobox', { name: 'My songs', exact: false });
  await picker.selectOption('reference');
  await expect(level).toHaveValue('100');
  await picker.selectOption(song.id);
  await expect(level).toHaveValue('72');
  await page.reload();
  await picker.selectOption(song.id);
  await expect(level).toHaveValue('72');
  await page.getByRole('button', { name: 'Connect pedal', exact: true }).click();
  const send = page.getByRole('button', { name: 'Send to 58-A', exact: true });
  await expect(send).toBeEnabled({ timeout: 15000 });
  page.on('dialog', (dialog) => dialog.accept());
  await send.click();
  await expect(level).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('Saved and verified 58-A', { timeout: 15000 });
  const stored = await page.evaluate(() => window.mockStoredPreset);
  const bytes = Buffer.from(stored);
  expect(bytes[120 + 10 * 72 + 5]).toBe(1);
  expect(bytes.readFloatLE(120 + 10 * 72 + 12)).toBe(72);
  expect(bytes.readFloatLE(120 + 3 * 72 + 12)).toBe(42);
  await page.screenshot({ path: 'data/song-output-level-review.png', fullPage: true });
});

test('Given successful sends followed by stalled reads, when sending again, then automatic and manual reconnect preserve the song', async ({ page }) => {
  test.setTimeout(60000);
  await openApp(page);
  page.on('dialog', (dialog) => dialog.accept());
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Send to 58-A', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Saved and verified 58-A', { timeout: 15000 });
  }
  await page.evaluate(() => { window.mockStallReads = true; });
  await page.getByRole('button', { name: 'Send to 58-A', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Reconnecting and retrying', { timeout: 10000 });
  await expect(page.getByRole('status')).toContainText('Saved and verified 58-A', { timeout: 15000 });
  expect(await page.evaluate(() => window.mockWrites)).toBe(21);
  expect(await page.evaluate(() => window.mockPortOpens)).toBe(2);
  const backups = await page.evaluate(() => localStorage.getItem('gp200-tone-desk:pedal-backups'));
  await page.getByRole('button', { name: 'Reconnect pedal', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Send to 58-A', exact: true })).toBeEnabled({ timeout: 15000 });
  expect(await page.evaluate(() => window.mockPortOpens)).toBe(3);
  expect(await page.evaluate(() => localStorage.getItem('gp200-tone-desk:pedal-backups'))).toBe(backups);
  await expect(page.getByRole('combobox', { name: 'My songs', exact: false })).toHaveValue(song.id);
});

test('Given a failed restore, when retrying, then the same previous preset remains available', async ({ page }) => {
  await openApp(page);
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Send to 58-A', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved and verified 58-A', { timeout: 15000 });
  const backupBefore = await page.evaluate(() => localStorage.getItem('gp200-tone-desk:pedal-backups'));
  await page.evaluate(() => { window.mockIgnoreWrites = true; });
  await page.getByText('Undo last send', { exact: true }).click();
  await page.getByRole('button', { name: 'Restore 58-A', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Transfer was not verified', { timeout: 15000 });
  expect(await page.evaluate(() => localStorage.getItem('gp200-tone-desk:pedal-backups'))).toBe(backupBefore);
  await page.evaluate(() => { window.mockIgnoreWrites = false; });
  await page.getByRole('button', { name: 'Restore 58-A', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Restored and verified 58-A: test', { timeout: 15000 });
  expect(await page.evaluate(() => localStorage.getItem('gp200-tone-desk:pedal-backups'))).toBe(backupBefore);
});
