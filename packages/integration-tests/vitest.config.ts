import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 300000, // 5 minutes for blockchain transactions (Stokenet can be slow)
    hookTimeout: 120000, // 2 minutes for setup/teardown
    include: ['src/**/*.test.ts'],
    reporters: ['verbose'],
    sequence: {
      shuffle: false
    }
  }
});
