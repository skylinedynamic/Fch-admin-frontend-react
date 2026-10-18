import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../../test-utils'
import { useAuthStore } from '../../../../src/store/auth'
import { useConfigStore } from '../../../../src/store/config'
import InvoiceTable from '../../../../src/pages/invoices/components/InvoiceTable'

// The payment itself (Stripe and the rest) is InvoicePaymentModal's own
// business; this stands in for a payment that went through.
vi.mock('../../../../src/pages/invoices/components/InvoicePaymentModal', () => ({
  default: ({ show, onSuccess }: { show: boolean; onSuccess: () => void }) =>
    show ? <button type="button" onClick={onSuccess}>Complete payment</button> : null,
}))

/**
 * Once a partner pays an invoice, the setup list (ConfigurationGuardModal)
 * opens on whatever page they are on, so they go straight on to finishing
 * their settings.
 */
describe('InvoiceTable payment', () => {
  beforeEach(() => {
    useConfigStore.setState({ setupPromptOpen: false } as never)
    useAuthStore.setState({
      token: 't',
      user: { id: 1, name: 'Pat', entity_type: 'Partner', is_host: 0, partner_id: 2, permissions: [] },
      userSubscription: null,
    } as never)
  })

  it('opens the setup list once an invoice is paid', async () => {
    const onRefresh = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <InvoiceTable
        data={[{ id: 7, invoice_id: 'INV-7', status: 'Unpaid', entity_type: 'App\\Models\\Partner\\Partner', payment_amount: 100, displayable_payment_amount: '$100.00' }]}
        loading={false}
        totalRecords={1}
        page={1}
        perPage={10}
        onPage={vi.fn()}
        onSort={vi.fn()}
        onFilter={vi.fn()}
        filters={{}}
        sortField="created_at"
        sortOrder={-1}
        onRefresh={onRefresh}
      />
    )

    await user.click(await screen.findByRole('button', { name: /pay now/i }))
    expect(useConfigStore.getState().setupPromptOpen).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Complete payment' }))

    expect(useConfigStore.getState().setupPromptOpen).toBe(true)
    expect(onRefresh).toHaveBeenCalled()
  })
})
