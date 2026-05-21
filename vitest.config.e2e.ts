import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/e2e/**/*.e2e.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
