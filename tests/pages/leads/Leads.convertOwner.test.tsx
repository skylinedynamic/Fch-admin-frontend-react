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
import { cleanup, renderWithProviders, screen, waitFor } from '../../test-utils'
import { useAuthStore } from '../../../src/store/auth/authStore'
import Leads from '../../../src/pages/leads/Leads'

/**
 * Leads, as the host partner sees them: every partner's leads, each with the
 * partner that owns it. Converting another partner's borrower lead first asks
 * whose borrower it becomes - the host's or the lead owner partner's - and
 * sends that choice with the conversion.
 */
const leadOf = (id: number, partner: { id: number; company_name: string }, convertAsOptions: unknown[]) => ({
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
  convert_as_options: convertAsOptions,
})

const HOST = { id: 1, company_name: 'Host Co' }
const WLP = { id: 2, company_name: 'WLP Co' }
const WLP_LEAD = leadOf(7, WLP, [
  { value: 'host', company_name: 'Host Co' },
  { value: 'lead_partner', company_name: 'WLP Co' },
])
const HOST_LEAD = leadOf(8, HOST, [])

const BORROWER_PLAN = { id: 11, name: 'Standard', enrollment_type: 'One Time', total_amount: 500, platform_fee: 0 }

const signInAs = (isHost: boolean) =>
  useAuthStore.setState({
    token: 'tok',
    user: { id: 1, name: 'Signed In', is_host: isHost ? 1 : 0, entity_type: 'Partner', permissions: ['update leads', 'delete leads'] },
  })

function serve(leads: unknown[]) {
  const convertBodies: Record<string, unknown>[] = []
  server.use(
    http.post('*/common/leads/fetch-leads', () =>
      HttpResponse.json({ status: true, data: leads, meta: { total: leads.length }, statistics: { total_leads: leads.length } })),
    http.post('*/common/get-all-users*', () => HttpResponse.json({ status: true, data: [] })),
    http.post('*/common/contacts/fetch-contacts', () => HttpResponse.json({ status: true, data: [] })),
    http.get('*/common/borrower-plans', () => HttpResponse.json({ status: true, data: [BORROWER_PLAN] })),
    http.get('*/common/partner-plans', () => HttpResponse.json({ status: true, data: [] })),
    http.get('*/common/subscriptions/partner-borrower-fee', () => HttpResponse.json({ status: true, data: { borrower_fee_amount: 0 } })),
    http.get('*/common/user-details', () => HttpResponse.json({ status: true, data: { user: {} } })),
    http.post('*/common/leads/:id/convert', async ({ request }) => {
      convertBodies.push((await request.json()) as Record<string, unknown>)
      return HttpResponse.json({ status: true, message: 'Converted', data: { id: 99 } })
    })
  )
  return convertBodies
}

// The convert modal's confirm button carries the same label as the row's.
const modalButton = (name: string) =>
  waitFor(() => {
    const button = screen.getAllByRole('button', { name, hidden: true }).find((b) => b.closest('.modal'))
    expect(button).toBeDefined()
    return button as HTMLButtonElement
  })

const rowOf = (contact: string) => screen.getByText(contact).closest('tr') as HTMLElement

/** Serves the host's partner list, and records every fetch-leads body. */
function servePartners() {
  const fetchBodies: Record<string, unknown>[] = []
  server.use(
    http.post('*/admin/partners/fetch-partners', () =>
      HttpResponse.json({ status: true, data: [{ id: 1, full_name: 'Hal Host', company_name: 'Host Co' }, { id: 2, full_name: 'Wil Label', company_name: 'WLP Co' }] })),
  )
  server.events.on('request:start', async ({ request }) => {
    if (request.method === 'POST' && request.url.endsWith('/common/leads/fetch-leads')) {
      fetchBodies.push((await request.clone().json()) as Record<string, unknown>)
    }
  })
  return fetchBodies
}

const convertButtonFor = async (contact: string) => {
  const row = (await screen.findByText(contact)).closest('tr') as HTMLElement
  return row.querySelector('button.btn-primary') as HTMLButtonElement
}

describe('Leads › host converting another partner\'s lead', () => {
  afterEach(() => {
    cleanup()
    server.resetHandlers()
    server.events.removeAllListeners()
    useAuthStore.setState({ token: undefined, user: null })
  })

  it('shows the host which partner owns each lead, just before the salesperson', async () => {
    signInAs(true)
    serve([WLP_LEAD, HOST_LEAD])
    renderWithProviders(<Leads />, { route: '/leads' })

    await screen.findByRole('columnheader', { name: /^Partner/ })
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent?.trim() ?? '')
    const partnerAt = headers.findIndex((h) => h.startsWith('Partner'))
    expect(headers[partnerAt + 1]).toMatch(/^SalesPerson/)
    expect(rowOf('Lee 7')).toHaveTextContent('WLP Co')
    expect(rowOf('Lee 8')).toHaveTextContent('Host Co')
  })

  it('fits each lead in fewer columns without dropping a value', async () => {
    signInAs(true)
    serve([{ ...WLP_LEAD, salesperson_name: 'Sal Person' }])
    renderWithProviders(<Leads />, { route: '/leads' })

    await screen.findByText('Lee 7')
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent?.trim() ?? '').filter(Boolean)
    expect(headers).toEqual(['Lead', 'Contact Info', 'Source', 'Partner', 'SalesPerson', 'Status', 'Action'])

    const row = rowOf('Lee 7')
    for (const value of ['Lee 7', 'Lead Co 7', 'lead-7@example.test', '(555) 123-4567', 'Website', 'WLP Co', 'Sal Person', 'New Lead', 'Borrower']) {
      expect(row).toHaveTextContent(value)
    }
  })

  it('lets the host narrow the list to one partner', async () => {
    signInAs(true)
    const fetchBodies = servePartners()
    serve([WLP_LEAD, HOST_LEAD])
    const user = userEvent.setup()
    renderWithProviders(<Leads />, { route: '/leads' })
    await screen.findByText('Lee 7')

    const partnerLabel = screen.getAllByText('All Partners').find((el) => el.classList.contains('p-dropdown-label')) as HTMLElement
    await user.click(partnerLabel.closest('.p-dropdown') as HTMLElement)
    const option = await waitFor(() => {
      const found = Array.from(document.body.querySelectorAll('.p-dropdown-panel .p-dropdown-item')).find((el) => el.textContent === 'WLP Co')
      if (!found) throw new Error('no "WLP Co" option')
      return found as HTMLElement
    })
    await user.click(option)
    await user.click(screen.getByRole('button', { name: /Filters/ }))

    await waitFor(() => expect(fetchBodies[fetchBodies.length - 1]).toMatchObject({ partner_id: 2 }))
  })

  it('does not show the owner column to a white-label or certified partner', async () => {
    signInAs(false)
    serve([{ ...WLP_LEAD, convert_as_options: [] }])
    renderWithProviders(<Leads />, { route: '/leads' })

    await screen.findByText('Lee 7')
    expect(screen.queryByRole('columnheader', { name: /^Partner/ })).not.toBeInTheDocument()
    expect(screen.queryAllByText('All Partners')).toHaveLength(0)
  })

  it('asks whose borrower the lead becomes, then converts it as chosen', async () => {
    signInAs(true)
    const convertBodies = serve([WLP_LEAD])
    const user = userEvent.setup()
    renderWithProviders(<Leads />, { route: '/leads' })

    await user.click(await convertButtonFor('Lee 7'))

    const asOwner = await screen.findByRole('radio', { name: /WLP Co/ })
    expect(asOwner).toBeChecked()
    await user.click(screen.getByRole('radio', { name: /Host Co/ }))
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    expect(asOwner.closest('.modal')).not.toHaveClass('show')

    await user.click(await modalButton('Convert to Borrower'))

    await waitFor(() => expect(convertBodies).toHaveLength(1))
    expect(convertBodies[0]).toMatchObject({ convert_as: 'host', plan_id: 11 })
  })

  it('converts the host\'s own lead without asking', async () => {
    signInAs(true)
    const convertBodies = serve([HOST_LEAD])
    const user = userEvent.setup()
    renderWithProviders(<Leads />, { route: '/leads' })

    const rowButton = await convertButtonFor('Lee 8')
    expect(rowButton).toHaveTextContent('Convert to Borrower')
    await user.click(rowButton)
    await user.click(await modalButton('Convert to Borrower'))

    await waitFor(() => expect(convertBodies).toHaveLength(1))
    expect(screen.queryByRole('radio', { name: /Host Co/, hidden: true })).not.toBeInTheDocument()
    expect(convertBodies[0]).not.toHaveProperty('convert_as')
  })
})
