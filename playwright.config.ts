import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Live-backend specs hit the local fch-backend-api dev server directly,
  // which isn't built for concurrency; running multiple spec files in
  // parallel workers starves individual requests and produces flaky
  // timeouts (confirmed in the sibling fch-borrower-react repo).
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4174',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4174',
    reuseExistingServer: !process.env.CI,
  },
})
