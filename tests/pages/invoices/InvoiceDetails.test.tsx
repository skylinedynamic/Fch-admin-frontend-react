import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor, within } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn, type TestUser } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
// The pay flow is its own screen with its own tests; this page only mounts it.
vi.mock('../../../src/pages/invoices/components/InvoicePaymentModal', () => ({ default: () => null }))

import { toast } from 'react-toastify'
import InvoiceDetails from '../../../src/pages/invoices/InvoiceDetails'

const INVOICE = {
  id: 1001, invoice_id: 'INV-1001', customer_name: 'Acme Funding', displayable_payment_amount: '$499.00',
  type: 'Subscription', status: 'Unpaid', entity_type: 'Partner',
}

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

const BORROWER_FEE = { ...INVOICE, type: 'Borrower Fee', displayable_payment_amount: '$800.00', billed_to: reseller }

const mount = (user: TestUser = { permissions: ['view invoices'] }, invoice: Record<string, unknown> = INVOICE) => {
  signIn(user)
  allowBackgroundCalls()
  api('get', '/common/invoices/1001', { status: true, data: invoice })
  return renderPage(<InvoiceDetails />, { path: '/invoices/:id', route: '/invoices/1001' })
}

const billedToSection = async () => {
  const title = await screen.findByRole('heading', { name: 'Billed To' })
  return within(title.parentElement as HTMLElement)
}

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom has no object URLs; the download handler needs them to exist.
  URL.createObjectURL = vi.fn(() => 'blob:mock')
  URL.revokeObjectURL = vi.fn()
})

describe('InvoiceDetails', () => {
  it('shows the invoice total', async () => {
    mount()

    expect(await screen.findByText('Total Amount')).toBeInTheDocument()
    expect(screen.getAllByText('$499.00').length).toBeGreaterThan(0)
  })

  it('shows a dash when the amount is missing', async () => {
    mount({ permissions: ['view invoices'] }, { ...INVOICE, displayable_payment_amount: null })

    await screen.findByText('Total Amount')
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(2)
  })

  it('bills a borrower fee to the partner paying it, not the borrower it is for', async () => {
    mount({ permissions: ['view invoices'] }, BORROWER_FEE)

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
    mount({ permissions: ['view invoices'] }, BORROWER_FEE)

    await billedToSection()
    expect(screen.getByText('Borrower Fee')).toBeInTheDocument()
    expect(screen.queryByText(/Enrollment Type/)).not.toBeInTheDocument()
  })

  it('downloads the PDF returned by the API', async () => {
    const user = userEvent.setup()
    mount()
    const download = api('get', '/common/invoices/1001/download', {
      status: true, data: { file: btoa('%PDF-1.4 fake'), mime_type: 'application/pdf', file_name: 'Invoice-INV-1001.pdf' },
    })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await user.click(await screen.findByRole('button', { name: /download pdf/i }))

    await waitFor(() => expect(download.calls).toBe(1))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Invoice downloaded successfully'))
    expect(click).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    click.mockRestore()
  })

  it('reports a download that returns no file', async () => {
    const user = userEvent.setup()
    mount()
    api('get', '/common/invoices/1001/download', { status: true, data: {} })

    await user.click(await screen.findByRole('button', { name: /download pdf/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to download invoice'))
  })

  it('reports a download error', async () => {
    const user = userEvent.setup()
    mount()
    api('get', '/common/invoices/1001/download', { message: 'boom' }, 500)

    await user.click(await screen.findByRole('button', { name: /download pdf/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error downloading invoice'))
  })

  it('never offers Pay Now to the host', async () => {
    mount()

    await screen.findByText('Total Amount')
    expect(screen.queryByRole('button', { name: /pay now/i })).not.toBeInTheDocument()
  })

  it('offers Pay Now to a partner for their own unpaid invoice', async () => {
    mount({ permissions: ['view invoices'], is_host: 0, partner_id: 5, entity_type: 'Partner' })

    expect(await screen.findByRole('button', { name: /pay now/i })).toBeInTheDocument()
  })

  it.each(['Paid', 'Processing'])('does not offer Pay Now for a %s invoice', async (status) => {
    mount({ permissions: ['view invoices'], is_host: 0, partner_id: 5, entity_type: 'Partner' }, { ...INVOICE, status })

    await screen.findByText('Total Amount')
    expect(screen.queryByRole('button', { name: /pay now/i })).not.toBeInTheDocument()
  })

  it('shows the not-found page when the invoice cannot be loaded', async () => {
    signIn({ permissions: ['view invoices'] })
    allowBackgroundCalls()
    api('get', '/common/invoices/1001', { message: 'boom' }, 500)
    renderPage(<InvoiceDetails />, { path: '/invoices/:id', route: '/invoices/1001' })

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Error loading invoice details'))
    expect(await screen.findByText('Invoice Not Found')).toBeInTheDocument()
  })
})
