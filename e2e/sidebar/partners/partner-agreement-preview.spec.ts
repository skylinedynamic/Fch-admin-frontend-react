import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, openProfileTab } from '../../support/helpers'

/**
 * Partners › a partner › Agreement: before the partner signs, the host previews
 * the active partner agreement filled with that partner's details
 * (GET /common/agreement-sign/preview/:userId). None while it is off.
 * The API is mocked; nothing is written.
 */
const PARTNER = {
  id: 21,
  user_id: 77,
  company_name: 'Pentagon Funding Group',
  full_name: 'Pat Partner',
  partner_type: 'White-Label Partner (WL)',
  is_host: false,
  has_sign: false,
  agreement_required: true,
}
const REQUIREMENT = { user_id: 77, agreement_required: true, signing_enabled: true, template_active: true, can_change: true, locked_reason: null }

async function openAgreementTab(page: Page, preview: { status: number; body: unknown }) {
  await seedSession(page, { id: 1, is_host: 1, partner_id: 1, entity_type: 'Partner', permissions: ['view partners', 'update partners'] })
  await mockApi(page, [
    { method: 'GET', match: `/admin/partners-details/${PARTNER.id}`, body: ok(PARTNER) },
    { method: 'GET', match: `/common/agreement-sign/required/${PARTNER.user_id}`, body: ok(REQUIREMENT) },
    { method: 'GET', match: `/common/agreement-sign/preview/${PARTNER.user_id}`, status: preview.status, body: preview.body },
  ])
  await page.goto(`/partners/${PARTNER.id}`)
  await openProfileTab(page, 'Agreement')
  await expect(page.getByText('Agreement signing')).toBeVisible()
}

test.describe('Partner profile - previewing the unsigned agreement', () => {
  test("opens the active partner agreement, filled with the partner's details", async ({ page }) => {
    await openAgreementTab(page, {
      status: 200,
      body: ok({ template_id: 8, slug: 'partner', template_html: '<html><body><p>Dear Pat Partner of Pentagon Funding Group</p></body></html>' }),
    })

    await page.getByRole('button', { name: 'Preview Agreement' }).click()

    const dialog = page.getByRole('dialog', { name: 'Partner agreement preview' })
    await expect(dialog).toBeVisible()
    await expect(page.frameLocator('iframe[title="Partner agreement preview"]').getByText('Dear Pat Partner of Pentagon Funding Group')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
  })

  test('is not offered while the partner agreement is off', async ({ page }) => {
    await openAgreementTab(page, { status: 404, body: { status: false, message: 'There is no active agreement for this partner or client to preview.' } })

    await expect(page.getByText('Awaiting signature')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Preview Agreement' })).toHaveCount(0)
  })
})
