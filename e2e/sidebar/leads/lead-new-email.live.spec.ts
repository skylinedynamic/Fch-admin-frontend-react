import { test, expect } from '../../support/live/fixtures'

// Real API, nothing sent. Leads › a partner's lead › Activity › New Email, as
// the host: "Sending from" shows the lead's partner's address, with the switch
// to the host's. Needs a local lead of a partner other than the host
// (E2E_PARTNER_LEAD_ID, default 236).
const LEAD_ID = process.env.E2E_PARTNER_LEAD_ID || '236'

test("Leads › New Email (live): Sending from is the lead's partner, and the switch the host", async ({ page }) => {
  const sender = page.waitForResponse((r) => r.url().includes('/common/activity-logs/email-sender'))
  // The sidebar takes the lead's partner from the loaded lead.
  const lead = page.waitForResponse((r) => r.url().split('?')[0].endsWith(`/common/leads/${LEAD_ID}`) && r.request().method() === 'GET')
  await page.goto(`/leads/${LEAD_ID}`)
  await lead
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: /New Email/ }).first().click()
  const modal = page.locator('#emailComposeModal.show')
  const response = await sender
  const { data } = await response.json()
  expect(new URL(response.url()).searchParams.get('partner_id')).toBeTruthy()

  const from = modal.getByTestId('email-from')
  await expect(from).toContainText('Sending from')
  await expect(from).toContainText(data.options.partner.name)
  await modal.getByRole('switch', { name: "Send from the host's email" }).check()
  await expect(from).toContainText(data.options.host.name)
})
