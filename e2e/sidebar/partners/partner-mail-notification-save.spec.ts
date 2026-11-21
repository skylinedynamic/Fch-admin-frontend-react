import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall } from '../../support/helpers'

/**
 * Partners › a partner › Mail Notification: the host sets where the partner's
 * lead and client emails go (fch-api /admin/partners/{id}/mail-notification).
 * The fields come from the API, one per notification type; an empty one uses
 * the partner's own email. The API is mocked; nothing is written.
 */
const PARTNER = {
  id: 21, user_id: 77, company_name: 'Pentagon Funding Group', full_name: 'Pat Partner', email: 'owner@pentagon.test',
  partner_type: 'White-Label Partner (WL)', is_host: false, has_sign: true,
}

const list = (leads: string | null, clients: string | null) => [
  { type: 'leads', label: 'Lead Notification Recipient', help: 'Gets the email sent when a lead is created.', email: leads },
  { type: 'clients', label: 'Client Notification Recipient', help: 'Gets the email sent when a client is added.', email: clients },
]

async function openTab(page: Page, saved = list(null, null)) {
  await page.setViewportSize({ width: 2400, height: 900 })
  await seedSession(page, { id: 1, is_host: 1, partner_id: 1, entity_type: 'Partner', permissions: ['view partners', 'update partners'] })
  const api = await mockApi(page, [
    { method: 'GET', match: `/admin/partners-details/${PARTNER.id}`, body: ok(PARTNER) },
    { method: 'GET', match: `/admin/partners/${PARTNER.id}/mail-notification`, body: ok(saved) },
  ])
  await page.goto(`/partners/${PARTNER.id}?tab=mailNotification`)
  await expect(page.getByLabel('Lead Notification Recipient')).toBeVisible()
  return api
}

const HOST = { ...PARTNER, id: 1, company_name: 'Four Corner Funding', email: 'host@fch.test', is_host: true }

const hostList = (partners: string | null) => [
  { type: 'partners', label: 'Partner Notification Recipient', help: "Gets the email sent when the host's staff add a partner.", email: partners },
  ...list(null, null),
]

const saveButton = (page: Page) => page.getByRole('button', { name: 'Save Mail Notification' })

test.describe('Partner profile - Mail Notification', () => {
  test('shows the saved recipients and says the partner email is used for an empty one', async ({ page }) => {
    await openTab(page, list('leads@pentagon.test', null))

    await expect(page.getByLabel('Lead Notification Recipient')).toHaveValue('leads@pentagon.test')
    await expect(page.getByLabel('Client Notification Recipient')).toHaveValue('')
    await expect(page.getByText(/owner@pentagon\.test/).first()).toBeVisible()
    await expect(saveButton(page)).toBeDisabled()
  })

  test('saves the recipients, an emptied one as null, and confirms it', async ({ page }) => {
    const api = await openTab(page, list('leads@pentagon.test', null))
    api.add({ method: 'PUT', match: `/admin/partners/${PARTNER.id}/mail-notification`, body: ok(list(null, 'clients@pentagon.test'), 'Mail notification recipients updated successfully.') })

    await page.getByLabel('Lead Notification Recipient').fill('')
    await page.getByLabel('Client Notification Recipient').fill('clients@pentagon.test')
    await saveButton(page).click()

    const call = await expectCall(api, 'PUT', `/admin/partners/${PARTNER.id}/mail-notification`)
    expect(call.json).toEqual({ recipients: { leads: null, clients: 'clients@pentagon.test' } })
    await expect(page.locator('.Toastify__toast', { hasText: 'Mail notification recipients updated successfully.' })).toBeVisible()
    await expect(saveButton(page)).toBeDisabled()
  })

  test('a refused address is shown under its field, with no toast', async ({ page }) => {
    const api = await openTab(page)
    api.add({
      method: 'PUT',
      match: `/admin/partners/${PARTNER.id}/mail-notification`,
      status: 422,
      body: failure('Invalid', { 'recipients.leads': 'The Lead Notification Recipient field must be a valid email address.' }),
    })

    await page.getByLabel('Lead Notification Recipient').fill('leads@pentagon')
    await saveButton(page).click()

    await expect(page.getByText('The Lead Notification Recipient field must be a valid email address.')).toBeVisible()
    await expect(page.locator('.Toastify__toast')).toHaveCount(0)
  })

  test("the host's own profile lists the Partner Notification Recipient first and saves it", async ({ page }) => {
    await page.setViewportSize({ width: 2400, height: 900 })
    await seedSession(page, { id: 1, is_host: 1, partner_id: 1, entity_type: 'Partner', permissions: ['view partners', 'update partners'] })
    const api = await mockApi(page, [
      { method: 'GET', match: `/admin/partners-details/${HOST.id}`, body: ok(HOST) },
      { method: 'GET', match: `/admin/partners/${HOST.id}/mail-notification`, body: ok(hostList(null)) },
    ])
    await page.goto(`/partners/${HOST.id}?tab=mailNotification`)

    const fields = page.locator('form#partner-mail-notification-form input[type="email"]')
    await expect(fields).toHaveCount(3)
    await expect(fields.first()).toHaveAttribute('name', 'partners')

    api.add({ method: 'PUT', match: `/admin/partners/${HOST.id}/mail-notification`, body: ok(hostList('partners@fch.test'), 'Mail notification recipients updated successfully.') })
    await page.getByLabel('Partner Notification Recipient').fill('partners@fch.test')
    await saveButton(page).click()

    const call = await expectCall(api, 'PUT', `/admin/partners/${HOST.id}/mail-notification`)
    expect(call.json).toEqual({ recipients: { partners: 'partners@fch.test', leads: null, clients: null } })
  })
})
