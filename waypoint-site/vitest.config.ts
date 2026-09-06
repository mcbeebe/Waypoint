import { defineConfig } from 'vitest/config';

// Pure-module tests only (deeming math, deep-link builder). Component/E2E
// coverage arrives with the CI-hardening tranche (axe, Lighthouse budgets).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
