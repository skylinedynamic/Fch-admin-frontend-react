#!/usr/bin/env node
/**
 * Builds one self-contained HTML page from the JSON results of the test runs:
 *
 *   test-reports/e2e-mock.json   PLAYWRIGHT_JSON_OUTPUT_NAME=... npm run test:e2e -- --reporter=json
 *   test-reports/e2e-live.json   PLAYWRIGHT_JSON_OUTPUT_NAME=... npm run test:e2e:live -- --reporter=json
 *   test-reports/vitest.json     npx vitest run --reporter=json --outputFile=test-reports/vitest.json
 *
 * Any file that is missing is reported as "not run" rather than skipped silently.
 * `npm run test:report` runs this and prints the path of the page.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const DIR = resolve('test-reports')
const OUT = join(DIR, 'verification-report.html')

const read = (name) => {
  const file = join(DIR, name)
  if (!existsSync(file)) return null
  try {
    return { data: JSON.parse(readFileSync(file, 'utf8')), at: statSync(file).mtime }
  } catch {
    return null
  }
}

const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const slash = (file) => String(file).replace(/\\/g, '/')

// ---- Playwright -------------------------------------------------------------------------------

/** Flattens a Playwright JSON report into [{ file, group, title, status, ms, project, error }]. */
function playwrightTests(report) {
  const out = []
  const walk = (suite, file, trail) => {
    const here = suite.file ? slash(suite.file) : file
    const path = suite.title && suite.title !== suite.file && !/\.(spec|setup)\.ts$/.test(suite.title) ? [...trail, suite.title] : trail
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const last = test.results?.[test.results.length - 1]
        // "expected" + expectedStatus "failed" is a test.fail(): a documented application bug.
        let status = { expected: 'passed', unexpected: 'failed', skipped: 'skipped', flaky: 'flaky' }[test.status] ?? test.status
        if (status === 'passed' && test.expectedStatus === 'failed') status = 'known-bug'
        out.push({
          file: here,
          group: path.join(' › '),
          title: spec.title,
          status,
          ms: (test.results ?? []).reduce((sum, r) => sum + (r.duration || 0), 0),
          project: test.projectName,
          error: status === 'failed' ? (last?.error?.message || '').split('\n').slice(0, 4).join('\n') : '',
          annotations: (test.annotations ?? []).filter((a) => a.type === 'api-not-enforced' || a.type === 'skip'),
        })
      }
    }
    for (const child of suite.suites ?? []) walk(child, here, path)
  }
  for (const suite of report.suites ?? []) walk(suite, slash(suite.file ?? ''), [])
  return out
}

// ---- Vitest -----------------------------------------------------------------------------------

/** Titles declared with it.fails(...) - Vitest reports them as passed, so they are found in the source. */
function vitestKnownBugs() {
  const titles = new Set()
  const scan = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) scan(full)
      else if (/\.test\.(ts|tsx|js|jsx)$/.test(entry)) {
        for (const match of readFileSync(full, 'utf8').matchAll(/it\.fails\(\s*(['"`])(.+?)\1/g)) titles.add(match[2])
      }
    }
  }
  if (existsSync('tests')) scan('tests')
  return titles
}

function vitestTests(report) {
  const known = vitestKnownBugs()
  const out = []
  for (const file of report.testResults ?? []) {
    const name = slash(relative(process.cwd(), file.name))
    for (const test of file.assertionResults ?? []) {
      let status = { passed: 'passed', failed: 'failed', pending: 'skipped', skipped: 'skipped', todo: 'skipped' }[test.status] ?? test.status
      if (status === 'passed' && known.has(test.title)) status = 'known-bug'
      out.push({
        file: name,
        group: (test.ancestorTitles ?? []).join(' › '),
        title: test.title,
        status,
        ms: test.duration || 0,
        error: status === 'failed' ? (test.failureMessages?.[0] || '').split('\n').slice(0, 4).join('\n') : '',
        annotations: [],
      })
    }
  }
  return out
}

// ---- Rendering --------------------------------------------------------------------------------

const count = (tests) => {
  const c = { total: tests.length, passed: 0, failed: 0, skipped: 0, flaky: 0, 'known-bug': 0, rerun: 0 }
  for (const t of tests) c[t.status] = (c[t.status] || 0) + 1
  return c
}

const LABEL = { passed: 'Passed', failed: 'Failed', skipped: 'Skipped', flaky: 'Flaky', 'known-bug': 'Known bug', rerun: 'Passed on re-run' }

const pill = (status) => `<span class="pill ${status}">${LABEL[status] ?? esc(status)}</span>`

function summaryCard(title, note, source) {
  if (!source) {
    return `<section class="card not-run"><h3>${esc(title)}</h3><p class="big">Not run</p><p class="muted">${esc(note)}</p></section>`
  }
  const c = count(source.tests)
  const verdict = c.failed ? 'bad' : c.total ? 'good' : 'not-run'
  return `<section class="card ${verdict}">
    <h3>${esc(title)}</h3>
    <p class="big">${c.passed + c['known-bug'] + c.rerun} <span class="of">/ ${c.total - c.skipped}</span></p>
    <p class="muted">${c.failed} failed · ${c['known-bug']} known bug${c['known-bug'] === 1 ? '' : 's'} · ${c.skipped} skipped${c.flaky ? ` · ${c.flaky} flaky` : ''}${c.rerun ? ` · ${c.rerun} passed on re-run` : ''}</p>
    <p class="muted">${esc(note)}<br>Run finished ${esc(source.at.toLocaleString())}</p>
  </section>`
}

function fileTable(tests, groupBy = (t) => t.file) {
  const groups = new Map()
  for (const test of tests) {
    const key = groupBy(test)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(test)
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, list]) => {
      const c = count(list)
      const state = c.failed ? 'failed' : c.total === c.skipped ? 'skipped' : 'passed'
      const rows = list
        .map(
          (t) => `<tr class="row-${t.status}">
            <td>${pill(t.status)}</td>
            <td><span class="group">${esc(t.group)}</span>${t.group ? ' › ' : ''}${esc(t.title)}${
              t.annotations.length ? `<div class="note">${t.annotations.map((a) => esc(`${a.type}: ${a.description ?? ''}`)).join('<br>')}</div>` : ''
            }${t.error ? `<pre>${esc(t.error)}</pre>` : ''}</td>
            <td class="num">${(t.ms / 1000).toFixed(1)}s</td>
          </tr>`
        )
        .join('')
      return `<details${c.failed ? ' open' : ''}>
        <summary>${pill(state)} <code>${esc(name)}</code>
          <span class="muted">${c.passed + c.rerun} passed${c['known-bug'] ? `, ${c['known-bug']} known bug` : ''}${c.failed ? `, ${c.failed} failed` : ''}${c.skipped ? `, ${c.skipped} skipped` : ''}</span>
        </summary>
        <table><tbody>${rows}</tbody></table>
      </details>`
    })
    .join('')
}

function knownBugs(all) {
  const bugs = all.filter((t) => t.status === 'known-bug')
  if (!bugs.length) return ''
  return `<h2>Known application bugs pinned by tests <span class="muted">(${bugs.length})</span></h2>
    <p class="muted">Each of these tests asserts the <em>correct</em> behaviour and is marked as expected to fail. It keeps the suite green while the bug exists and turns red the moment the bug is fixed, as a prompt to remove the marker.</p>
    <table><tbody>${bugs.map((t) => `<tr><td>${pill('known-bug')}</td><td>${esc(t.group)}${t.group ? ' › ' : ''}${esc(t.title)}<div class="muted"><code>${esc(t.file)}</code></div></td></tr>`).join('')}</tbody></table>`
}

function findings() {
  const file = resolve('e2e-live/.results/access-findings.json')
  if (!existsSync(file)) return ''
  const list = JSON.parse(readFileSync(file, 'utf8'))
  if (!list.length) {
    return `<h2>API enforcement</h2><p class="muted">For every screen the UI blocks, the live run also called the API directly as that user. The API refused each one - no gaps recorded.</p>`
  }
  return `<h2>API enforcement findings <span class="muted">(${list.length})</span></h2>
    <p class="muted">The UI blocks these screens for the persona, but the API still answered the screen's list request when called directly with that user's token. Hiding a screen is not access control, so each row should be reviewed: either the read is intentionally shared, or the endpoint needs a permission check.</p>
    <table><thead><tr><th>Persona</th><th>Screen</th><th>Request</th><th>API status</th></tr></thead><tbody>${list
      .map((f) => `<tr><td>${esc(f.persona)}</td><td>${esc(f.screen)} <code>${esc(f.path)}</code></td><td><code>${esc(f.api)}</code></td><td>${esc(f.status)}</td></tr>`)
      .join('')}</tbody></table>`
}

// ---- Assemble ---------------------------------------------------------------------------------

const mockRaw = read('e2e-mock.json')
const liveRaw = read('e2e-live.json')
const vitestRaw = read('vitest.json')

/**
 * A re-run file holds only the tests that failed in the main run, executed again on their own.
 * A test that passes there is shown as "passed on re-run" - it is counted as passing, but kept
 * visibly apart from a clean pass so a timing-sensitive test is not hidden.
 */
function withReruns(tests, rerunRaw) {
  if (!rerunRaw) return tests
  const key = (t) => [t.file, t.group, t.title].join('|')
  const again = new Map(playwrightTests(rerunRaw.data).map((t) => [key(t), t]))
  return tests.map((t) => {
    const second = again.get(key(t))
    if (!second || t.status !== 'failed') return t
    return second.status === 'passed' ? { ...second, status: 'rerun', firstError: t.error } : { ...second, error: second.error || t.error }
  })
}

const mock = mockRaw && { tests: withReruns(playwrightTests(mockRaw.data), read('e2e-mock-rerun.json')), at: mockRaw.at }
const live = liveRaw && { tests: withReruns(playwrightTests(liveRaw.data), read('e2e-live-rerun.json')), at: liveRaw.at }
const vitestAll = vitestRaw && { tests: vitestTests(vitestRaw.data), at: vitestRaw.at }

const isFeature = (t) => /^tests\/(pages|components|Assistant)\//.test(t.file)
const unit = vitestAll && { tests: vitestAll.tests.filter((t) => !isFeature(t)), at: vitestAll.at }
const feature = vitestAll && { tests: vitestAll.tests.filter(isFeature), at: vitestAll.at }

const everything = [...(mock?.tests ?? []), ...(live?.tests ?? []), ...(vitestAll?.tests ?? [])]
const total = count(everything)
const missing = [!mock && 'mocked e2e', !live && 'live e2e', !vitestAll && 'unit and feature'].filter(Boolean)

const personaOf = (t) => (t.group.match(/^Live access - ([^›]+)/)?.[1] ?? '').trim()
const livePersona = live ? live.tests.filter((t) => personaOf(t)) : []
const liveOther = live ? live.tests.filter((t) => !personaOf(t)) : []

const headline = total.failed
  ? `${total.failed} test${total.failed === 1 ? '' : 's'} failing`
  : missing.length
    ? `No failures in what ran - ${missing.join(', ')} not run`
    : 'Every test that ran passed'

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin Portal Test Verification</title>
<style>
  :root { --bg:#f6f7f9; --panel:#fff; --ink:#1c2330; --muted:#667085; --line:#e4e7ec; --good:#12813f; --good-bg:#e7f6ec; --bad:#b42318; --bad-bg:#fde9e7; --warn:#93570b; --warn-bg:#fdf1dc; --skip:#475467; --skip-bg:#eef0f3; --accent:#2c6ecb; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#11141a; --panel:#1a1f28; --ink:#e7eaf0; --muted:#98a2b3; --line:#2a313d; --good:#5fd08a; --good-bg:#143222; --bad:#ff8a80; --bad-bg:#3a1a17; --warn:#f0b65a; --warn-bg:#3a2a10; --skip:#aab2c0; --skip-bg:#242b36; --accent:#7fb0ff; }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
  main { max-width:1180px; margin:0 auto; padding:28px 16px 64px; }
  h1 { font-size:26px; margin:0 0 4px; }
  h2 { font-size:19px; margin:36px 0 10px; }
  h3 { font-size:13px; margin:0 0 6px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); }
  .muted { color:var(--muted); font-size:13px; }
  .verdict { display:inline-block; margin:10px 0 0; padding:6px 12px; border-radius:8px; font-weight:600; }
  .verdict.good { background:var(--good-bg); color:var(--good); } .verdict.bad { background:var(--bad-bg); color:var(--bad); } .verdict.warn { background:var(--warn-bg); color:var(--warn); }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:12px; margin-top:18px; }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:14px 16px; border-top:4px solid var(--skip); }
  .card.good { border-top-color:var(--good); } .card.bad { border-top-color:var(--bad); }
  .card p { margin:2px 0; } .big { font-size:30px; font-weight:700; line-height:1.2; } .of { font-size:16px; font-weight:500; color:var(--muted); }
  details { background:var(--panel); border:1px solid var(--line); border-radius:10px; margin:6px 0; overflow:hidden; }
  summary { cursor:pointer; padding:9px 12px; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  summary code { font-size:13px; }
  table { width:100%; border-collapse:collapse; }
  td, th { padding:7px 12px; border-top:1px solid var(--line); vertical-align:top; text-align:left; font-size:14px; }
  th { font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); }
  td.num { text-align:right; white-space:nowrap; color:var(--muted); font-variant-numeric:tabular-nums; width:70px; }
  td:first-child { width:104px; white-space:nowrap; }
  .group { color:var(--muted); }
  .pill { display:inline-block; padding:1px 8px; border-radius:999px; font-size:12px; font-weight:600; }
  .pill.passed { background:var(--good-bg); color:var(--good); } .pill.failed { background:var(--bad-bg); color:var(--bad); }
  .pill.known-bug, .pill.flaky, .pill.rerun { background:var(--warn-bg); color:var(--warn); } .pill.skipped { background:var(--skip-bg); color:var(--skip); }
  pre { margin:6px 0 0; padding:8px; background:var(--bad-bg); color:var(--bad); border-radius:6px; white-space:pre-wrap; font-size:12px; overflow-wrap:anywhere; }
  .note { margin-top:4px; font-size:12px; color:var(--warn); }
  code { font-family:ui-monospace,Consolas,monospace; }
  .toolbar { margin:14px 0 0; display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  .toolbar input { flex:1 1 260px; padding:8px 10px; border-radius:8px; border:1px solid var(--line); background:var(--panel); color:var(--ink); font:inherit; }
  .toolbar button { padding:8px 12px; border-radius:8px; border:1px solid var(--line); background:var(--panel); color:var(--ink); font:inherit; cursor:pointer; }
  .toolbar button.on { border-color:var(--accent); color:var(--accent); }
  .hidden { display:none !important; }
</style>
</head>
<body>
<main>
  <h1>Admin Portal Test Verification</h1>
  <p class="muted">Fch-admin-frontend-react · generated ${esc(new Date().toLocaleString())} from the JSON results of each run</p>
  <p class="verdict ${total.failed ? 'bad' : missing.length ? 'warn' : 'good'}">${esc(headline)}</p>
  <p class="muted">${total.total} tests in total: ${total.passed} passed, ${total['known-bug']} pin a known bug, ${total.failed} failed, ${total.skipped} skipped${total.flaky ? `, ${total.flaky} flaky` : ''}${total.rerun ? `, ${total.rerun} passed only when re-run on their own (they timed out while two suites shared the machine)` : ''}.</p>

  <div class="cards">
    ${summaryCard('Unit tests', 'Vitest: services, hooks, stores, utilities', unit)}
    ${summaryCard('Feature tests', 'Vitest + Testing Library: pages and components', feature)}
    ${summaryCard('E2E - mocked', 'Playwright, real browser, API intercepted', mock)}
    ${summaryCard('E2E - live', 'Playwright against the real API, six personas', live)}
  </div>

  <div class="toolbar">
    <input id="q" type="search" placeholder="Filter tests by name, file or persona…" aria-label="Filter tests">
    <button data-status="failed">Failed</button>
    <button data-status="known-bug">Known bugs</button>
    <button data-status="skipped">Skipped</button>
    <button data-status="rerun">Passed on re-run</button>
    <button id="expand">Expand all</button>
  </div>

  ${knownBugs(everything)}
  ${findings()}

  <h2>E2E - mocked <span class="muted">${mock ? `(${mock.tests.length} tests, by spec file)` : '(not run)'}</span></h2>
  ${mock ? fileTable(mock.tests) : '<p class="muted">No results file found.</p>'}

  <h2>E2E - live, access by persona <span class="muted">${live ? `(${livePersona.length} checks)` : '(not run)'}</span></h2>
  ${live ? fileTable(livePersona, personaOf) : '<p class="muted">No results file found.</p>'}

  <h2>E2E - live, other specs <span class="muted">${live ? `(${liveOther.length} tests)` : ''}</span></h2>
  ${live ? fileTable(liveOther) : ''}

  <h2>Feature tests <span class="muted">${feature ? `(${feature.tests.length} tests)` : '(not run)'}</span></h2>
  ${feature ? fileTable(feature.tests) : ''}

  <h2>Unit tests <span class="muted">${unit ? `(${unit.tests.length} tests)` : '(not run)'}</span></h2>
  ${unit ? fileTable(unit.tests) : ''}
</main>
<script>
  const q = document.getElementById('q')
  const buttons = [...document.querySelectorAll('.toolbar button[data-status]')]
  let status = ''
  function apply() {
    const term = q.value.trim().toLowerCase()
    for (const block of document.querySelectorAll('details')) {
      let shown = 0
      const head = block.querySelector('summary').textContent.toLowerCase()
      for (const row of block.querySelectorAll('tbody tr')) {
        const matchesStatus = !status || row.classList.contains('row-' + status)
        const matchesTerm = !term || head.includes(term) || row.textContent.toLowerCase().includes(term)
        const show = matchesStatus && matchesTerm
        row.classList.toggle('hidden', !show)
        if (show) shown++
      }
      block.classList.toggle('hidden', shown === 0)
      if ((term || status) && shown) block.open = true
    }
  }
  q.addEventListener('input', apply)
  for (const button of buttons) {
    button.addEventListener('click', () => {
      status = status === button.dataset.status ? '' : button.dataset.status
      buttons.forEach((b) => b.classList.toggle('on', b.dataset.status === status))
      apply()
    })
  }
  document.getElementById('expand').addEventListener('click', (event) => {
    const open = event.target.textContent === 'Expand all'
    document.querySelectorAll('details:not(.hidden)').forEach((d) => { d.open = open })
    event.target.textContent = open ? 'Collapse all' : 'Expand all'
  })
</script>
</body>
</html>
`

writeFileSync(OUT, html)
console.log(`${headline}. ${total.total} tests: ${total.passed} passed, ${total.rerun} passed on re-run, ${total['known-bug']} known-bug, ${total.failed} failed, ${total.skipped} skipped.`)
console.log(`Report: ${OUT}`)
process.exit(total.failed ? 1 : 0)
