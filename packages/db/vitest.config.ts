import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    // Each test file spawns its own PGlite WASM Postgres. Running these in
    // parallel inside a single worker can deadlock the WASM heap, so we force
    // a single fork per file and let Vitest serialize them.
    // PGlite WASM doesn't share well across test files inside one Vitest
    // worker — fresh fork per file avoids the WASM heap getting wedged.
    pool: 'forks',
    poolOptions: {
      forks: { isolate: true },
    },
    testTimeout: 30_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/index.ts', 'src/migrate/run.ts', 'src/seed/run.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
