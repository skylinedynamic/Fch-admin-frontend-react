import { describe, expect, it, vi } from 'vitest'
import { screen } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
// Summernote needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import LeadDetails from '../../../src/pages/leads/LeadDetails'

/**
 * BUG-016: the lead profile showed a counter strip (Meetings, Total Clients,
 * Invoiced, Subscriptions, Tickets) filled from /common/stats - the signed-in
 * partner's own totals, not the lead's - so every lead showed the same
 * numbers. A lead has no clients, invoices or subscriptions of its own, so the
 * strip is not shown on a lead and the totals are not fetched.
 */
const LEAD = {
  id: 7, company_name: 'Lead Co', contact_person: 'Lee Lead', email: 'lee@example.test',
  phone_number: '(555) 234-5678', lead_type: 'Borrower', status: 'New', country: 'United States',
}

describe('LeadDetails - no partner totals on a lead (BUG-016)', () => {
  it('does not show the partner\'s counters on a lead, nor fetch them', async () => {
    signIn({ permissions: ['view leads', 'update leads'] })
    allowBackgroundCalls()
    api('get', '/common/leads/7', { status: true, data: LEAD })
    const stats = api('post', '/common/stats', {
      status: true, data: { total_meetings: 2, total_clients: 43, total_invoice: 34, enrollment_type: 'N/A', total_tickets: 7 },
    })

    const view = renderPage(<LeadDetails />, { path: '/leads/:id', route: '/leads/7' })
    expect(await screen.findByDisplayValue('Lead Co')).toBeInTheDocument()

    expect(view.container.querySelector('.metrics-strip')).toBeNull()
    expect(screen.queryByText('Total Clients')).not.toBeInTheDocument()
    expect(screen.queryByText('Invoiced')).not.toBeInTheDocument()
    expect(stats.calls).toBe(0)
  })
})
