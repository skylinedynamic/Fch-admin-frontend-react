import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import PaymentTable from '../../../../src/pages/payments/components/PaymentTable'

const payment = {
  id: 3,
  transaction_date: '2026-10-12',
  invoice_id: 'INV-7',
  from: 'Stripe',
  payment_type: 'credit',
  partner_name: 'Rita Reseller',
  borrower_name: '',
  name: 'Rita Reseller',
  company: 'Reseller LLC',
  amount: '$800.00',
  status: 'succeeded',
  is_environment: 'live',
}

const renderTable = (rows: Array<Record<string, unknown>> = [payment]) =>
  renderWithProviders(
    <PaymentTable
      data={rows}
      loading={false}
      totalRecords={rows.length}
      page={1}
      perPage={10}
      onPage={() => {}}
      onSort={() => {}}
      onFilter={() => {}}
      filters={{}}
      sortField="transaction_date"
      sortOrder="desc"
    />
  )

const cellsOf = (invoiceId: string) =>
  within(screen.getByRole('row', { name: new RegExp(invoiceId) })).getAllByRole('cell')

describe('PaymentTable', () => {
  it('names the payer and shows their company in its own column', () => {
    renderTable()

    expect(screen.getByRole('columnheader', { name: /Company/ })).toBeInTheDocument()

    const cells = cellsOf('INV-7')
    expect(cells.some((c) => c.textContent === 'Rita Reseller')).toBe(true)
    expect(cells.some((c) => c.textContent === 'Reseller LLC')).toBe(true)
  })

  it('shows a dash when the payer has no company', () => {
    renderTable([{ ...payment, company: null }])

    expect(screen.getByRole('columnheader', { name: /Company/ })).toBeInTheDocument()
    expect(cellsOf('INV-7').some((c) => c.textContent === '-')).toBe(true)
  })
})

/**
 * BUG-179: the NAME header had no sort field, so a click sent none and the API
 * fell back to sorting by date. It now asks for the payer name ('name').
 */
describe('PaymentTable NAME sort', () => {
  it('asks to sort by the payer name', async () => {
    const onSort = vi.fn()
    renderWithProviders(
      <PaymentTable
        data={[payment]}
        loading={false}
        totalRecords={1}
        page={1}
        perPage={10}
        onPage={() => {}}
        onSort={onSort}
        onFilter={() => {}}
        filters={{}}
        sortField="transaction_date"
        sortOrder="desc"
      />
    )

    const header = screen.getByRole('columnheader', { name: /^Name/ })
    await userEvent.click(within(header).getByText('Name'))

    expect(onSort).toHaveBeenCalledWith(expect.objectContaining({ sortField: 'name' }))
  })
})
