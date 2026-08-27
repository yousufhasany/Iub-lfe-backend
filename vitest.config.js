import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30000,
    setupFiles: ['./tests/setup.js'],
    hookTimeout: 60000,
  },
});
