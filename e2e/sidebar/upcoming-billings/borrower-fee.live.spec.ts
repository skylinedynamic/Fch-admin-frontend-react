import { test, expect } from '../../support/live/fixtures'
import { seedUnpaidBorrowerFee } from '../../support/live/backend'

// The host is owed the borrower fee a partner pays to activate a client. While
// unpaid it is listed as the partner's row, naming the client, and opens the
// fee invoice. Read-only: the seeded fee stays Unpaid.
test.describe('Upcoming Billings › borrower fee (live)', () => {
  test('an unpaid borrower fee is the partner\'s row for the client', async ({ page }) => {
    const { invoiceId, partner } = seedUnpaidBorrowerFee()

    await page.goto('/billing')
    const list = page.waitForResponse((r) => r.url().includes('/billing/fetch-upcoming') && (r.request().postData() ?? '').includes('E2E Fee Client'))
    await page.getByPlaceholder('Search by name, email...').fill('E2E Fee Client')
    await page.getByPlaceholder('Search by name, email...').press('Enter')
    const body = await (await list).json()

    const fee = body.data.find((r: { fee_invoice_id?: number }) => r.fee_invoice_id === invoiceId)
    expect(fee).toMatchObject({ billing_row: 'borrower_fee', subscriber_type: 'Partner', subscriber_name: partner, upcoming_billing_type: 'Client Activation Fee', outstanding_amount: 800, status: 'Unpaid' })

    const row = page.locator('tr', { hasText: 'For client: E2E Fee Client' })
    await expect(row).toContainText(partner)
    await expect(row).toContainText('Client Activation Fee')
    await row.getByText(partner).click()
    await expect(page).toHaveURL(new RegExp(`/invoices/${invoiceId}$`))
  })
})
