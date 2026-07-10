import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./tests/setup/testEnv.ts'],
    include: ['tests/**/*.test.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
    pool: 'forks',
    // Integration tests share a single Postgres test database and truncate it
    // between tests, so test files must not run in parallel against it.
    fileParallelism: false,
  },
});
