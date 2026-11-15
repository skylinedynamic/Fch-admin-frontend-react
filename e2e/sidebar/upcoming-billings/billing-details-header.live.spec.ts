import { test, expect } from '../../support/live/fixtures'

// The Billing Details header icon sits on the same light tile for a partner and
// a client (a partner's was solid dark with the icon lost in it, a client's green).
test.describe('Upcoming Billings › details header (live)', () => {
  test('a partner and a client get the same light icon tile', async ({ page }) => {
    const list = page.waitForResponse((r) => r.url().includes('/billing/fetch-upcoming'))
    await page.goto('/billing')
    const rows: { subscription_id: number; subscriber_type: string; billing_row?: string }[] = (await (await list).json()).data
    const partner = rows.find((r) => r.subscriber_type === 'Partner' && r.billing_row !== 'borrower_fee')
    const client = rows.find((r) => r.subscriber_type === 'Borrower')
    test.skip(!partner || !client, 'Needs a partner and a client row')

    const tile = async (id: number) => {
      await page.goto(`/billing/${id}`)
      const el = page.locator('.card-header .avatar-title').first()
      await expect(el.locator('i')).toBeVisible()
      return el.evaluate((node) => ({
        background: getComputedStyle(node).backgroundColor,
        icon: getComputedStyle(node.querySelector('i') as Element).color,
      }))
    }

    const partnerTile = await tile(partner!.subscription_id)
    const clientTile = await tile(client!.subscription_id)

    expect(partnerTile).toEqual(clientTile)
    expect(partnerTile.background).not.toBe(partnerTile.icon)
  })
})
