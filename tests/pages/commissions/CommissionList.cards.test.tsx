import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { cleanup, renderWithProviders, screen, within } from '../../test-utils'
import { useAuthStore } from '../../../src/store/auth/authStore'
import CommissionList from '../../../src/pages/commissions/CommissionList'

const ROW = {
  id: 1201, date: '2026-03-01', borrower: 'Johnathan Smithfield', partner: 'Acme Funding', commission_status: 'Completed',
  requested_amount: 100000, funded_amount: 90000, payment_status: 'Paid',
}

/** Signs in, answers the list with these rows and cards, and renders the page. */
const open = async (user: Record<string, unknown>, statistics: Record<string, unknown>, rows: Record<string, unknown>[] = [ROW]) => {
  useAuthStore.setState({ token: 'tok', user: { id: 2, name: 'Someone', entity_type: 'Partner', permissions: ['view commission'], ...user } })
  server.use(
    http.post('*/common/commissions', () =>
      HttpResponse.json({
        status: true,
        data: rows,
        meta: { total: rows.length, current_page: 1, last_page: 1, per_page: 10 },
        statistics,
      })
    ),
    // Everything else the page loads (filters, options) answers empty.
    http.all('*', () => HttpResponse.json({ status: true, data: [] }))
  )
  renderWithProviders(<CommissionList />, { route: '/commissions' })
  await screen.findByText('Johnathan Smithfield')
}

const card = (title: string) => screen.getByText(title).closest('.card') as HTMLElement
const headers = () => screen.getAllByRole('columnheader').map((h) => h.textContent?.trim())
/** The summary cards' titles, in order. */
const cardTitles = () => Array.from(document.querySelectorAll('.kpi-title')).map((t) => t.textContent?.trim())

/** The Commissions screen's summary cards (at most four, the important ones) and amount columns, per viewer. */
describe('CommissionList › cards', () => {
  afterEach(() => {
    cleanup()
    server.resetHandlers()
    useAuthStore.setState({ token: undefined, user: null })
  })

  // Each title says whose money it is: the whole commission, then how it splits
  // between host and partners, then what the host still has to pay out.
  it("shows the host owner the whole commission, each side's share, and what it still has to pay out", async () => {
    await open({ is_host: 1 }, {
      viewer: 'host_owner', deal_commission_amount: 30000, total_commission_amount: 24500, paid_amount: 16000, pending_amount: 2000,
      unpaid_amount: 6500, partner_commission_amount: 5500, payouts_due_amount: 2500, paid_to_staff: 2000,
      total_funded_amount: 280000, avg_commission_rate: 80, total_deals: 5, completed_deals: 2,
    }, [{ ...ROW, admin_commission_amount: 6000, partner_commission_amount: 4000 }])

    expect(cardTitles()).toEqual(['Total Commission', 'Host Share', 'Partner Share', 'Payouts Due'])
    expect(within(card('Total Commission')).getByText('$30,000')).toBeInTheDocument()
    expect(within(card('Host Share')).getByText('$24,500')).toBeInTheDocument()
    expect(within(card('Partner Share')).getByText('$5,500')).toBeInTheDocument()
    expect(within(card('Payouts Due')).getByText('$2,500')).toBeInTheDocument()
    expect(headers()).toEqual(expect.arrayContaining(['Admin Comm.', 'Partner Comm.']))
  })

  it('shows a partner owner its total, what it has received and what it is still waiting for', async () => {
    await open({ is_host: 0 }, {
      viewer: 'partner_owner', total_commission_amount: 5500, paid_amount: 4000, pending_amount: 0, unpaid_amount: 1500,
      total_funded_amount: 130000, avg_commission_rate: 45, total_deals: 7, completed_deals: 3,
    }, [{ ...ROW, partner_commission_amount: 4000 }])

    expect(cardTitles()).toEqual(['My Total Commission', 'Received', 'Awaiting Payment', 'Completed Deals'])
    expect(within(card('My Total Commission')).getByText('$5,500')).toBeInTheDocument()
    expect(within(card('Received')).getByText('$4,000')).toBeInTheDocument()
    expect(within(card('Awaiting Payment')).getByText('$1,500')).toBeInTheDocument()
    expect(within(card('Completed Deals')).getByText('3')).toBeInTheDocument()
    expect(headers()).toContain('Partner Comm.')
    expect(headers()).not.toContain('Admin Comm.')
  })

  it('shows host staff only their own payout, as cards and as a column', async () => {
    await open({ is_host: 1, entity_type: 'Employee' }, {
      viewer: 'host_staff', my_paid_amount: 2000, my_expected_amount: 1000, my_expected_deals: 1,
      total_funded_amount: 150000, total_deals: 2, completed_deals: 1,
    }, [{ ...ROW, my_payout: 2000 }])

    expect(cardTitles()).toEqual(['Received', 'Awaiting Payment', 'My Deals', 'Completed Deals'])
    expect(within(card('Received')).getByText('$2,000')).toBeInTheDocument()
    expect(within(card('Awaiting Payment')).getByText('$1,000')).toBeInTheDocument()
    expect(within(card('My Deals')).getByText('2')).toBeInTheDocument()
    expect(screen.queryByText('Total Commission')).toBeNull()
    expect(headers()).toContain('My Payout')
    expect(headers()).not.toContain('Admin Comm.')
    expect(headers()).not.toContain('Partner Comm.')
    expect(screen.getByText('$2,000', { selector: 'td' })).toBeInTheDocument()
  })

  it('shows partner staff their deals with no commission money at all', async () => {
    await open({ is_host: 0, entity_type: 'Employee' }, {
      viewer: 'partner_staff', total_funded_amount: 90000, total_deals: 3, completed_deals: 1,
    })

    expect(within(card('My Deals')).getByText('3')).toBeInTheDocument()
    expect(within(card('Completed Deals')).getByText('1')).toBeInTheDocument()
    expect(cardTitles()).toEqual(['My Deals', 'Completed Deals', 'My Funded Amount'])
    expect(within(card('My Funded Amount')).getByText('$90,000')).toBeInTheDocument()
    expect(screen.queryByText('Total Commission')).toBeNull()
    expect(screen.queryByText('Avg Commission Rate')).toBeNull()
    expect(headers()).not.toContain('Partner Comm.')
    expect(headers()).not.toContain('Admin Comm.')
    expect(headers()).not.toContain('My Payout')
  })
})
