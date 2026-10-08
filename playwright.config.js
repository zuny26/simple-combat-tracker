// playwright.config.js — the browser-fidelity + layout suite. Runs separately from
// `npm test` (node:test, jsdom) on purpose: real layout, real paint, real event
// dispatch are the things jsdom cannot give you, and everything else stays in the
// faster suite.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // MANDATORY. Playwright's default testDir is this file's own directory, which would
  // sweep up test/*.test.js — those are node:test files and would fail here.
  testDir: './e2e',
  fullyParallel: true,
  retries: 0, // a flaky test is a bug in the test, not something to paper over
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:8934/simple-combat-tracker/',
    // Artifacts for diagnosis, never assertions: there are no pixel baselines here.
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    // check:all builds first; acceptance always exercises that generated artifact.
    command: 'npm run preview',
    url: 'http://127.0.0.1:8934/simple-combat-tracker/',
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
