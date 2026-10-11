import { test, expect, type Page } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { LIVE, api, trackServerErrors } from './env'
import { PERSONAS, authFile, isConfigured, type Persona, type PersonaKey } from './personas'
import { landingPath } from './navigation'
import { FINDINGS_FILE } from './paths'
import { ROUTES, expectedOutcome, type Outcome, type SessionSubscription, type SessionUser } from './routes'

/**
 * The access matrix: every persona x every screen, against the real backend.
 *
 * For each pair the test works out what App.jsx's guards must do for THIS
 * account (from the permissions the API actually gave it) and checks three
 * things:
 *
 *   1. the router does exactly that - opens the screen, shows access-denied,
 *      or sends the user home;
 *   2. a screen the user is allowed into renders without a 5xx, and the API
 *      does not refuse its own list call (otherwise the user sees a broken page);
 *   3. for a screen the UI blocks, whether the API blocks it too. A UI guard is
 *      not security, so an API that still answers is recorded as a finding in
 *      e2e-live/.results/access-findings.json and as an annotation on the test.
 */

const NAV_TIMEOUT = Number(process.env.E2E_LIVE_TIMEOUT_MS || 60_000)

type Session = { token: string; user: SessionUser & Record<string, unknown>; subscription: SessionSubscription }

/**
 * The session auth.setup.ts saved for a persona, read straight from its
 * storage-state file. Reading it from disk (instead of loading a page in every
 * test) keeps each check to a single navigation.
 */
function readSession(key: PersonaKey): Session {
  const file = authFile(key)
  if (!existsSync(file)) return { token: '', user: {}, subscription: null }
  const saved = JSON.parse(readFileSync(file, 'utf8')) as { origins?: { localStorage?: { name: string; value: string }[] }[] }
  for (const origin of saved.origins ?? []) {
    const auth = origin.localStorage?.find((item) => item.name === 'auth')
    if (!auth) continue
    const state = JSON.parse(auth.value)?.state || {}
    return { token: state.token || '', user: state.user || {}, subscription: state.userSubscription || null }
  }
  return { token: '', user: {}, subscription: null }
}

type Finding = { persona: string; screen: string; path: string; api: string; status: number; note: string }
// Appended one at a time: a failing test restarts the worker, so anything kept
// in memory until the end of the run would be lost.
function record(finding: Finding) {
  mkdirSync(dirname(FINDINGS_FILE), { recursive: true })
  const all: Finding[] = existsSync(FINDINGS_FILE) ? JSON.parse(readFileSync(FINDINGS_FILE, 'utf8')) : []
  if (!all.some((f) => f.persona === finding.persona && f.path === finding.path)) all.push(finding)
  writeFileSync(FINDINGS_FILE, JSON.stringify(all, null, 2))
}

for (const persona of PERSONAS) {
  test.describe(`Live access - ${persona.label}`, () => {
    test.use({ storageState: authFile(persona.key) })
    test.describe.configure({ timeout: NAV_TIMEOUT + 60_000 })

    let session: Session

    test.beforeEach(() => {
      test.skip(!isConfigured(persona), `${persona.label} not configured: set E2E_${persona.env}_EMAIL and E2E_${persona.env}_PASSWORD.`)
      session = readSession(persona.key)
      expect(session.token, `${persona.label} has no saved session - did auth.setup.ts sign in?`).not.toBe('')
    })

    test('the account really is this persona', async () => {
      assertIdentity(persona, session)
    })

    test('the sidebar only offers screens this account can open', async ({ page }) => {
      await page.goto('/')
      await expect(page.locator('#navbar-nav')).toBeVisible({ timeout: NAV_TIMEOUT })
      const hrefs = await page.locator('#navbar-nav a[href^="/"]').evaluateAll((links) =>
        Array.from(new Set(links.map((a) => (a as HTMLAnchorElement).getAttribute('href') || '').filter(Boolean)))
      )
      const offeredButBlocked: string[] = []
      for (const href of hrefs) {
        const route = ROUTES.find((r) => r.path === href.split('?')[0])
        if (!route) continue
        if (expectedOutcome(route, session.user, session.subscription) !== 'allowed') offeredButBlocked.push(href)
      }
      expect(offeredButBlocked, `Sidebar links that lead to a blocked screen for ${persona.label}`).toEqual([])
    })

    for (const route of ROUTES) {
      test(`${route.name} (${route.path})`, async ({ page, request }) => {
        const expected: Outcome = expectedOutcome(route, session.user, session.subscription)
        test.info().annotations.push({ type: 'expected', description: expected })

        const serverErrors = trackServerErrors(page)
        const landed = await landingPath(page, route.path, NAV_TIMEOUT)

        if (expected === 'allowed') {
          expect(landed, `${persona.label} should be able to open ${route.path}`).toBe(route.path)
          await expect(page.locator('.page-content').first()).toBeVisible({ timeout: NAV_TIMEOUT })
          // The screen must not have fallen over into the error boundary / 404.
          await expect(page.getByText(/Something went wrong|Page Not Found/i)).toHaveCount(0)

          if (route.api) {
            const res = await api(request, session.token, route.api.method, route.api.path, route.api.body)
            expect(
              [401, 403].includes(res.status()),
              `UI lets ${persona.label} into ${route.path} but the API answers ${res.status()} for ${route.api.method} ${route.api.path}`
            ).toBe(false)
            expect(res.status(), `${route.api.method} ${route.api.path} failed for ${persona.label}`).toBeLessThan(500)
          }
          expect(serverErrors, `Server errors while ${persona.label} loaded ${route.path}: ${JSON.stringify(serverErrors)}`).toEqual([])
          return
        }

        const target = expected === 'access-denied' ? '/access-denied' : '/'
        // "/" is itself a route, so only assert the redirect for other paths.
        if (route.path !== '/') {
          expect(landed, `${persona.label} must not reach ${route.path}`).toBe(target)
        }

        if (route.api) {
          const res = await api(request, session.token, route.api.method, route.api.path, route.api.body)
          if (res.status() < 400) {
            const finding: Finding = {
              persona: persona.label,
              screen: route.name,
              path: route.path,
              api: `${route.api.method} ${route.api.path}`,
              status: res.status(),
              note: 'The UI blocks this screen but the API still answers the request for this account.',
            }
            record(finding)
            test.info().annotations.push({ type: 'api-not-enforced', description: `${finding.api} -> ${finding.status}` })
          }
        }
      })
    }
  })
}

function assertIdentity(persona: Persona, session: Session) {
  const { user } = session
  const isHost = user.is_host === true || user.is_host === 1
  expect(isHost, `${persona.label}: is_host`).toBe(persona.expect.isHost)
  expect(user.entity_type, `${persona.label}: entity_type`).toBe(persona.expect.entityType)
  expect(user.partner_type, `${persona.label}: partner_type`).toBe(persona.expect.partnerType)
  expect(LIVE.apiUrl).toBeTruthy()
}
