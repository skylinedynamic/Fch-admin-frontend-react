import { defineConfig, devices } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { AUTH_STATE_PATH } from './e2e/support/live/env'

/**
 * One spec tree, `e2e/` - `auth/`, `sidebar/<menu>/`, `topbar/<item>/` - two kinds of spec:
 *
 *   *.spec.ts       mocked: every backend call is intercepted by `mockApi()` in
 *                   `e2e/support/helpers.ts`; no API needed     -> npm run test:e2e
 *   *.live.spec.ts  the real local fch-backend-api and database,
 *                   signed in once by `e2e/auth.setup.ts`      -> npm run test:e2e:live
 *
 * Settings such as E2E_BASE_URL come from the environment or from a
 * git-ignored `.env.e2e` file.
 */

// Minimal KEY=VALUE loader so the suite needs no extra dependency.
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

// E2E_BASE_URL points the suite at an app that is already being served (for
// example the dev server on :5174). Without it the local production build is
// served on :4174.
const externalApp = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results/mock',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // No backend is involved, so spec files can run side by side.
  workers: process.env.CI ? 2 : '50%',
  reporter: 'html',
  // 5s is too tight for assertions on transient UI (toasts) when the machine is busy:
  // the app only renders after its locations request, well after the load event.
  expect: { timeout: 10_000 },
  use: {
    baseURL: externalApp || 'http://localhost:4174',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mock',
      testIgnore: [/\.live\.spec\.ts$/, /auth\.setup\.ts$/],
      use: { ...devices['Desktop Chrome'] },
    },
    // Logs the host in once and saves the session for the live specs.
    { name: 'setup', testMatch: /auth\.setup\.ts$/, use: { ...devices['Desktop Chrome'] } },
    {
      name: 'live',
      testMatch: /\.live\.spec\.ts$/,
      dependencies: ['setup'],
      // `php artisan serve` answers one request at a time, so live specs run one
      // at a time and get the borrower suite's longer timeouts. With several API
      // processes behind one port (see e2e/README.md), raise E2E_LIVE_WORKERS.
      workers: Number(process.env.E2E_LIVE_WORKERS) || 1,
      timeout: 180_000,
      expect: { timeout: 45_000 },
      use: { ...devices['Desktop Chrome'], storageState: AUTH_STATE_PATH },
    },
  ],
  webServer: externalApp
    ? undefined
    : {
        command: 'npm run preview',
        url: 'http://localhost:4174',
        reuseExistingServer: !process.env.CI,
      },
})
