import { test, expect, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { LIVE, api, trackServerErrors } from './env'
import { PERSONAS, authFile, isConfigured, type Persona } from './personas'
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
 *      test-results/live-access-findings.json and as an annotation on the test.
 */

const NAV_TIMEOUT = Number(process.env.E2E_LIVE_TIMEOUT_MS || 60_000)

type Session = { token: string; user: SessionUser & Record<string, unknown>; subscription: SessionSubscription }

async function readSession(page: Page): Promise<Session> {
  await page.goto('/profile')
  return page.evaluate(() => {
    const state = JSON.parse(window.localStorage.getItem('auth') || '{}')?.state || {}
    return { token: state.token || '', user: state.user || {}, subscription: state.userSubscription || null }
  })
}

const landing = (page: Page) => new URL(page.url()).pathname

async function settle(page: Page, path: string) {
  await page.goto(path)
  // Guards redirect on first render; give the router a moment to finish.
  await page.waitForLoadState('domcontentloaded')
  await expect
    .poll(() => landing(page), { timeout: 15_000 })
    .toMatch(new RegExp(`^(${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|/access-denied|/|/login)$`))
}

type Finding = { persona: string; screen: string; path: string; api: string; status: number; note: string }
const findings: Finding[] = []

test.afterAll(() => {
  mkdirSync('test-results', { recursive: true })
  writeFileSync('test-results/live-access-findings.json', JSON.stringify(findings, null, 2))
})

for (const persona of PERSONAS) {
  test.describe(`Live access - ${persona.label}`, () => {
    test.use({ storageState: authFile(persona.key) })
    test.describe.configure({ timeout: NAV_TIMEOUT + 60_000 })

    let session: Session

    test.beforeEach(async ({ page }) => {
      test.skip(!isConfigured(persona), `${persona.label} not configured: set E2E_${persona.env}_EMAIL and E2E_${persona.env}_PASSWORD.`)
      session = await readSession(page)
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
        await settle(page, route.path)
        const landed = landing(page)

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
            findings.push(finding)
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
