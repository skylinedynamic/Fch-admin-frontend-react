import { test, expect } from '../../support/live/fixtures'

// Real API, nothing sent. Partners › a partner › Activity › New Email, as the
// host: "Sending from" shows that partner's own address, with the switch to the
// host's. Needs a local partner other than the host (E2E_PARTNER_ID, default 53).
const PARTNER_ID = process.env.E2E_PARTNER_ID || '53'

test("Partners › New Email (live): Sending from is that partner, and the switch the host", async ({ page }) => {
  const sender = page.waitForResponse((r) => r.url().includes('/common/activity-logs/email-sender'))
  await page.goto(`/partners/${PARTNER_ID}`)
  await page.getByRole('button', { name: /New Email/ }).first().click()
  const modal = page.locator('#emailComposeModal.show')
  const response = await sender
  const { data } = await response.json()
  expect(new URL(response.url()).searchParams.get('partner_id')).toBe(PARTNER_ID)

  const from = modal.getByTestId('email-from')
  await expect(from).toContainText(data.options.partner.name)
  await modal.screenshot({ path: 'test-results/partner-new-email-from.png' })
  await modal.getByRole('switch', { name: "Send from the host's email" }).check()
  await expect(from).toContainText(data.options.host.name)
})
