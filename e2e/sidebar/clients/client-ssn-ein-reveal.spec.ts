import { test, expect, type Page, type Request } from '@playwright/test'
import { mockApi, ok, seedSession, expectCall } from '../../support/helpers'

/**
 * BUG-014: Client Info shows the SSN and Business EIN masked, as the API now
 * sends them. Each eye button fetches its number in full (POST
 * borrowers/{id}/reveal naming the field); a save without revealing sends
 * neither, so the numbers on file stay.
 */

const B = '/common/borrowers'
const CLIENT = {
  id: 1, first_name: 'Kim', last_name: 'Saunders', business_name: 'Saunders LLC', email: 'kim@example.test',
  phone_number: '(222) 222-2222', status: 'Active', partner_id: 2,
  ssn: '***-**-6456', business_ein: '**-***6546',
}
const FULL: Record<string, string> = { ssn: '546456456', business_ein: '546546546' }

async function openClient(page: Page) {
  await seedSession(page, { permissions: ['view clients', 'update clients'] })
  const api = await mockApi(page, [
    { method: 'GET', match: new RegExp(`${B}/1$`), body: ok(CLIENT) },
    { method: 'POST', match: new RegExp(`${B}/1$`), body: ok(CLIENT) },
    {
      method: 'POST',
      match: `${B}/1/reveal`,
      body: (req: Request) => {
        const field = req.postDataJSON()?.field as string
        return ok({ field, value: FULL[field] ?? null })
      },
    },
  ])
  await page.goto('/clients/1')
  await expect(page.locator('#first_name')).toHaveValue('Kim')
  return api
}

test.describe('Client Info - SSN and EIN masked (BUG-014)', () => {
  test('both show masked and read-only, and nothing is revealed on opening', async ({ page }) => {
    const api = await openClient(page)

    await expect(page.locator('#ssn')).toHaveValue('***-**-6456')
    await expect(page.locator('#business_ein')).toHaveValue('**-***6546')
    await expect(page.locator('#business_ein')).toHaveAttribute('readonly', '')
    expect(api.find('POST', `${B}/1/reveal`)).toHaveLength(0)
  })

  test('the EIN eye button reveals the EIN only', async ({ page }) => {
    const api = await openClient(page)

    await page.getByRole('button', { name: 'Show EIN' }).click()

    await expect(page.locator('#business_ein')).toHaveValue('54-6546546')
    await expect(page.locator('#ssn')).toHaveValue('***-**-6456')
    expect(api.find('POST', `${B}/1/reveal`).map((c) => c.json)).toEqual([{ field: 'business_ein' }])
  })

  test('the SSN eye button reveals the SSN, and the eye again hides it', async ({ page }) => {
    await openClient(page)

    await page.getByRole('button', { name: 'Show SSN' }).click()
    await expect(page.locator('#ssn')).toHaveValue('546-45-6456')

    await page.getByRole('button', { name: 'Hide SSN' }).click()
    await expect(page.locator('#ssn')).toHaveValue('***-**-6456')
  })

  test('saving without revealing sends neither number', async ({ page }) => {
    const api = await openClient(page)

    await page.locator('.btn.btn-primary.w-lg', { hasText: 'Update' }).click()
    const save = await expectCall(api, 'POST', new RegExp(`${B}/1$`))

    expect(save.json).not.toHaveProperty('ssn')
    expect(save.json).not.toHaveProperty('business_ein')
  })
})
