import { test, expect, type Page } from '@playwright/test'
import { mockApi, seedSession, type ApiMock } from '../../../support/helpers'

// Intake & Review › Funding Application › Audit Trail: every change to an
// application, who made it and when, each field before and after, with a
// check that no event was changed or removed. Backend calls are mocked.
const TRAIL = /\/common\/request-application\/funding-application\/77\/audit-trail(\?|$)/

const EVENTS = [
  {
    id: 2, event: 'status_changed', event_label: 'Status changed', occurred_at: '2026-11-03T10:00:00Z',
    actor: { id: 1, name: 'Hana Host', type: 'Admin' }, ip_address: '10.0.0.1', user_agent: null,
    changes: [{ field: 'status', label: 'Status', old: 'Submitted', new: 'Underwriting Review' }],
    context: {}, file: null, is_legacy: false, hash: 'h2',
  },
  {
    id: 1, event: 'signed_copy_kept', event_label: 'Signed copy kept', occurred_at: '2026-11-02T09:00:00Z',
    actor: { id: 5, name: 'Pat Partner', type: 'Partner' }, ip_address: '10.0.0.2', user_agent: null,
    changes: [], context: { name: 'Signed application.pdf', file_type: 'application_pdf' },
    file: { sha256: 'c'.repeat(64), downloadable: true, label: 'Application PDF' }, is_legacy: false, hash: 'h1',
  },
]

function trail(integrity = { valid: true, broken_at: null as number | null, checked: 2 }) {
  return {
    status: true,
    data: EVENTS,
    pagination: { total: 2, per_page: 25, current_page: 1, last_page: 1 },
    integrity,
  }
}

async function openTrail(page: Page, user = {}, body: unknown = trail()): Promise<ApiMock> {
  await seedSession(page, { permissions: ['view funding application'], ...user })
  const api = await mockApi(page, [{ method: 'GET', match: TRAIL, body }])
  await page.goto('/intake-review/funding-application/77/audit-history')
  return api
}

test.describe('Funding application › Audit Trail', () => {
  test('the host reads who changed what, before and after, newest first', async ({ page }) => {
    await openTrail(page)

    await expect(page.getByRole('heading', { name: 'Audit Trail' })).toBeVisible()
    const rows = page.locator('tr.audit-event-row')
    await expect(rows).toHaveCount(2)
    await expect(rows.first()).toContainText('Status changed')
    await expect(rows.first()).toContainText('Hana Host')
    await expect(rows.first().getByTestId('audit-change-status')).toContainText('Submitted')
    await expect(rows.first().getByTestId('audit-change-status')).toContainText('Underwriting Review')
    await expect(page.getByText('Integrity verified (2)')).toBeVisible()
  })

  test('a partner reads its own application’s trail', async ({ page }) => {
    await openTrail(page, { user_type: 'Partner', is_host: 0, partner_id: 2, name: 'Pat Partner' })

    await expect(page).toHaveURL(/\/funding-application\/77\/audit-history$/)
    await expect(page.locator('tr.audit-event-row')).toHaveCount(2)
  })

  test('says where the chain broke when an event was changed outside the application', async ({ page }) => {
    await openTrail(page, {}, trail({ valid: false, broken_at: 1, checked: 0 }))

    await expect(page.getByText(/Integrity check failed at event #1/)).toBeVisible()
  })

  test('filtering by event asks the API for that event', async ({ page }) => {
    const api = await openTrail(page)
    await expect(page.locator('tr.audit-event-row')).toHaveCount(2)

    await page.locator('.audit-event-filter').click()
    await page.locator('.p-dropdown-panel').getByRole('option', { name: 'Downloaded' }).click()
    await page.getByRole('button', { name: 'Filters' }).click()

    await expect.poll(() => api.find('GET', TRAIL).some((call) => call.path.includes('event=downloaded'))).toBe(true)
  })

  // R3-BUG-051: no way to read the trail oldest first.
  test('sorting oldest first asks the API for that order at once', async ({ page }) => {
    const api = await openTrail(page)
    await expect(page.locator('tr.audit-event-row')).toHaveCount(2)
    expect(api.find('GET', TRAIL)[0].path).toContain('sort_dir=desc')

    await page.locator('.audit-sort-filter').click()
    await page.locator('.p-dropdown-panel').getByRole('option', { name: 'Oldest first' }).click()

    await expect.poll(() => api.find('GET', TRAIL).some((call) => call.path.includes('sort_dir=asc'))).toBe(true)
  })

  // R3-BUG-051: a search that found nothing said "No audit events recorded yet".
  test('a search that finds nothing says so, not that nothing was recorded', async ({ page }) => {
    const api = await openTrail(page)
    await expect(page.locator('tr.audit-event-row')).toHaveCount(2)
    api.add({
      method: 'GET',
      match: /\/audit-trail\?.*search=/,
      body: { ...trail(), data: [], pagination: { total: 0, per_page: 25, current_page: 1, last_page: 1 } },
    })

    await page.getByRole('textbox', { name: 'Search the audit trail' }).fill('Nothing like this')
    await page.getByRole('button', { name: 'Filters' }).click()

    await expect(page.getByText('No audit events match your search or filter.')).toBeVisible()
    await expect(page.getByText('No audit events recorded yet')).toHaveCount(0)
  })

  test('exports the trail as CSV', async ({ page }) => {
    const api = await openTrail(page)
    api.add({ method: 'GET', match: /\/audit-trail\/export/, body: 'Date (UTC),Event\n' })

    await page.getByRole('button', { name: /^Actions/ }).click()
    await page.getByRole('button', { name: 'Export CSV' }).click()

    await expect.poll(() => api.find('GET', /\/audit-trail\/export/).length).toBe(1)
    expect(api.find('GET', /\/audit-trail\/export/)[0].path).toContain('format=csv')
  })

  test('exports the trail as PDF', async ({ page }) => {
    const api = await openTrail(page)
    api.add({ method: 'GET', match: /\/audit-trail\/export/, body: '%PDF' })

    await page.getByRole('button', { name: /^Actions/ }).click()
    await page.getByRole('button', { name: 'Export PDF' }).click()

    await expect.poll(() => api.find('GET', /\/audit-trail\/export/).length).toBe(1)
    expect(api.find('GET', /\/audit-trail\/export/)[0].path).toContain('format=pdf')
  })

  test('downloads the signed copy the trail kept', async ({ page }) => {
    const api = await openTrail(page)
    api.add({ method: 'GET', match: /\/audit-trail\/1\/file/, body: '%PDF' })

    await page.locator('tr.audit-event-row').nth(1).getByRole('button', { name: 'Download file' }).click()

    await expect.poll(() => api.find('GET', /\/audit-trail\/1\/file/).length).toBe(1)
  })

  test('is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/intake-review/funding-application/77/audit-history')

    await expect(page).toHaveURL(/access-denied/)
  })
})
