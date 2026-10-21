import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
// Summernote (reached through the shared activity modals) needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import LeadDetails from '../../../src/pages/leads/LeadDetails'

const LEAD = {
  id: 178, contact_person: 'Test Lead Full Name', company_name: 'Lead Co', email: 'lead@example.test',
  phone_number: '(555) 010-0001', lead_type: 'Borrower', status: 'New Lead', country: 'United States',
}

beforeEach(() => vi.clearAllMocks())

describe('LeadDetails - header counters', () => {
  /**
   * Defect (BUG-016, OP-LEAD-13): every lead showed the same Meetings / Total
   * Clients / Invoiced / Subscriptions / Tickets - the signed-in user's own
   * partner stats from /common/stats, nothing about the lead. A lead has no
   * meetings, clients, invoices, subscriptions or tickets of its own, so the
   * strip is not shown and the stats are not fetched.
   */
  it('shows no partner-wide counters on a lead and does not fetch them', async () => {
    signIn({ permissions: ['view leads', 'update leads'] })
    allowBackgroundCalls()
    api('get', '/common/leads/178', { status: true, data: LEAD })
    const stats = api('post', '/common/stats', { status: true, data: { total_meetings: 2, total_clients: 43, total_invoice: 34, enrollment_type: 'N/A', total_tickets: 7 } })

    renderPage(<LeadDetails />, { path: '/leads/:id', route: '/leads/178' })

    expect(await screen.findByDisplayValue('Test Lead Full Name')).toBeInTheDocument()
    expect(screen.queryByText('Total Clients')).not.toBeInTheDocument()
    expect(screen.queryByText('Invoiced')).not.toBeInTheDocument()
    expect(screen.queryByText('Tickets')).not.toBeInTheDocument()
    expect(stats.calls).toBe(0)
  })
})
