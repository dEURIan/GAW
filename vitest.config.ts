import { defineConfig } from 'vitest/config';

// 100% is the contract. Exclusions are only for code that cannot execute
// (generated files, type-only modules) — each one needs a reason comment.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.d.ts', // type-only
      ],
      reporter: ['text-summary', 'lcov', 'json-summary'],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
});
