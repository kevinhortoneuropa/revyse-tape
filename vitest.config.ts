import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['app/**/*.test.{ts,tsx}'],
    // Playwright owns e2e/. Vitest must not try to run those specs.
    exclude: ['e2e/**', 'node_modules/**', 'build/**'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['app/**/*.{ts,tsx}'],
      exclude: [
        'app/**/*.test.{ts,tsx}',
        'app/entry.client.tsx',
        'app/entry.server.tsx',
        'app/root.tsx',
        'app/**/*.d.ts',
      ],
      thresholds: {
        // The pure core carries the logic that can silently be wrong, so it is
        // held to a higher standard than the render layer.
        'app/lib/**': { statements: 100, branches: 100, functions: 100, lines: 100 },
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
})
