#!/usr/bin/env node
/**
 * Cross-platform launcher for the e2e suites (npm scripts cannot set an
 * environment variable the same way on Windows and POSIX shells).
 *
 *   node e2e/run.mjs mock [playwright args]
 *   node e2e/run.mjs live [playwright args]
 *   node e2e/run.mjs all  [playwright args]
 */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const [mode = 'mock', ...args] = process.argv.slice(2)

if (!['mock', 'live', 'all'].includes(mode)) {
  console.error(`Unknown e2e mode "${mode}". Use mock, live or all.`)
  process.exit(1)
}

// Run Playwright's CLI with this Node directly instead of through a shell, so arguments such as
// -g "a|b" reach it untouched on every platform.
const cli = createRequire(import.meta.url).resolve('@playwright/test/cli')

const result = spawnSync(process.execPath, [cli, 'test', ...args], {
  stdio: 'inherit',
  env: { ...process.env, E2E_MODE: mode },
})

process.exit(result.status ?? 1)
