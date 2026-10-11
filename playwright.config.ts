import { defineConfig, devices, type Project } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { LIVE_AUTH_FILE } from './e2e-live/paths'

/**
 * Two suites share this config. Which one runs is chosen at run time:
 *
 *   E2E_MODE=mock  (default)  e2e/        every backend call is intercepted - no API needed
 *   E2E_MODE=live             e2e-live/   the real fch-backend-api, real login
 *   E2E_MODE=all              both, mock first
 *
 * `npm run test:e2e`, `test:e2e:live` and `test:e2e:all` set the mode for you
 * (see e2e/run.mjs); `E2E_MODE=live npx playwright test` works too.
 * Live settings (API URL, credentials) come from the environment or from a
 * git-ignored `.env.e2e` file - see `.env.e2e.example`.
 */

// Minimal KEY=VALUE loader so the live suite needs no extra dependency.
// Real environment variables always win over the file.
const envFile = resolve(process.cwd(), '.env.e2e')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!match || line.trim().startsWith('#')) continue
    const [, key, raw] = match
    if (process.env[key] === undefined) process.env[key] = raw.replace(/^(['"])(.*)\1$/, '$2')
  }
}

const MODE = (process.env.E2E_MODE || 'mock').toLowerCase()
if (!['mock', 'live', 'all'].includes(MODE)) {
  throw new Error(`E2E_MODE must be "mock", "live" or "all" (got "${MODE}")`)
}

const chrome = devices['Desktop Chrome']

const mockProjects: Project[] = [
  { name: 'mock', testDir: './e2e', outputDir: 'test-results/mock', use: { ...chrome } },
]

const liveProjects: Project[] = [
  // Logs in once through the real login page and stores the session.
  { name: 'live-setup', testDir: './e2e-live', testMatch: /auth\.setup\.ts/, outputDir: 'test-results/live-setup', use: { ...chrome } },
  {
    name: 'live',
    testDir: './e2e-live',
    testIgnore: /auth\.setup\.ts/,
    // Each project keeps its own folder, so a mock run and a live run started
    // side by side do not wipe each other's traces.
    outputDir: 'test-results/live',
    dependencies: ['live-setup'],
    use: { ...chrome, storageState: LIVE_AUTH_FILE },
  },
]

// E2E_BASE_URL points the suite at an app that is already being served (for
// example a stage deployment, or a build made against another API). Without
// it the local production build is served on :4174.
const externalApp = process.env.E2E_BASE_URL

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Live-backend specs hit the local fch-backend-api dev server directly,
  // which isn't built for concurrency; running multiple spec files in
  // parallel workers starves individual requests and produces flaky
  // timeouts (confirmed in the sibling fch-borrower-react repo).
  workers: 1,
  reporter: 'html',
  // 5s is too tight for assertions on transient UI (toasts) when the machine is busy:
  // the app only renders after its locations request, well after the load event.
  expect: { timeout: 10_000 },
  use: {
    baseURL: externalApp || 'http://localhost:4174',
    trace: 'on-first-retry',
  },
  projects: [
    ...(MODE === 'mock' || MODE === 'all' ? mockProjects : []),
    ...(MODE === 'live' || MODE === 'all' ? liveProjects : []),
  ],
  webServer: externalApp
    ? undefined
    : {
        command: 'npm run preview',
        url: 'http://localhost:4174',
        reuseExistingServer: !process.env.CI,
      },
})
