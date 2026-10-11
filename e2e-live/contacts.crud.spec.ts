import { test, expect } from '@playwright/test'
import { api, requireCredentials, requireWrites, sessionToken, trackServerErrors } from './env'
import { LIVE_AUTH_FILE } from './paths'

/**
 * A full create -> read -> update -> delete round trip through the real UI
 * and the real API. It writes to the database, so it only runs when
 * E2E_LIVE_ALLOW_WRITES=1, and it removes what it created even if a step fails.
 */
test.describe.serial('Live - contact CRUD round trip', () => {
  const stamp = Date.now()
  const name = `E2E Contact ${stamp}`
  const email = `e2e.contact.${stamp}@example.test`
  let createdId: number | string | null = null

  test.beforeEach(() => {
    requireCredentials()
    requireWrites()
  })

  test.afterAll(async ({ browser }) => {
    if (!createdId) return
    // Safety net: remove the record if the delete step did not get to run.
    const context = await browser.newContext({ storageState: LIVE_AUTH_FILE })
    const page = await context.newPage()
    try {
      const token = await sessionToken(page)
      await api(context.request, token, 'POST', '/common/contacts/multiple-delete', { ids: [createdId] })
    } finally {
      await context.close()
    }
  })

  test('creates a contact through the form', async ({ page }) => {
    const serverErrors = trackServerErrors(page)
    await page.goto('/contacts/create')
    test.skip(!page.url().includes('/contacts/create'), 'The signed-in account cannot create contacts.')

    await page.locator('input[name="full_name"]').fill(name)
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="mobile_number"]').fill('5551234567')

    const created = page.waitForResponse((r) => /\/common\/contacts$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST')
    await page.getByRole('button', { name: /save/i }).click()
    const response = await created
    expect(response.status(), await response.text()).toBeLessThan(300)
    createdId = (await response.json())?.data?.id ?? null

    await expect(page.getByText('Contact created successfully')).toBeVisible()
    await expect(page).toHaveURL(/\/contacts$/)
    expect(serverErrors).toEqual([])
  })

  test('finds it in the list by searching', async ({ page }) => {
    await page.goto('/contacts')
    await page.getByPlaceholder('Search here...').fill(email)
    await page.getByRole('button', { name: /filters/i }).click()
    await expect(page.getByText(email)).toBeVisible()
  })

  test('edits it and the change is saved by the API', async ({ page }) => {
    test.skip(!createdId, 'The create step did not return an id.')
    await page.goto(`/contacts/${createdId}`)
    await expect(page.locator('input[name="full_name"]')).toHaveValue(name)

    await page.locator('input[name="company_name"]').fill('E2E Company')
    const updated = page.waitForResponse((r) => r.url().includes(`/common/contacts/${createdId}`) && r.request().method() === 'PUT')
    await page.getByRole('button', { name: /update/i }).click()
    expect((await updated).status()).toBeLessThan(300)
    await expect(page.getByText('Contact updated successfully')).toBeVisible()

    // Reload from the server rather than trusting the form state.
    await page.goto(`/contacts/${createdId}`)
    await expect(page.locator('input[name="company_name"]')).toHaveValue('E2E Company')
  })

  test('the real validator rejects a duplicate email', async ({ page }) => {
    await page.goto('/contacts/create')
    test.skip(!page.url().includes('/contacts/create'), 'The signed-in account cannot create contacts.')
    await page.locator('input[name="full_name"]').fill(`${name} Copy`)
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="mobile_number"]').fill('5551234567')

    const response = page.waitForResponse((r) => /\/common\/contacts$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST')
    await page.getByRole('button', { name: /save/i }).click()
    const res = await response
    // Not every deployment enforces unique contact emails; if this one accepts
    // the duplicate, clean it up and say so instead of failing.
    if (res.status() < 300) {
      const duplicateId = (await res.json())?.data?.id
      if (duplicateId) await api(page.request, await sessionToken(page), 'POST', '/common/contacts/multiple-delete', { ids: [duplicateId] })
      test.skip(true, 'This API accepts duplicate contact emails.')
    }
    expect(res.status()).toBe(422)
    await expect(page).toHaveURL(/\/contacts\/create/)
    await expect(page.locator('.invalid-feedback:visible').first()).toBeVisible()
  })

  test('deletes it from the list', async ({ page }) => {
    await page.goto('/contacts')
    await page.getByPlaceholder('Search here...').fill(email)
    await page.getByRole('button', { name: /filters/i }).click()
    await expect(page.getByText(email)).toBeVisible()

    await page.locator('.p-datatable-tbody .p-checkbox').first().click()
    await page.locator('.dropdown-toggle-split').first().click()
    await page.getByRole('button', { name: /delete selected/i }).click()

    const deleted = page.waitForResponse((r) => r.url().includes('/common/contacts/multiple-delete'))
    await page.locator('.modal.show').getByRole('button', { name: 'Yes, Delete It' }).click()
    expect((await deleted).status()).toBeLessThan(300)
    createdId = null

    await expect(page.getByText(email)).toHaveCount(0)
  })
})
