import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../mocks/server'
import { renderWithProviders } from '../../../test-utils'
import { useAuthStore } from '../../../../src/store/auth'
import { useConfigStore } from '../../../../src/store/config'
import InvoiceTable from '../../../../src/pages/invoices/components/InvoiceTable'

// Bootstrap's transitions run after jsdom has torn the node down; showing a
// modal only needs to expose its content the way Bootstrap does.
vi.mock('bootstrap/js/dist/modal', () => ({
  default: class {
    private el: HTMLElement
    constructor(el: HTMLElement) {
      this.el = el
    }
    show() {
      this.el.removeAttribute('aria-hidden')
    }
    hide() {}
    dispose() {}
  },
}))

const getStripe = vi.fn((..._args: unknown[]) => new Promise(() => {}))
vi.mock('../../../../src/lib/stripe', () => ({ getStripe: (...args: unknown[]) => getStripe(...args) }))

// The payment itself (Stripe and the rest) is InvoicePaymentModal's own
// business; this stands in for a payment that went through.
vi.mock('../../../../src/pages/invoices/components/InvoicePaymentModal', () => ({
  default: ({ show, onSuccess }: { show: boolean; onSuccess: () => void }) =>
    show ? <button type="button" onClick={onSuccess}>Complete payment</button> : null,
}))

const fee = {
  id: 7,
  invoice_id: 'INV-7',
  created_at: '2026-10-12',
  customer_name: 'Rita Reseller',
  company_name: 'Reseller LLC',
  entity_type: 'Partner',
  displayable_payment_amount: '$800.00',
  payment_amount: 800,
  type: 'Borrower Fee',
  status: 'Unpaid',
}

const renderTable = (rows: Array<Record<string, unknown>> = [fee]) =>
  renderWithProviders(
    <InvoiceTable
      data={rows}
      loading={false}
      totalRecords={rows.length}
      page={1}
      perPage={10}
      onPage={() => {}}
      onSort={() => {}}
      onFilter={() => {}}
      filters={{}}
      sortField="created_at"
      sortOrder="desc"
      onRefresh={() => {}}
    />
  )

describe('InvoiceTable', () => {
  beforeEach(() => {
    getStripe.mockClear()
  })

  it('names the payer and shows their company in its own column', () => {
    renderTable()

    expect(screen.getByRole('columnheader', { name: /Company/ })).toBeInTheDocument()

    const row = screen.getByRole('row', { name: /INV-7/ })
    const cells = within(row).getAllByRole('cell')
    const nameCell = cells.find((c) => c.textContent?.includes('Rita Reseller'))
    const companyCell = cells.find((c) => c.textContent === 'Reseller LLC')

    expect(nameCell).toBeDefined()
    expect(nameCell?.textContent).not.toContain('Reseller LLC')
    expect(companyCell).toBeDefined()
  })

  it('shows a dash when the payer has no company', () => {
    renderTable([{ ...fee, company_name: null }])

    const row = screen.getByRole('row', { name: /INV-7/ })
    expect(within(row).getAllByRole('cell').some((c) => c.textContent === '-')).toBe(true)
  })

  it('opening the preview loads no payment methods and no Stripe', async () => {
    const paymentMethodsRequested = vi.fn()
    server.use(
      http.get('*/common/invoices/:id', () =>
        HttpResponse.json({ status: true, data: { ...fee, billed_from: {}, billed_to: {} } })
      ),
      http.get('*/payment/get-payment-methods', () => {
        paymentMethodsRequested()
        return HttpResponse.json({ status: true, data: [{ id: 1, name: 'Stripe', publishable_key: 'pk_test' }] })
      })
    )

    renderTable()
    await userEvent.click(screen.getByTitle('View Details'))

    expect(await screen.findByRole('heading', { name: 'Billed From' })).toBeInTheDocument()
    expect(paymentMethodsRequested).not.toHaveBeenCalled()
    expect(getStripe).not.toHaveBeenCalled()
  })
})

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
