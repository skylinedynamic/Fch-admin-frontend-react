import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../../mocks/server'
import InvoicePreviewModal from '../../../../src/pages/invoices/components/InvoicePreviewModal'

// Bootstrap's show/hide transitions run after jsdom has torn the node down.
// Showing the modal only needs to do what Bootstrap does to the markup: drop
// aria-hidden so its content is exposed. hide() is a no-op because the modal
// re-creates its instance once its ref attaches, hiding it straight after the
// show - real Bootstrap ignores a hide that arrives mid-transition.
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

const host = {
  name: 'Hal Host',
  company_name: 'Host LLC',
  email: 'host@example.test',
  phone: '555-0100',
  address: '1 Host Way, Suite 100',
  city: 'Irvine',
  state: 'CA',
  postal_code: '92618',
  country: 'United States',
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

const respondWith = (invoice: Record<string, unknown>) =>
  server.use(http.get('*/common/invoices/:id', () => HttpResponse.json({ status: true, data: invoice })))

const renderModal = (invoice: Record<string, unknown> = { id: 7 }) =>
  render(<InvoicePreviewModal show onHide={() => {}} invoice={invoice} />)

const section = async (heading: string) => {
  const title = await screen.findByRole('heading', { name: heading })
  return within(title.parentElement as HTMLElement)
}

describe('InvoicePreviewModal', () => {
  it('shows Billed From before Billed To', async () => {
    respondWith({ id: 7, invoice_id: 'INV-7', billed_from: host, billed_to: reseller })

    renderModal()

    const from = await screen.findByRole('heading', { name: 'Billed From' })
    const to = screen.getByRole('heading', { name: 'Billed To' })

    expect(from.compareDocumentPosition(to) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows who issued the invoice under Billed From', async () => {
    respondWith({ id: 7, invoice_id: 'INV-7', billed_from: host, billed_to: reseller })

    renderModal()

    const from = await section('Billed From')
    expect(from.getByText('Hal Host')).toBeInTheDocument()
    expect(from.getByText('Host LLC')).toBeInTheDocument()
    expect(from.getByText('1 Host Way, Suite 100')).toBeInTheDocument()
    expect(from.getByText('Irvine, CA 92618')).toBeInTheDocument()
    expect(from.getByText('555-0100')).toBeInTheDocument()
    expect(from.queryByText('Reseller LLC')).not.toBeInTheDocument()
  })

  it('shows who pays the invoice under Billed To', async () => {
    // A borrower fee: the borrower it is for is on the invoice, but the
    // partner is the one paying, so the partner is who it is billed to.
    respondWith({
      id: 7,
      invoice_id: 'INV-7',
      type: 'Borrower Fee',
      name: 'Bo Rower',
      customer_name: 'Reseller LLC',
      billed_from: host,
      billed_to: reseller,
    })

    renderModal()

    const to = await section('Billed To')
    expect(to.getByText('Rita Reseller')).toBeInTheDocument()
    expect(to.getByText('Reseller LLC')).toBeInTheDocument()
    expect(to.getByText('2 Reseller Rd')).toBeInTheDocument()
    expect(to.getByText('Austin, TX 73301')).toBeInTheDocument()
    expect(to.getByText('555-0200')).toBeInTheDocument()
    expect(to.getByText('reseller@example.test')).toBeInTheDocument()
    expect(screen.queryByText('Bo Rower')).not.toBeInTheDocument()
  })

  it('leaves out the lines a party has no value for', async () => {
    respondWith({
      id: 7,
      invoice_id: 'INV-7',
      billed_from: host,
      billed_to: {
        name: 'Uma User',
        company_name: null,
        email: 'uma@example.test',
        phone: null,
        address: null,
        city: null,
        state: 'NY',
        postal_code: null,
        country: null,
      },
    })

    renderModal()

    const to = await section('Billed To')
    expect(to.getByText('Uma User')).toBeInTheDocument()
    expect(to.getByText('NY')).toBeInTheDocument()
    expect(to.queryByText(/Phone/)).not.toBeInTheDocument()
    expect(to.queryByText(/null|undefined/)).not.toBeInTheDocument()
  })

  it('keeps the payee wording on a commission payout', async () => {
    // The payee line is only printed once the payout is paid. The type is the
    // API's display label, title-cased.
    respondWith({
      id: 7,
      invoice_id: 'INV-7',
      type: 'Commission Payout',
      status: 'Paid',
      billed_from: host,
      billed_to: reseller,
    })

    renderModal()

    const payee = await section('Partner Details')
    expect(payee.getByText('Reseller LLC')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Billed To' })).not.toBeInTheDocument()
    expect(screen.getByText(/Payee Name/)).toBeInTheDocument()
  })

  it("describes a borrower fee by its own type and amount, not the borrower's plan", async () => {
    respondWith({
      id: 7,
      invoice_id: 'INV-7',
      type: 'Borrower Fee',
      payment_amount: 800,
      billed_from: host,
      billed_to: reseller,
    })

    renderModal()

    const items = within(await screen.findByRole('table', { name: 'Invoice items' }))
    expect(items.getByText('Borrower Fee')).toBeInTheDocument()
    expect(items.getByText('$800.00')).toBeInTheDocument()
    expect(screen.queryByText(/Enrollment/)).not.toBeInTheDocument()
  })

  it('names the plan under the type on an invoice that bills for it', async () => {
    respondWith({
      id: 7,
      invoice_id: 'INV-7',
      type: 'Installment',
      enrollment_type: 'Installment Plan',
      payment_amount: 500,
      billed_from: host,
      billed_to: reseller,
    })

    renderModal()

    const items = within(await screen.findByRole('table', { name: 'Invoice items' }))
    expect(items.getByText('Installment')).toBeInTheDocument()
    expect(items.getByText('Installment Plan')).toBeInTheDocument()
    expect(items.getByText('$500.00')).toBeInTheDocument()
  })

  it("shows the issuer's document logo", async () => {
    respondWith({
      id: 7,
      invoice_id: 'INV-7',
      branding: { site_name: 'Host LLC', logo_document_full_url: 'https://cdn.test/doc.png', logo_sidebar_full_url: '' },
      billed_from: host,
      billed_to: reseller,
    })

    renderModal()

    expect(await screen.findByRole('img', { name: 'Logo' })).toHaveAttribute('src', 'https://cdn.test/doc.png')
  })

  it('shows a skeleton, not the half-filled row, while the details load', async () => {
    let release: () => void = () => {}
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.get('*/common/invoices/:id', async () => {
        await pending
        return HttpResponse.json({ status: true, data: { id: 7, invoice_id: 'INV-7', billed_from: host, billed_to: reseller } })
      })
    )

    renderModal({ id: 7, invoice_id: 'INV-7', customer_name: 'Row Customer' })

    expect(await screen.findByRole('status', { name: 'Loading invoice' })).toBeInTheDocument()
    expect(screen.queryByText('Row Customer')).not.toBeInTheDocument()

    release()

    expect(await screen.findByRole('heading', { name: 'Billed From' })).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Loading invoice' })).not.toBeInTheDocument()
  })

  it('falls back to the row it was opened from when the details cannot be loaded', async () => {
    server.use(http.get('*/common/invoices/:id', () => HttpResponse.json({ status: false, message: 'nope' })))

    renderModal({ id: 7, invoice_id: 'INV-7', customer_name: 'Row Customer', email: 'row@example.test' })

    const to = await section('Billed To')
    expect(to.getByText('Row Customer')).toBeInTheDocument()
    expect(to.getByText('row@example.test')).toBeInTheDocument()
  })
})
