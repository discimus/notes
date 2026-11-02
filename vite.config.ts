import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: '.',
  base: './',
  resolve: {
    alias: {
      '@domain': resolve(rootDir, 'src/domain'),
      '@application': resolve(rootDir, 'src/application'),
      '@infrastructure': resolve(rootDir, 'src/infrastructure'),
      '@presentation': resolve(rootDir, 'src/presentation'),
      '@shared': resolve(rootDir, 'src/shared'),
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
  },
});
