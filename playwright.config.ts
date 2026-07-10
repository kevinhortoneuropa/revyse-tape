import { defineConfig, devices } from '@playwright/test'

const APP_PORT = 3210
const MOCK_PORT = 4010
const BASE_URL = `http://localhost:${String(APP_PORT)}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 0,
  // Serial in CI: the app server holds a process-wide TTL cache, and parallel
  // workers racing the mock upstream make price assertions non-deterministic.
  workers: process.env['CI'] ? 1 : 4,
  reporter: process.env['CI'] ? [['html'], ['github']] : [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // The brief asks for a responsive layout, and drag-and-drop on touch is the
    // requirement native HTML5 DnD would have silently failed.
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    // Not decoration. WebKit is the only engine that rejects a `Secure` cookie
    // set over http://localhost, and adding this project immediately failed
    // three theme tests that had always passed in Chromium. It also exposed a
    // filter/re-render race the other engines happened to win.
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  webServer: [
    {
      command: 'node e2e/mock-coinbase.mjs',
      port: MOCK_PORT,
      reuseExistingServer: !process.env['CI'],
      stdout: 'ignore',
    },
    {
      // Tests run against the production build, not the dev server: SSR output,
      // hydration and bundling all differ, and those are what we are asserting on.
      command: 'npm run build && npx remix-serve ./build/server/index.js',
      port: APP_PORT,
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
      env: {
        PORT: String(APP_PORT),
        COINBASE_BASE_URL: `http://localhost:${String(MOCK_PORT)}`,
        // Defeat the TTL cache so each test observes its own fetch.
        COINBASE_CACHE_TTL_MS: '0',
      },
    },
  ],
})
