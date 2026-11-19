import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession } from '../../support/helpers'

/**
 * Partners › a partner: the profile's tabs stay on one line. On a narrow
 * screen the ones that do not fit go into More, which lists them; picking one
 * opens it on the line. Mail Notification shows its two recipient fields.
 * The API is mocked; nothing is written.
 */
const PARTNER = {
  id: 21, user_id: 77, company_name: 'Pentagon Funding Group', full_name: 'Pat Partner',
  partner_type: 'White-Label Partner (WL)', is_host: false, has_sign: true,
}

async function openPartner(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 })
  await seedSession(page, { id: 1, is_host: 1, partner_id: 1, entity_type: 'Partner', permissions: ['view partners', 'update partners'] })
  await mockApi(page, [{ method: 'GET', match: `/admin/partners-details/${PARTNER.id}`, body: ok(PARTNER) }])
  await page.goto(`/partners/${PARTNER.id}`)
  const tabs = page.getByRole('tablist', { name: 'Partner sections' })
  await expect(tabs).toBeVisible()
  return tabs
}

test.describe('Partner profile - tabs on one line', () => {
  test('a wide screen shows every tab, Mail Notification included, with no More', async ({ page }) => {
    const tabs = await openPartner(page, 2400)

    await expect(tabs.getByRole('tab', { name: 'Mail Notification' })).toBeVisible()
    await expect(page.getByRole('button', { name: /^More \(\d+ more tabs?\)$/ })).toHaveCount(0)
  })

  test('a narrow screen keeps the tabs on one line and lists the rest under More', async ({ page }) => {
    const tabs = await openPartner(page, 1280)
    const more = page.getByRole('button', { name: /^More \(\d+ more tabs?\)$/ })
    await expect(more).toBeVisible()

    // One line: every tab on the line sits at the same height.
    const tops = await tabs.getByRole('tab').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))
    expect(new Set(tops).size).toBe(1)

    await more.click()
    const menu = page.getByRole('menu', { name: 'More tabs' })
    await expect(menu).toBeVisible()
    await menu.getByRole('menuitem', { name: 'Mail Notification' }).click()

    await expect(menu).toHaveCount(0)
    await expect(tabs.getByRole('tab', { name: 'Mail Notification' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByLabel('Lead Notification Recipient')).toBeVisible()
    await expect(page.getByLabel('Client Notification Recipient')).toBeVisible()
  })

  test('tabs show a pointer when hovered', async ({ page }) => {
    const tabs = await openPartner(page, 2400)
    const tab = tabs.getByRole('tab', { name: 'Documents' })

    await tab.hover()

    expect(await tab.evaluate((el) => getComputedStyle(el).cursor)).toBe('pointer')
  })

  test('More closes on Escape', async ({ page }) => {
    await openPartner(page, 1280)
    await page.getByRole('button', { name: /^More \(\d+ more tabs?\)$/ }).click()
    await expect(page.getByRole('menu', { name: 'More tabs' })).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(page.getByRole('menu', { name: 'More tabs' })).toHaveCount(0)
  })
})
