#!/usr/bin/env node
/**
 * Lists every API endpoint the app calls (each `apiClient.<verb>(...)` in src/)
 * and whether a test mentions it: the mocked e2e suite, the live e2e suite, and
 * the unit / feature tests.
 *
 * "Mentions" means the endpoint path appears in that suite's source - as a mock
 * handler, an asserted call, or a direct request. It shows which endpoints no
 * test knows about; it cannot prove how thoroughly a mentioned one is tested.
 *
 *   node e2e/api-coverage.mjs            summary + the gaps
 *   node e2e/api-coverage.mjs --all      every endpoint
 *
 * Writes test-reports/api-coverage.json, which the verification report reads.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SKIP_DIRS = /^(node_modules|dist|coverage|\.auth|\.results)$/

function walk(dir, found = []) {
  if (!existsSync(dir)) return found
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.test(entry)) walk(full, found)
    } else {
      found.push(full)
    }
  }
  return found
}

const slash = (file) => file.split('\\').join('/')
const isCode = (file) => /\.(ts|tsx|js|jsx)$/.test(file)

// ---- 1. Endpoints the app calls ----------------------------------------------------------------

const CALL = /(?:apiClient|api)\s*\.\s*(get|post|put|patch|delete)\s*(?:<[^>(]*>)?\(\s*(`[^`]*`|'[^']*'|"[^"]*")/g
const endpoints = new Map()

for (const file of walk('src').filter(isCode)) {
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(CALL)) {
    let path = match[2].slice(1, -1).trim()
    if (!path.startsWith('/')) path = `/${path}`
    // `${id}` and friends become one placeholder; a query string is not part of the route.
    path = path.replace(/\$\{[^}]+\}/g, ':param').replace(/\?.*$/, '')
    const method = match[1].toUpperCase()
    const key = `${method} ${path}`
    if (!endpoints.has(key)) endpoints.set(key, { method, path, files: new Set() })
    endpoints.get(key).files.add(slash(file))
  }
}

// ---- 2. Where each one is mentioned ------------------------------------------------------------

const corpus = (dirs) => dirs.flatMap((dir) => walk(dir)).filter(isCode).map((file) => readFileSync(file, 'utf8')).join('\n')
const suites = { mock: corpus(['e2e']), live: corpus(['e2e-live']), unit: corpus(['tests']) }

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function mentioned(text, path) {
  // Static pieces must appear in order; a placeholder matches one path segment
  // (an id, a `${BASE}`-style template, or a regex fragment in a test).
  const pieces = path.split(':param').map(escapeRegExp)
  const pattern = new RegExp(`${pieces.join('[^/\'"`\\s)]+')}(?![A-Za-z0-9_-])`)
  if (pattern.test(text)) return true
  // Tests often build the URL from a constant prefix (`${BASE}/fetch-all`), so
  // also accept the last two static segments on their own.
  const tail = path.split('/').filter((segment) => segment && segment !== ':param').slice(-2).join('/')
  return tail.includes('/') && new RegExp(`${escapeRegExp(tail)}(?![A-Za-z0-9_-])`).test(text)
}

const rows = [...endpoints.values()]
  .map((endpoint) => ({
    method: endpoint.method,
    path: endpoint.path,
    files: [...endpoint.files].sort(),
    mock: mentioned(suites.mock, endpoint.path),
    live: mentioned(suites.live, endpoint.path),
    unit: mentioned(suites.unit, endpoint.path),
  }))
  .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))

// ---- 3. Report ---------------------------------------------------------------------------------

const count = (test) => rows.filter(test).length
const total = rows.length
const summary = {
  total,
  e2eMock: count((r) => r.mock),
  e2eLive: count((r) => r.live),
  e2eAny: count((r) => r.mock || r.live),
  unit: count((r) => r.unit),
  any: count((r) => r.mock || r.live || r.unit),
}

mkdirSync('test-reports', { recursive: true })
writeFileSync('test-reports/api-coverage.json', JSON.stringify({ generatedAt: new Date().toISOString(), summary, endpoints: rows }, null, 1))

const pct = (n) => `${n} (${((n / total) * 100).toFixed(0)}%)`
console.log(`API endpoints called by the app: ${total}`)
console.log(`  mentioned by a mocked e2e spec : ${pct(summary.e2eMock)}`)
console.log(`  mentioned by a live e2e spec   : ${pct(summary.e2eLive)}`)
console.log(`  mentioned by any e2e spec      : ${pct(summary.e2eAny)}`)
console.log(`  mentioned by a unit/feature test: ${pct(summary.unit)}`)
console.log(`  mentioned by any test          : ${pct(summary.any)}`)

const line = (r) => `  ${r.method.padEnd(6)} ${r.path}   <- ${r.files[0].replace('src/', '')}`
const untested = rows.filter((r) => !r.mock && !r.live && !r.unit)
const noE2e = rows.filter((r) => !r.mock && !r.live && r.unit)

console.log(`\nIn no test at all (${untested.length}):`)
untested.forEach((r) => console.log(line(r)))
console.log(`\nUnit/feature-tested but in no e2e spec (${noE2e.length}):`)
noE2e.forEach((r) => console.log(line(r)))

if (process.argv.includes('--all')) {
  console.log('\nEvery endpoint (M = mocked e2e, L = live e2e, U = unit/feature):')
  rows.forEach((r) => console.log(`  ${r.mock ? 'M' : '-'}${r.live ? 'L' : '-'}${r.unit ? 'U' : '-'} ${r.method.padEnd(6)} ${r.path}`))
}
