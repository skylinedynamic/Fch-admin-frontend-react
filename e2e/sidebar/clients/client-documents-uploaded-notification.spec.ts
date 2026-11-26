import { test, expect } from '@playwright/test'
import { expectCall, mockApi, ok, seedSession } from '../../support/helpers'

// A client document upload rings the bell of the client's partner, the host
// and the assigned staff ("<uploader> uploaded 1 document(s) for <client>.").
// Clicking it opens that client. Who is told, and the link, come from fch-api
// (DocumentUploadNotificationsTest); this checks the portal follows the link.
const CLIENT_ID = 9

const NOTIFICATION = {
  id: 'n-doc-1',
  type: 'partner.documents.uploaded',
  title: 'New documents uploaded',
  body: 'Partner Owner uploaded 1 document(s) for Odessa Mccall.',
  url: `/clients/${CLIENT_ID}`,
  icon: 'ri-folder-upload-line',
  category: 'document',
  is_read: false,
  read_at: null,
  created_at: '2026-11-26T10:00:00Z',
}

test('the documents-uploaded notification opens the client', async ({ page }) => {
  await seedSession(page, { permissions: ['view clients', 'update clients'] })
  const api = await mockApi(page, [
    {
      method: 'GET',
      match: '/common/notifications?',
      body: ok([NOTIFICATION], 'ok', { meta: { current_page: 1, last_page: 1, per_page: 5, total: 1, unread_count: 1 } }),
    },
    { method: 'GET', match: '/common/notifications/unread-count', body: ok({ unread_count: 1 }) },
    {
      method: 'GET',
      match: `/common/borrowers/${CLIENT_ID}`,
      body: ok({ id: CLIENT_ID, first_name: 'Odessa', last_name: 'Mccall', email: 'odessa@example.test', status: 'Active' }),
    },
  ])
  await page.goto('/')

  await page.getByRole('button', { name: /notifications, 1 unread/i }).click()
  await page.getByText(NOTIFICATION.body).click()

  await expect(page).toHaveURL(new RegExp(`/clients/${CLIENT_ID}$`))
  await expectCall(api, 'GET', `/common/borrowers/${CLIENT_ID}`)
  await expect(page.getByText('Client Not Found')).toHaveCount(0)
})
