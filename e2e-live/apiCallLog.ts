import { appendFileSync, mkdirSync } from 'node:fs'

/**
 * Records which API endpoints a test run actually reached, one JSON line per
 * distinct call, in test-reports/api-calls-<suite>.ndjson.
 *
 * e2e/api-coverage.mjs reads these to report endpoint coverage from what the
 * browser really requested, rather than from what the spec files mention.
 * e2e/run.mjs clears the file at the start of each run.
 */
export type Suite = 'mock' | 'live'

const seen = new Set<string>()
let ready = false

/**
 * @param specific For the mocked suite: true when a handler written for this
 *   endpoint answered, false when the catch-all "empty success" did. Only the
 *   first means a test set the endpoint up on purpose.
 */
export function recordApiCall(suite: Suite, method: string, path: string, specific = true) {
  // Ids and query strings vary per call; the route is what matters.
  const route = path.replace(/\?.*$/, '')
  const key = `${suite} ${method} ${route} ${specific}`
  if (seen.has(key)) return
  seen.add(key)
  try {
    if (!ready) {
      mkdirSync('test-reports', { recursive: true })
      ready = true
    }
    appendFileSync(`test-reports/api-calls-${suite}.ndjson`, `${JSON.stringify({ method, path: route, specific })}\n`)
  } catch {
    // Coverage bookkeeping must never fail a test.
  }
}
