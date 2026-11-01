import { test, expect } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall } from '../../support/helpers'

// R2 BUG-008: Add Lender saved a second "Kabbage". The API now refuses a
// name already in use (case and spaces aside); the form shows why under the
// name and stays open.

test.describe('Add Lender › a name already in use (R2 BUG-008)', () => {
  test('the refusal shows under Lender Name and nothing is created', async ({ page }) => {
    await seedSession(page, { permissions: ['view lenders', 'create lenders'] })
    const api = await mockApi(page, [
      { method: 'GET', match: '/admin/lenders/product-categories', body: ok([{ id: 1, name: 'Term Loan', status: 'Active' }]) },
      {
        method: 'POST', match: /^\/admin\/lenders$/, status: 422,
        body: failure('A lender with this name already exists.', { name: 'A lender with this name already exists.' }),
      },
    ])
    await page.goto('/lenders/create')

    await page.getByPlaceholder('Enter lender name').fill('Kabbage')
    // The button's name carries its icon glyph (" Save").
    await page.getByRole('button', { name: /save$/i }).click()

    const call = await expectCall(api, 'POST', /^\/admin\/lenders$/)
    expect(call.json).toMatchObject({ name: 'Kabbage' })
    await expect(page.getByText('A lender with this name already exists.')).toBeVisible()
    await expect(page.getByPlaceholder('Enter lender name')).toHaveClass(/is-invalid/)
    await expect(page).toHaveURL(/\/lenders\/create$/)
  })
})
