import { test, expect, type Page, type Route } from '@playwright/test'
import { seedSession } from '../../support/helpers'

// QA round 2, Clients:
// - R2 BUG-051: an employee set to Inactive was still offered in "Assign to".
//   The picker asks for active staff only, keeping the client's current
//   assignee - who comes back flagged and shows as "(Inactive)".
// - R2 BUG-065: two users editing the same client - the later save silently
//   undid the earlier one. The form sends the version it loaded; the API
//   refuses an older one with 409 and the page says so.

const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'
const STALE = 'This client was changed by someone else since you opened it. Reload to see the latest before saving.'

const HOST_USER = {
  id: 11, name: 'Hal Host', email: 'host@example.test', user_type: 'Admin', entity_type: 'Partner',
  is_host: 1, partner_id: 1, permissions: ['view clients', 'create clients', 'update clients'],
}

const CLIENT = {
  id: 5, first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.test', phone_number: '(555) 234-5678',
  country: 'United States', business_country: 'United States', partner_id: 2, assign_id: 22, assign_name: 'Sal WLP',
  client_info_version: 'v1',
}

type Save = { status: number; json: unknown }

function jsonOk(route: Route, data: unknown) {
  return route.fulfill({ json: { status: true, message: 'ok', data, meta: { total: 0 } } })
}

/** Serves the client and its partner's team; records each team request and each save. */
async function openClient(page: Page, opts: { team?: unknown[]; save?: (n: number) => Save } = {}) {
  const calls = { teams: [] as Record<string, unknown>[], saves: [] as Record<string, any>[] }
  const team = opts.team ?? [{ id: 21, name: 'Wil Label', is_inactive: false }, { id: 22, name: 'Sal WLP', is_inactive: false }]
  const save = opts.save ?? ((n: number) => ({ status: 200, json: { status: true, message: 'ok', data: { ...CLIENT, client_info_version: `v${n + 1}` } } }))

  await seedSession(page, HOST_USER)
  await page.route(`${API_ORIGIN}/**`, (route) => jsonOk(route, []))
  await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => jsonOk(route, { site_name: 'Four Corner Funding' }))
  await page.route(`${API_ORIGIN}/common/get-all-users`, (route) => {
    calls.teams.push(route.request().postDataJSON() ?? {})
    return jsonOk(route, team)
  })
  await page.route(`${API_ORIGIN}/common/borrowers/${CLIENT.id}`, (route) => {
    if (route.request().method() === 'GET') return jsonOk(route, CLIENT)
    calls.saves.push(route.request().postDataJSON() ?? {})
    const answer = save(calls.saves.length)
    return route.fulfill({ status: answer.status, json: answer.json })
  })

  await page.goto(`/clients/${CLIENT.id}`)
  return calls
}

const assignTo = (page: Page) =>
  page.locator('.mb-3', { has: page.locator('label.form-label', { hasText: 'Assign to' }) }).locator('.p-dropdown')
const update = (page: Page) => page.getByRole('button', { name: /update$/i }).first()

test.describe('Client › Assign to leaves out inactive staff (R2 BUG-051)', () => {
  test('asks for active staff only, keeping the current assignee', async ({ page }) => {
    const calls = await openClient(page)

    await expect(assignTo(page).locator('.p-dropdown-label')).toHaveText('Sal WLP')
    expect(calls.teams).toContainEqual({ partner_id: 2, active_only: true, keep_ids: [22] })
  })

  test('a current assignee since set Inactive still shows, marked "(Inactive)"', async ({ page }) => {
    await openClient(page, { team: [{ id: 21, name: 'Wil Label', is_inactive: false }, { id: 22, name: 'Sal WLP', is_inactive: true }] })

    const field = assignTo(page)
    await expect(field.locator('.p-dropdown-label')).toHaveText('Sal WLP (Inactive)')
    await field.click()
    await expect(field.locator('.p-dropdown-item')).toHaveText(['Wil Label', 'Sal WLP (Inactive)'])
  })
})

test.describe('Client › saved from an older copy (R2 BUG-065)', () => {
  test('each save carries the version it was made from: the loaded one, then the one the save returned', async ({ page }) => {
    const calls = await openClient(page)
    await expect(assignTo(page).locator('.p-dropdown-label')).toHaveText('Sal WLP')

    await update(page).click()
    await expect(page.getByText('Client personal details updated successfully').first()).toBeVisible()
    await expect.poll(() => calls.saves.length).toBe(1)
    // The success toast sits over the button, so the click is sent to it directly.
    await update(page).dispatchEvent('click')
    await expect.poll(() => calls.saves.length).toBe(2)

    expect(calls.saves.map((body) => body.expected_version)).toEqual(['v1', 'v2'])
  })

  test('a 409 says the client was changed by someone else, and nothing is reported saved', async ({ page }) => {
    const calls = await openClient(page, { save: () => ({ status: 409, json: { status: false, message: STALE } }) })
    await expect(assignTo(page).locator('.p-dropdown-label')).toHaveText('Sal WLP')

    await update(page).click()

    await expect.poll(() => calls.saves.length).toBe(1)
    expect(calls.saves[0].expected_version).toBe('v1')
    await expect(page.getByText(STALE).first()).toBeVisible()
    await expect(page.getByText('Client personal details updated successfully')).toHaveCount(0)
  })
})
