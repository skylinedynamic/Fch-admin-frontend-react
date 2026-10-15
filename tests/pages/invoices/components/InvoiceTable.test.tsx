import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../mocks/server'
import { renderWithProviders } from '../../../test-utils'
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
