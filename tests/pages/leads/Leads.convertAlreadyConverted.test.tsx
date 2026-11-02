import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

// Bootstrap's real Modal fires transition callbacks after the page unmounts and
// throws against a ref that is gone; a synchronous fake (as in
// EditConfirmationModal.test.tsx) avoids depending on transition events.
vi.mock('bootstrap/js/dist/modal', () => {
  class FakeModal {
    private el: HTMLElement
    constructor(el: HTMLElement) {
      this.el = el
    }
    show() {
      this.el.classList.add('show')
      this.el.removeAttribute('aria-hidden')
    }
    hide() {
      this.el.classList.remove('show')
      this.el.setAttribute('aria-hidden', 'true')
    }
    dispose() {}
  }
  return { default: FakeModal }
})

import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { server } from '../../mocks/server'
import { cleanup, renderWithProviders, screen, waitFor, within } from '../../test-utils'
import { toast } from 'react-toastify'
import { useAuthStore } from '../../../src/store/auth/authStore'
import Leads from '../../../src/pages/leads/Leads'

/**
 * BUG-057: converting a lead another tab already converted. The API refuses it
 * with 422 "This lead has already been converted." The convert dialog closes,
 * a dialog gives that reason - no toast - and its button reloads the list.
 */
const leadOf = (id: number, partner: { id: number; company_name: string }, onBehalfOf: unknown = null) => ({
  id,
  lead_type: 'Borrower',
  status: 'New Lead',
  contact_person: `Lee ${id}`,
  company_name: `Lead Co ${id}`,
  email: `lead-${id}@example.test`,
  phone_number: '(555) 123-4567',
  country: 'United States',
  state: 'Texas',
  city: 'Austin',
  lead_source: 'Website',
  convert_to: null,
  convert_email_already: false,
  partner: { id: partner.id, full_name: 'Owner', company_name: partner.company_name },
  convert_on_behalf_of: onBehalfOf,
})

const HOST = { id: 1, company_name: 'Host Co' }
const LEAD = leadOf(8, HOST)
const BORROWER_PLAN = { id: 11, name: 'Standard', enrollment_type: 'One Time', total_amount: 500, platform_fee: 0 }
const ALREADY = 'This lead has already been converted.'

function serve() {
  let converted = false
  const fetches = { count: 0 }
  server.use(
    http.post('*/common/leads/fetch-leads', () => {
      fetches.count++
      const leads = [{ ...LEAD, convert_to: converted ? 'Borrower' : null, status: converted ? 'Lead Completed' : 'New Lead' }]
      return HttpResponse.json({ status: true, data: leads, meta: { total: 1 }, statistics: { total_leads: 1 } })
    }),
    http.post('*/common/get-all-users*', () => HttpResponse.json({ status: true, data: [] })),
    http.post('*/common/contacts/fetch-contacts', () => HttpResponse.json({ status: true, data: [] })),
    http.post('*/common/get-all-partners', () => HttpResponse.json({ status: true, data: [] })),
    http.get('*/common/borrower-plans', () => HttpResponse.json({ status: true, data: [BORROWER_PLAN] })),
    http.get('*/common/partner-plans', () => HttpResponse.json({ status: true, data: [] })),
    http.get('*/common/subscriptions/partner-borrower-fee', () => HttpResponse.json({ status: true, data: { borrower_fee_amount: 0 } })),
    http.get('*/common/user-details', () => HttpResponse.json({ status: true, data: { user: {} } })),
    http.post('*/common/leads/:id/convert', () => {
      converted = true
      return HttpResponse.json({ status: false, message: ALREADY }, { status: 422 })
    })
  )
  return fetches
}

const modalButton = (name: string) =>
  waitFor(() => {
    const button = screen.getAllByRole('button', { name, hidden: true }).find((b) => b.closest('.modal'))
    expect(button).toBeDefined()
    return button as HTMLButtonElement
  })

describe('Leads › converting a lead that is already converted (BUG-057)', () => {
  afterEach(() => {
    cleanup()
    server.resetHandlers()
    vi.mocked(toast.error).mockClear()
    useAuthStore.setState({ token: undefined, user: null })
  })

  it('closes the convert dialog, gives the reason in a dialog and reloads the list from its button', async () => {
    useAuthStore.setState({
      token: 'tok',
      user: { id: 1, name: 'Signed In', is_host: 1, partner_id: 1, entity_type: 'Partner', permissions: ['update leads', 'delete leads'] },
    })
    const fetches = serve()
    const user = userEvent.setup()
    renderWithProviders(<Leads />, { route: '/leads' })

    const row = (await screen.findByText('Lee 8')).closest('tr') as HTMLElement
    await user.click(row.querySelector('button.btn-primary') as HTMLButtonElement)
    await user.click(await modalButton('Convert to Borrower'))

    const dialog = await screen.findByRole('dialog', { name: 'Lead Not Converted' })
    await waitFor(() => expect(dialog).toHaveClass('show'))
    expect(within(dialog).getByText(ALREADY)).toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
    // The convert dialog itself has closed.
    await waitFor(() => expect(screen.queryAllByRole('button', { name: 'Convert to Borrower', hidden: true }).filter((b) => b.closest('.modal.show'))).toHaveLength(0))

    const before = fetches.count
    await user.click(within(dialog).getByRole('button', { name: 'Reload list' }))

    await waitFor(() => expect(fetches.count).toBeGreaterThan(before))
    expect(dialog).not.toHaveClass('show')
  })
})
