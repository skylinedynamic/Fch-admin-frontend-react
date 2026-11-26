import { test, expect } from '@playwright/test'
import { expectCall, mockApi, ok, seedSession } from '../../support/helpers'

// Changing a client's Assigned To rings the bell of the client's partner, the
// host ("… changed the assignee of <client> from A to B.") and the new
// assignee ("… assigned <client> to you."). Each opens that client. Who is
// told, and the link, come from fch-api (ClientAssignmentNotificationsTest);
// this checks the portal follows the link.
const CLIENT_ID = 9

const NOTIFICATIONS = [
  {
    type: 'staff.client.assigned',
    title: 'Client assigned to you',
    body: 'Hal Host assigned Odessa Mccall to you.',
  },
  {
    type: 'partner.client.assignee_changed',
    title: 'Client assignment changed',
    body: 'Hal Host changed the assignee of Odessa Mccall from Sam Staff to Nia New.',
  },
]

for (const notification of NOTIFICATIONS) {
  test(`the "${notification.title}" notification opens the client`, async ({ page }) => {
    await seedSession(page, { permissions: ['view clients', 'update clients'] })
    const api = await mockApi(page, [
      {
        method: 'GET',
        match: '/common/notifications?',
        body: ok(
          [{
            id: `n-${notification.type}`,
            ...notification,
            url: `/clients/${CLIENT_ID}`,
            icon: 'ri-user-shared-line',
            category: 'system',
            is_read: false,
            read_at: null,
            created_at: '2026-11-26T10:00:00Z',
          }],
          'ok',
          { meta: { current_page: 1, last_page: 1, per_page: 5, total: 1, unread_count: 1 } }
        ),
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
    await page.getByText(notification.body).click()

    await expect(page).toHaveURL(new RegExp(`/clients/${CLIENT_ID}$`))
    await expectCall(api, 'GET', `/common/borrowers/${CLIENT_ID}`)
    await expect(page.getByText('Client Not Found')).toHaveCount(0)
  })
}
