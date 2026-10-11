import { test, expect, type Page } from '@playwright/test'
import { mockApi, seedSession } from './helpers'
import { PERSONA_PROFILES, type PersonaProfileKey } from './fixtures/personaProfiles'
import { landingPath } from '../e2e-live/navigation'
import { ROUTES, expectedOutcome, type Outcome } from '../e2e-live/routes'

/**
 * Route access for the six personas, with the backend mocked.
 *
 * Each persona is signed in with the permission profile its real account has
 * (see fixtures/personaProfiles.ts) and every guarded screen is visited. The
 * expected outcome comes from the guard table in e2e-live/routes.ts, so a
 * change to a guard in App.jsx - or to what a role is allowed - shows up here
 * without needing the API. The live suite runs the same matrix against the
 * real accounts.
 */

const LABELS: Record<PersonaProfileKey, string> = {
  host: 'Host',
  whiteLabel: 'White-label partner',
  certified: 'Certified partner',
  hostUser: 'Host user',
  whiteLabelUser: 'White-label partner user',
  certifiedUser: 'Certified partner user',
}

const TARGET: Record<Outcome, (path: string) => string> = {
  allowed: (path) => path,
  'access-denied': () => '/access-denied',
  home: () => '/',
}

const landing = (page: Page, path: string) => landingPath(page, path)

for (const key of Object.keys(PERSONA_PROFILES) as PersonaProfileKey[]) {
  const profile = PERSONA_PROFILES[key]
  const user = { ...profile.user, permissions: [...profile.user.permissions] }

  test.describe(`Access - ${LABELS[key]}`, () => {
    test.beforeEach(async ({ page }) => {
      await seedSession(page, user)
      await mockApi(page)
    })

    for (const route of ROUTES) {
      const expected = expectedOutcome(route, user, profile.subscription)

      test(`${route.name} (${route.path}) -> ${expected}`, async ({ page }) => {
        const landed = await landing(page, route.path)

        expect(landed, `${LABELS[key]} opening ${route.path}`).toBe(TARGET[expected](route.path))
        if (expected === 'allowed') {
          await expect(page.locator('.page-content').first()).toBeVisible()
          await expect(page.getByText(/Access Denied|Page Not Found/i)).toHaveCount(0)
        }
      })
    }
  })
}

/**
 * Facts about the personas that must hold whatever the route table says.
 * They are written out by hand, one page load per test, so that an accidental
 * change to the table or to a seeded role cannot quietly redefine "expected".
 */
type Rule = [persona: PersonaProfileKey, path: string, lands: string]

const HOST_ONLY = ['/tiers', '/credit-accounts', '/capital-access', '/verification-center', '/funding', '/lenders', '/intake-review/credit-profile-requests']
const HOST_PARTNER_ONLY = ['/payment-methods', '/plan-and-fee']
const CMS = ['/cms/blogs', '/cms/seo-settings', '/cms/site-settings']
const PARTNER_WORKSPACE = ['/clients', '/leads', '/contacts', '/employees', '/users']
const DATA_SCREENS = ['/clients', '/users', '/leads', '/payments', '/invoices', '/settings']
const EVERYONE = ['/profile', '/notifications']
const ALL = Object.keys(PERSONA_PROFILES) as PersonaProfileKey[]

const RULES: Record<string, Rule[]> = {
  'host-only screens are open to the host and closed to both partner types': HOST_ONLY.flatMap((path): Rule[] => [
    ['host', path, path], ['whiteLabel', path, '/'], ['certified', path, '/'],
  ]),
  'payment gateways and plan fees are for the host partner account, not a host employee': HOST_PARTNER_ONLY.flatMap((path): Rule[] => [
    ['host', path, path], ['hostUser', path, '/'], ['whiteLabel', path, '/'],
  ]),
  'partner management is host-only': [
    ['host', '/partners', '/partners'], ['whiteLabel', '/partners', '/access-denied'], ['certified', '/partners', '/access-denied'],
  ],
  'the website CMS is host-only': CMS.flatMap((path): Rule[] => [
    ['host', path, path], ['whiteLabel', path, '/access-denied'], ['certified', path, '/access-denied'],
  ]),
  'both partner types manage their own clients, leads, contacts, employees and users': PARTNER_WORKSPACE.flatMap((path): Rule[] => [
    ['whiteLabel', path, path], ['certified', path, path],
  ]),
  'funding requests: white-label yes, certified no': [
    ['whiteLabel', '/intake-review/funding-request', '/intake-review/funding-request'],
    ['certified', '/intake-review/funding-request', '/access-denied'],
  ],
  // The seeded certified partner has no first payment date yet.
  '"My subscription" is only for a non-host partner that has started paying': [
    ['whiteLabel', '/my-subscription', '/my-subscription'], ['host', '/my-subscription', '/'],
    ['certified', '/my-subscription', '/'], ['whiteLabelUser', '/my-subscription', '/'],
  ],
  'every persona can reach their profile and notifications': ALL.flatMap((key): Rule[] => EVERYONE.map((path): Rule => [key, path, path])),
  'an employee with no permissions is kept out of every data screen': (['whiteLabelUser', 'certifiedUser'] as PersonaProfileKey[]).flatMap(
    (key): Rule[] => DATA_SCREENS.map((path): Rule => [key, path, '/access-denied'])
  ),
}

const open = async (page: Page, key: PersonaProfileKey, path: string) => {
  const profile = PERSONA_PROFILES[key]
  await seedSession(page, { ...profile.user, permissions: [...profile.user.permissions] })
  await mockApi(page)
  return landing(page, path)
}

for (const [rule, cases] of Object.entries(RULES)) {
  test.describe(`Access rule - ${rule}`, () => {
    for (const [key, path, lands] of cases) {
      test(`${LABELS[key]} opening ${path} lands on ${lands}`, async ({ page }) => {
        expect(await open(page, key, path)).toBe(lands)
      })
    }
  })
}

test.describe('Access rule - known gaps', () => {
  // KNOWN BUG: the /settings route only admits "update payment settings" or one
  // of the two agreement permissions (App.jsx), but the page itself has
  // sections for email, branding and custom-domain settings, each behind its
  // own permission. The seeded host "Sales" role holds exactly those three and
  // nothing else, so that user is granted settings they can never open.
  // Remove test.fail() once the route accepts every settings permission.
  test('a user holding only email/branding/domain settings permissions can open Settings', async ({ page }) => {
    test.fail()
    expect(PERSONA_PROFILES.hostUser.user.permissions).toContain('update branding settings')
    expect(await open(page, 'hostUser', '/settings')).toBe('/settings')
  })
})
