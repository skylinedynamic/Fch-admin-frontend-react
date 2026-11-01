import { test, expect } from '@playwright/test'
import { mockApi, ok, seedSession } from '../../support/helpers'

// BUG-140: a paid client's Enrollment Details showed the Partner Invoice as
// $800.00 while the note under it said "$0.00 is automatically charged to the
// Partner". Both now say the partner's fee.

const CLIENT = {
  id: 159, first_name: 'QA-TEST R2', last_name: 'Wanda', email: 'r2@example.test', phone_number: '(222) 222-2222',
  partner_id: 2, status: 'active', country: 'United States', business_country: 'United States', is_free_trail: 0,
  enrollment_details: {
    enrollment_type: 'One Time Payment',
    payable_amount: 2497,
    payable_amount_formatted: '$2,497.00',
    borrower_fee_amount: 800,
    borrower_fee_amount_formatted: '$800.00',
  },
}

test("a paid client's enrollment note names the same partner fee as the Partner Invoice", async ({ page }) => {
  await seedSession(page, { is_host: 0, partner_type: 'White-Label Partner (WL)', permissions: ['view clients', 'update clients'] })
  await mockApi(page, [
    { method: 'GET', match: /\/common\/borrowers\/159$/, body: ok(CLIENT) },
    { method: 'POST', match: '/common/activity-logs/fetch-all-activities', body: ok([]) },
  ])
  await page.goto('/clients/159')

  const note = page.getByText(/two completely separate invoices are created/i)
  await expect(note).toContainText('$800.00 is automatically charged to the Partner account')
  await expect(note).not.toContainText('$0.00')
})
