import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { renderWithProviders } from '../../test-utils'
import InvoiceDetails from '../../../src/pages/invoices/InvoiceDetails'

// The pay flow is its own screen with its own tests; this page only mounts it.
vi.mock('../../../src/pages/invoices/components/InvoicePaymentModal', () => ({ default: () => null }))

const reseller = {
  name: 'Rita Reseller',
  company_name: 'Reseller LLC',
  email: 'reseller@example.test',
  phone: '555-0200',
  address: '2 Reseller Rd',
  city: 'Austin',
  state: 'TX',
  postal_code: '73301',
  country: 'United States',
}

const respondWith = (invoice: Record<string, unknown>) =>
  server.use(http.get('*/common/invoices/:id', () => HttpResponse.json({ status: true, data: invoice })))

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/invoices/:id" element={<InvoiceDetails />} />
    </Routes>,
    { route: '/invoices/7' }
  )

const billedToSection = async () => {
  const title = await screen.findByRole('heading', { name: 'Billed To' })
  return within(title.parentElement as HTMLElement)
}

describe('InvoiceDetails', () => {
  it('bills a borrower fee to the partner paying it, not the borrower it is for', async () => {
    respondWith({
      id: 7,
      invoice_id: 'INV-7',
      type: 'Borrower Fee',
      status: 'Unpaid',
      displayable_payment_amount: '$800.00',
      billed_to: reseller,
    })

    renderPage()

    const to = await billedToSection()
    expect(to.getByText('Rita Reseller')).toBeInTheDocument()
    expect(to.getByText('Reseller LLC')).toBeInTheDocument()
    expect(to.getByText('2 Reseller Rd')).toBeInTheDocument()
    expect(to.getByText('Austin, TX 73301')).toBeInTheDocument()
    expect(to.getByText('United States')).toBeInTheDocument()
    expect(to.getByText('555-0200')).toBeInTheDocument()
    expect(to.getByText('reseller@example.test')).toBeInTheDocument()
  })

  it('describes the invoice by its own type and amount', async () => {
    respondWith({
      id: 7,
      invoice_id: 'INV-7',
      type: 'Borrower Fee',
      status: 'Unpaid',
      displayable_payment_amount: '$800.00',
      billed_to: reseller,
    })

    renderPage()

    await billedToSection()
    expect(screen.getByText('Borrower Fee')).toBeInTheDocument()
    expect(screen.queryByText(/Enrollment Type/)).not.toBeInTheDocument()
  })
})
