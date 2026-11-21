import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession } from '../../support/helpers'

/**
 * Clients › a client: the details tabs stay on one line like the partner
 * profile's; on a narrow screen the rest go into More. The API is mocked.
 */
const B = '/common/borrowers'
const CLIENT = {
  id: 1, first_name: 'Johnathan', last_name: 'Smithfield', business_name: 'Smithfield Bakery LLC', email: 'john@example.test',
  phone_number: '(222) 222-2222', status: 'Active', partner_id: 2, has_sign: true,
}

async function openClient(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 })
  await seedSession(page, { permissions: ['view clients', 'update clients'] })
  await mockApi(page, [{ method: 'GET', match: new RegExp(`${B}/1$`), body: ok(CLIENT) }])
  await page.goto('/clients/1')
  await expect(page.locator('#first_name')).toHaveValue('Johnathan')
  return page.getByRole('tablist', { name: 'Client sections' })
}

test.describe('Client details - tabs on one line', () => {
  test('a narrow screen keeps the tabs on one line and opens the rest from More', async ({ page }) => {
    const tabs = await openClient(page, 1280)
    const more = page.getByRole('button', { name: /^More \(\d+ more tabs?\)$/ })
    await expect(more).toBeVisible()

    const tops = await tabs.getByRole('tab').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))
    expect(new Set(tops).size).toBe(1)

    await more.click()
    await page.getByRole('menu', { name: 'More tabs' }).getByRole('menuitem', { name: 'Agreement' }).click()

    await expect(tabs.getByRole('tab', { name: 'Agreement' })).toHaveAttribute('aria-selected', 'true')
  })

  test('a wide screen shows every tab with no More, and tabs show a pointer', async ({ page }) => {
    const tabs = await openClient(page, 3840)

    await expect(tabs.getByRole('tab', { name: 'Agreement' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^More \(\d+ more tabs?\)$/ })).toHaveCount(0)
    const tab = tabs.getByRole('tab', { name: 'Documents' })
    await tab.hover()
    expect(await tab.evaluate((el) => getComputedStyle(el).cursor)).toBe('pointer')
  })
})
