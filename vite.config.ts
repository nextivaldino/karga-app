import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import renderer from 'vite-plugin-electron-renderer';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['better-sqlite3', 'bcryptjs', 'ws', 'bufferutil', 'utf-8-validate'],
            },
          },
        },
      },
      preload: {
        input: 'electron/main/preload.ts',
        vite: {
          build: {
            outDir: 'dist-electron/main',
          },
        },
      },
      renderer: {},
    }),
    renderer(),
  ],
});
