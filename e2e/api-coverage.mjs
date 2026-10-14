#!/usr/bin/env node
/**
 * Lists every API endpoint the app calls (each `apiClient.<verb>(...)` in src/)
 * and whether a test mentions it: the mocked e2e suite and
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
const suites = { mock: corpus(['e2e']), unit: corpus(['tests']) }

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
  if (tail.includes('/') && new RegExp(`${escapeRegExp(tail)}(?![A-Za-z0-9_-])`).test(text)) return true
  // ...or any trailing part of the path right after a template prefix:
  // `${FA}/attestation-authorization`, `${RA}/pre-qualification/5/run-ai`.
  const segments = path.split('/').filter(Boolean)
  for (let start = 1; start < segments.length; start++) {
    const rest = segments.slice(start)
    if (rest[rest.length - 1] === ':param') break
    const suffix = rest.map((s) => (s === ':param' ? '[^/\'"`\\s)]+' : escapeRegExp(s))).join('/')
    if (new RegExp(`\\}/${suffix}(?![A-Za-z0-9_-])`).test(text)) return true
  }
  return false
}

// Endpoints whose only callers are service functions no screen uses, so no e2e
// test can reach them (tests/modules/unreachableServices.test.ts pins their
// requests). Kept by hand: re-check when one of these functions gains a caller.
const UNREACHABLE = new Set([
  'GET /common/get-theme',
  'GET /common/time-slots/fetch-all',
  'GET /common/borrowers/all',
  'POST /process-payment',
  'POST /process-payment-for-users',
  'POST /payment/initiate-subscription',
  'PUT /admin/funding-sequencings/:param/visibility',
  'POST /:param/upload-file',
  'POST /common/borrowers/fetch-borrowers',
  'GET /admin/credit-builder/tier-tasks/:param',
  'POST /admin/partners-stats',
])

// The e2e suites also log every request a test set up a response for, or made
// itself (test-reports/api-calls-<suite>.ndjson, see e2e/support/apiCallLog.ts).
// That catches endpoints a spec reaches through a constant or template the
// text search above cannot follow.
function exercised(suite) {
  const file = `test-reports/api-calls-${suite}.ndjson`
  if (!existsSync(file)) return []
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => { try { return JSON.parse(line) } catch { return null } })
    .filter((call) => call && call.specific)
}
const calls = { mock: exercised('mock') }

function called(suite, method, path) {
  const pattern = new RegExp(`^${path.split(':param').map(escapeRegExp).join('[^/]+')}$`)
  return calls[suite].some((call) => call.method === method && pattern.test(call.path))
}

const rows = [...endpoints.values()]
  .map((endpoint) => ({
    method: endpoint.method,
    path: endpoint.path,
    files: [...endpoint.files].sort(),
    mock: mentioned(suites.mock, endpoint.path) || called('mock', endpoint.method, endpoint.path),
    unit: mentioned(suites.unit, endpoint.path),
    unreachable: UNREACHABLE.has(`${endpoint.method} ${endpoint.path}`),
  }))
  .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))

// ---- 3. Report ---------------------------------------------------------------------------------

const count = (test) => rows.filter(test).length
const total = rows.length
const summary = {
  total,
  e2eMock: count((r) => r.mock),
  e2eAny: count((r) => r.mock),
  unit: count((r) => r.unit),
  any: count((r) => r.mock || r.unit),
  unreachable: count((r) => r.unreachable),
  reachable: count((r) => !r.unreachable),
  e2eReachable: count((r) => !r.unreachable && (r.mock)),
}

mkdirSync('test-reports', { recursive: true })
writeFileSync('test-reports/api-coverage.json', JSON.stringify({ generatedAt: new Date().toISOString(), summary, endpoints: rows }, null, 1))

const pct = (n) => `${n} (${((n / total) * 100).toFixed(0)}%)`
console.log(`API endpoints called by the app: ${total}`)
console.log(`  mentioned by a mocked e2e spec : ${pct(summary.e2eMock)}`)
console.log(`  mentioned by any e2e spec      : ${pct(summary.e2eAny)}`)
console.log(`  mentioned by a unit/feature test: ${pct(summary.unit)}`)
console.log(`  mentioned by any test          : ${pct(summary.any)}`)
console.log(`  reachable from a screen        : ${summary.reachable} - of those, in an e2e spec: ${summary.e2eReachable} (${((summary.e2eReachable / summary.reachable) * 100).toFixed(0)}%)`)

const line = (r) => `  ${r.method.padEnd(6)} ${r.path}   <- ${r.files[0].replace('src/', '')}`
const untested = rows.filter((r) => !r.mock && !r.unit)
const noE2e = rows.filter((r) => !r.mock && r.unit && !r.unreachable)
const unreachable = rows.filter((r) => r.unreachable)

console.log(`\nIn no test at all (${untested.length}):`)
untested.forEach((r) => console.log(line(r)))
console.log(`\nUnit/feature-tested but in no e2e spec (${noE2e.length}):`)
noE2e.forEach((r) => console.log(line(r)))
console.log(`\nNo screen calls these, so only unit tests can reach them (${unreachable.length}):`)
unreachable.forEach((r) => console.log(`${line(r)}${r.unit ? '' : '   [NO UNIT TEST]'}`))

if (process.argv.includes('--all')) {
  console.log('\nEvery endpoint (M = mocked e2e, U = unit/feature):')
  rows.forEach((r) => console.log(`  ${r.mock ? 'M' : '-'}${r.unit ? 'U' : '-'} ${r.method.padEnd(6)} ${r.path}`))
}
