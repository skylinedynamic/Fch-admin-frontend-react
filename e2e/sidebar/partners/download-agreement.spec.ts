import { test, expect, type Page } from '@playwright/test'
import { expectCall, mockApi, ok, seedSession } from '../../support/helpers'

// BUG-106: View Agreement (/partners/download-agreement/:userId) went to the
// 404 page when there was no signed copy. Now it says so - and, for a record
// marked as signed whose copy is missing, offers Re-sign.

async function openAgreement(page: Page, data: { content_html: string; has_sign: boolean }) {
  await seedSession(page, { permissions: ['view partners', 'update partners'] })
  const api = await mockApi(page, [
    { method: 'GET', match: '/common/agreement-sign/html/221', body: ok(data) },
    { method: 'POST', match: '/common/agreement-sign/cancel/221', body: ok(null, 'Agreement cancelled successfully') },
  ])
  await page.goto('/partners/download-agreement/221')
  return api
}

test.describe('View Agreement without a signed copy (BUG-106)', () => {
  test('a partner who never signed sees "No signed agreement", not a 404 page', async ({ page }) => {
    await openAgreement(page, { content_html: '', has_sign: false })

    await expect(page.getByRole('heading', { name: 'No signed agreement' })).toBeVisible()
    await expect(page.getByText('404')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Print or Download PDF/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Re-sign' })).toHaveCount(0)
  })

  test('marked signed with the copy missing: Re-sign clears the signed status', async ({ page }) => {
    const api = await openAgreement(page, { content_html: '', has_sign: true })

    const popup = page.locator('.modal.show')
    await expect(popup).toContainText('Signed agreement not found')
    await popup.getByRole('button', { name: 'Re-sign' }).click()

    await expectCall(api, 'POST', '/common/agreement-sign/cancel/221')
    await expect(page.getByRole('heading', { name: 'Re-sign requested' })).toBeVisible()
    await expect(page.locator('.modal.show')).toHaveCount(0)
  })
})
