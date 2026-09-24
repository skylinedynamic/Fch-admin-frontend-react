import { test, expect, type Page, type Route } from '@playwright/test'

// The app calls the backend at an absolute origin (VITE_API_URL, e.g.
// http://127.0.0.1:8000/api/v1) regardless of what host serves the built
// frontend itself, so every backend call can be intercepted by matching that
// origin - no live backend required.
const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'

const HOST_USER = {
  id: 1,
  name: 'Host Admin',
  email: 'host@example.test',
  user_type: 'Admin',
  is_host: 1,
  partner_id: null,
  // The frontend's route guards (PermissionRoute) read permissions straight
  // off the user object (src/lib/auth/rbac.ts's getPermissions()) - there is
  // no user_type-based bypass client-side, so an e2e-seeded session needs an
  // explicit grant for every route/action the spec touches.
  permissions: ['view clients', 'create clients', 'update clients'],
}

// Auth is a Zustand store persisted to localStorage under the key 'auth'
// (src/store/auth/authStore.ts) in the persist middleware's standard
// {state, version} envelope - seeding it before the app boots skips the
// login flow entirely (there is no established login-fixture pattern in
// this repo yet). App.jsx also runs checkSession() on mount, which logs a
// token-holding session straight back out unless this cookie is present too
// (it's how the app tells "still the same browser session" apart from
// "browser was closed since").
async function seedHostSession(page: Page) {
  await page.addInitScript(
    ([user]) => {
      window.localStorage.setItem(
        'auth',
        JSON.stringify({ state: { token: 'e2e-fake-token', user, rememberMe: true }, version: 0 })
      )
      document.cookie = 'auth_session_active=true; path=/'
    },
    [HOST_USER]
  )
}

function jsonOk(route: Route, data: unknown, message = 'ok') {
  return route.fulfill({ json: { status: true, message, data } })
}

const CLIENT_RECORD = {
  id: 1,
  first_name: 'Johnathan',
  last_name: 'Smithfield',
  business_name: 'Smithfield Bakery LLC',
  email: 'borrower@example.test',
  phone_number: '(222) 222-2222',
  partner_id: 2,
  status: 'active',
}

// Layout/Theme components destructure fields straight off this response
// (e.g. site_name) - an empty/array response crashes the whole React tree
// (a real render crash, not just a missing widget), so every field the
// branding UI reads has to be present, not just the ones this spec cares
// about.
const THEME = {
  favicon: null, favicon_full_url: null,
  primary_color: '#2C6ECB', primary_logo: null, primary_logo_full_url: null,
  secondary_color: '#1A1A1A', secondary_logo: null, secondary_logo_full_url: null,
  sidebar_text_color: null, sidebar_icon_color: null,
  sidebar_text_hover_color: null, sidebar_icon_hover_color: null,
  site_name: 'Four Corner Funding', site_slogan: null,
}

test.describe('Activity visibility (Client detail page)', () => {
  test.beforeEach(async ({ page }) => {
    await seedHostSession(page)

    // Broad fallback so any bootstrap call this heavy page makes (other
    // tabs' widgets, notifications, permissions refresh, etc.) gets a
    // harmless generic success instead of a hard network failure. Registered
    // first so the more specific handlers below take priority.
    await page.route(`${API_ORIGIN}/**`, (route) => jsonOk(route, []))

    await page.route(`${API_ORIGIN}/common/partner-theme`, (route) =>
      jsonOk(route, { ...THEME, branding: THEME })
    )
    await page.route(`${API_ORIGIN}/common/borrowers/1`, (route) => jsonOk(route, CLIENT_RECORD))
    await page.route(`${API_ORIGIN}/common/activity-logs/fetch-all-activities`, (route) =>
      jsonOk(route, [], 'Activity logs retrieved successfully.')
    )

    await page.goto('/clients/1')
    await page.getByRole('button', { name: /new event/i }).click()
  })

  test('the create-activity form requires a visibility choice and offers all 4 levels to a host', async ({ page }) => {
    const modal = page.locator('#activityCreateModal')

    for (const label of ['Private (Only Me)', 'Internal', 'Partner', 'Everyone (Including Borrower)']) {
      await expect(modal.getByLabel(label)).toBeVisible()
    }

    // Private is the default selection on a fresh form.
    await expect(modal.getByLabel('Private (Only Me)')).toBeChecked()
  })

  test('selecting a different level updates which radio is checked', async ({ page }) => {
    const modal = page.locator('#activityCreateModal')

    await modal.getByLabel('Internal').check()
    await expect(modal.getByLabel('Internal')).toBeChecked()
    await expect(modal.getByLabel('Private (Only Me)')).not.toBeChecked()

    await modal.getByLabel('Everyone (Including Borrower)').check()
    await expect(modal.getByLabel('Everyone (Including Borrower)')).toBeChecked()
    await expect(modal.getByLabel('Internal')).not.toBeChecked()
  })

  test('submitting with Everyone selected sends visibility=everyone to the API', async ({ page }) => {
    let sentVisibility: string | null = null
    await page.route(`${API_ORIGIN}/common/activity-logs`, async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      const body = route.request().postData() || ''
      const match = body.match(/name="visibility"\r?\n\r?\n([^\r\n]*)/)
      sentVisibility = match ? match[1].trim() : null
      await jsonOk(route, { id: 1, visibility: sentVisibility }, 'Activity created successfully.')
    })

    const modal = page.locator('#activityCreateModal')
    await modal.getByLabel('Everyone (Including Borrower)').check()
    await expect(modal.getByLabel('Everyone (Including Borrower)')).toBeChecked()

    await modal.getByRole('button', { name: 'Create' }).click()

    await expect.poll(() => sentVisibility).toBe('everyone')
  })

  test('submitting with Private selected (the default) sends visibility=private', async ({ page }) => {
    let sentVisibility: string | null = null
    await page.route(`${API_ORIGIN}/common/activity-logs`, async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      const body = route.request().postData() || ''
      const match = body.match(/name="visibility"\r?\n\r?\n([^\r\n]*)/)
      sentVisibility = match ? match[1].trim() : null
      await jsonOk(route, { id: 2, visibility: sentVisibility }, 'Activity created successfully.')
    })

    const modal = page.locator('#activityCreateModal')
    await expect(modal.getByLabel('Private (Only Me)')).toBeChecked()

    await modal.getByRole('button', { name: 'Create' }).click()

    await expect.poll(() => sentVisibility).toBe('private')
  })
})
