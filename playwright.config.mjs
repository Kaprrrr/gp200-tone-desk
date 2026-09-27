import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 30000,
  workers: 1,
  use: { channel: 'msedge', headless: true, viewport: { width: 1280, height: 1000 } },
});
