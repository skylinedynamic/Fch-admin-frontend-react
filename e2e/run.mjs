#!/usr/bin/env node
/**
 * Launcher for the mocked e2e suite.
 *
 *   node e2e/run.mjs [playwright args]
 */
import { spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { createRequire } from 'node:module'

const args = process.argv.slice(2)

// A full run starts a fresh record of the endpoints it reaches (see e2e/support/apiCallLog.ts).
// A run narrowed to some specs or tests adds to the existing record instead.
const narrowed = args.some((arg) => !arg.startsWith('-') || arg === '-g' || arg.startsWith('--grep') || arg === '--last-failed')
if (!narrowed) rmSync('test-reports/api-calls-mock.ndjson', { force: true })

// Run Playwright's CLI with this Node directly instead of through a shell, so arguments such as
// -g "a|b" reach it untouched on every platform.
const cli = createRequire(import.meta.url).resolve('@playwright/test/cli')

const result = spawnSync(process.execPath, [cli, 'test', ...args], { stdio: 'inherit' })

process.exit(result.status ?? 1)
