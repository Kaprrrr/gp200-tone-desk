import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The release is one self-contained HTML file (JS, CSS and the GP-200
// catalog inlined) so people can unzip it and double-click it - no server.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1', port: 5200 },
});
