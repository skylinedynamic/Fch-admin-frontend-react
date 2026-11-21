import { test, expect, type Locator, type Page } from '@playwright/test'
import { mockApi, ok, seedSession } from '../../support/helpers'

/**
 * Client detail › Activity log: a sent email and a logged event show only who
 * created them and when on their row - no To / Subject, no event date.
 * Opening the row shows the full details. The API is mocked; nothing is written.
 */
const CLIENT = { id: 1, first_name: 'Johnathan', last_name: 'Smithfield', business_name: 'Smithfield Bakery LLC', email: 'borrower@example.test', partner_id: 2, status: 'active' }

const at = (time: string) => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${time}`
}

const EMAIL = {
  id: 1, log_type: 'Email Sent', log_type_raw: 'email', event_label: 'Email Sent', causer_name: 'Host Admin',
  to_emails: ['xekased@mailinator.com'], subject: 'Domain activation process', description: 'Please point your domain at us.',
  created_at: at('17:37:00'), attachments: [],
}

const EVENT = {
  id: 2, log_type: 'Activity Created', log_type_raw: 'activity', event_label: 'Activity Created', causer_name: 'Host Admin',
  reference: 'Meeting', subject: 'Kick-off', description: 'Walk through the funding options',
  activity_date: at('18:30:00'), assigned_user: { id: 5, name: 'Sam Staff' }, created_at: at('17:00:00'), attachments: [],
}

const HOST_IMG = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E#host'
const PARTNER_IMG = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E#partner'

async function openClient(page: Page, rows: unknown[] = [EMAIL, EVENT]) {
  await seedSession(page, { permissions: ['view clients', 'create clients', 'update clients'] })
  await mockApi(page, [
    { method: 'GET', match: /\/common\/borrowers\/1$/, body: ok(CLIENT) },
    { method: 'POST', match: '/common/activity-logs/fetch-all-activities', body: ok(rows) },
  ])
  await page.goto('/clients/1')
}

const entry = (page: Page, title: string): Locator => page.locator('.accordion-item').filter({ has: page.getByText(title, { exact: true }) })

test.describe('Client activity log - email and event rows', () => {
  test('an email row shows who sent it and when; opening it shows To, Subject and the message', async ({ page }) => {
    await openClient(page)
    const email = entry(page, 'Email Sent')
    const row = email.locator('.accordion-button')

    await expect(row).toContainText('by Host Admin')
    await expect(row).toContainText('Today at 05:37 PM')
    await expect(row).not.toContainText('To:')
    await expect(row).not.toContainText('Subject:')

    await row.click()
    const body = email.locator('.accordion-body')
    await expect(body.getByText('xekased@mailinator.com')).toBeVisible()
    await expect(body.getByText('Domain activation process')).toBeVisible()
    await expect(body.getByText('Please point your domain at us.')).toBeVisible()
  })

  test('an event row shows its name, who created it and when; opening it shows its details', async ({ page }) => {
    await openClient(page)
    const event = entry(page, 'Meeting: Kick-off')
    const row = event.locator('.accordion-button')

    await expect(row).toContainText('by Host Admin')
    await expect(row).toContainText('Today at 05:00 PM')
    await expect(row).not.toContainText('06:30 PM')

    await row.click()
    const body = event.locator('.accordion-body')
    await expect(body.getByText('Meeting', { exact: true })).toBeVisible()
    await expect(body.getByText('Today at 06:30 PM')).toBeVisible()
    await expect(body.getByText('Sam Staff')).toBeVisible()
    await expect(body.getByText('Walk through the funding options')).toBeVisible()
  })

  // Meeting / Task / email entries keep their own icon; any other entry shows who did it.
  test('an entry shows the image of who did it, not the record partner on every entry', async ({ page }) => {
    const update = { log_type: 'Partner Updated', log_type_raw: 'partner_update', created_at: at('09:00:00'), attachments: [], partner_image: PARTNER_IMG }
    await openClient(page, [
      { ...update, id: 3, event_label: 'Updated by the partner', causer: { id: 7, name: 'Acme Lending' }, causer_name: 'Acme Lending', causer_image: PARTNER_IMG },
      { ...update, id: 4, event_label: 'Updated by the host', causer: { id: 1, name: 'Host Admin' }, causer_name: 'Host Admin', causer_image: HOST_IMG },
    ])

    await expect(entry(page, 'Updated by the partner').locator('.accordion-button img').first()).toHaveAttribute('src', PARTNER_IMG)
    await expect(entry(page, 'Updated by the host').locator('.accordion-button img').first()).toHaveAttribute('src', HOST_IMG)
  })

  test('the row keeps who, when and visibility on one line; the reminder status is in the body', async ({ page }) => {
    const task = {
      ...EVENT, id: 5, reference: 'Task', subject: 'This is activity summary',
      visibility: 'private', is_manual: true, is_owner: true, can_edit: true, can_delete: true, reminder_status: 'Dismissed',
    }
    await openClient(page, [task])
    const item = entry(page, 'Task: This is activity summary')

    const meta = item.locator('.activity-entry-meta')
    await expect(meta).toContainText('by Host Admin')
    await expect(meta).toContainText('Private')
    await expect(meta).not.toContainText('Dismissed')
    expect((await meta.boundingBox())!.height).toBeLessThan(26)

    // Edit / Delete are small.
    const edit = item.getByRole('button', { name: 'Edit activity' })
    expect((await edit.boundingBox())!.height).toBeLessThanOrEqual(24)

    await item.locator('.accordion-button').click()
    await expect(item.locator('.accordion-body')).toContainText('Dismissed')
  })
})
