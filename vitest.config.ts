import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';

// Minimal Vitest setup — resolves the app's `~/` path alias so unit tests can
// import the shared data modules. Node environment (no DOM) keeps it fast.
export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['app/**/*.test.ts'],
  },
});
