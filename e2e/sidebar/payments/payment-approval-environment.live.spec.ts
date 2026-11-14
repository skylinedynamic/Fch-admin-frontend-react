import { test, expect } from '../../support/live/fixtures'
import { seedProcessingManualPayment } from '../../support/live/backend'

// BUG-180: before approving or rejecting a manual payment, the approver sees
// whether it is recorded as Sandbox (test money) or Production (live money).
// The seeded Cash payment stays Processing: every dialog is cancelled.
test.describe('Payments › approval environment (live)', () => {
  test.describe.configure({ mode: 'serial' })

  for (const [mode, label] of [['sandbox', 'Sandbox'], ['production', 'Production']] as const) {
    test(`a ${label} manual payment says so before approve and reject`, async ({ page }) => {
      const id = seedProcessingManualPayment(mode)

      await page.goto(`/payments/${id}`)
      const panel = page.locator('.rounded.bg-warning').filter({ hasText: 'Payment Approval & Decision' })
      await expect(panel.getByTestId('payment-environment-notice')).toContainText(new RegExp(`Recorded in\\s*${label}`, 'i'))

      await panel.getByRole('button', { name: /approve payment/i }).click()
      const approveModal = page.locator('.modal.show').filter({ hasText: 'Confirm Payment Approval' })
      await expect(approveModal.getByTestId('payment-environment-notice')).toContainText(new RegExp(`Recorded in\\s*${label}`, 'i'))
      await approveModal.getByRole('button', { name: 'Cancel' }).click()
      await expect(approveModal).toBeHidden()

      await panel.getByPlaceholder(/Enter approval details/).fill('E2E check only - cancelled')
      await panel.getByRole('button', { name: /reject payment/i }).click()
      const rejectModal = page.locator('.modal.show').filter({ hasText: 'Confirm Payment Rejection' })
      await expect(rejectModal.getByTestId('payment-environment-notice')).toContainText(new RegExp(`Recorded in\\s*${label}`, 'i'))
      await rejectModal.getByRole('button', { name: 'Cancel' }).click()
      await expect(rejectModal).toBeHidden()
    })
  }
})
