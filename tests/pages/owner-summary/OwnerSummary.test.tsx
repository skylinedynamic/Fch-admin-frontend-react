import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor, within } from '../../test-utils'
import { server } from '../../mocks/server'
import { ownerSummaryFixture, ownerSummaryResponse } from '../../mocks/ownerSummary'
import OwnerSummary from '../../../src/pages/owner-summary/OwnerSummary'
import { useAuthStore } from '../../../src/store/auth'

let requests: URLSearchParams[] = []

beforeEach(() => {
  requests = []
  useAuthStore.setState({ token: 't', user: { id: 1, name: 'Olive Owner', is_host: 1, entity_type: 'Partner', permissions: [] } } as never)
  server.use(
    http.get('*/common/owner-summary', ({ request }) => {
      requests.push(new URL(request.url).searchParams)
      return HttpResponse.json(ownerSummaryResponse())
    })
  )
})

afterEach(() => server.resetHandlers())

const lastRequest = () => requests[requests.length - 1]

const renderPage = async () => {
  renderWithProviders(<OwnerSummary />, { route: '/owner-summary' })
  await screen.findByTestId('owner-kpis')
}

describe('Owner Summary page', () => {
  it('shows the six headline numbers with how each moved', async () => {
    await renderPage()
    const kpis = within(screen.getByTestId('owner-kpis'))

    expect(kpis.getByText('Cash collected')).toBeInTheDocument()
    expect(kpis.getByText('$1.6K')).toBeInTheDocument()
    expect(kpis.getByText('+288%')).toBeInTheDocument()
    expect(kpis.getByText('Owed to us')).toBeInTheDocument()
    expect(kpis.getByText('1 over 30 days')).toBeInTheDocument()
    expect(kpis.getByText('3 open invoices')).toBeInTheDocument()
    expect(kpis.getByText('Funded volume')).toBeInTheDocument()
    expect(kpis.getByText('$150.0K')).toBeInTheDocument()
    expect(kpis.getByText(/2 deals · avg \$75\.0K/)).toBeInTheDocument()
    expect(kpis.getByText('New clients')).toBeInTheDocument()
    expect(kpis.getByText('New leads')).toBeInTheDocument()
    expect(kpis.getByText('Active partners')).toBeInTheDocument()
    expect(kpis.getByText('of 2')).toBeInTheDocument()
  })

  it('says which period is showing and what it is compared with', async () => {
    await renderPage()

    expect(screen.getByText(/This month \(1 – 30 Nov 2026\)/)).toBeInTheDocument()
    expect(screen.getByText(/compared with 1 – 31 Oct 2026/)).toBeInTheDocument()
    expect(screen.getByText('Host owner only')).toBeInTheDocument()
  })

  it('asks for this month in production first, and again when the period changes', async () => {
    await renderPage()
    expect(requests[0].get('period')).toBe('this_month')
    expect(requests[0].get('environment')).toBe('production')
    const periods = within(screen.getByRole('group', { name: 'Period' }))
    expect(periods.getByRole('button', { name: 'This month' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(periods.getByRole('button', { name: 'Last month' }))

    await waitFor(() => expect(lastRequest().get('period')).toBe('last_month'))
    expect(periods.getByRole('button', { name: 'Last month' })).toHaveAttribute('aria-pressed', 'true')
    expect(periods.getByRole('button', { name: 'This month' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('can switch to sandbox payments', async () => {
    await renderPage()

    await userEvent.click(within(screen.getByRole('group', { name: 'Payments' })).getByRole('button', { name: 'Sandbox' }))

    await waitFor(() => expect(lastRequest().get('environment')).toBe('sandbox'))
  })

  it('exports by printing the page', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    await renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Export PDF' }))

    expect(print).toHaveBeenCalledTimes(1)
    print.mockRestore()
  })

  it('lists what needs attention with a count and a link to its screen', async () => {
    await renderPage()
    const attention = within(screen.getByTestId('owner-attention'))

    expect(attention.getByRole('link', { name: /failed invoices/i })).toHaveAttribute('href', '/invoices')
    expect(attention.getByRole('link', { name: /manual payments to approve/i })).toHaveAttribute('href', '/payments')
    expect(attention.getByRole('link', { name: /commission payouts due/i })).toHaveAttribute('href', '/commissions')
    expect(attention.getByRole('link', { name: /stalled deals/i })).toHaveAttribute('href', '/intake-review/funding-application')
    expect(attention.getByText('1 failed · 0 disputed this period')).toBeInTheDocument()
    expect(attention.getByText('$4,000 owed to partners and staff')).toBeInTheDocument()
    expect(attention.getByText('1 partner · 0 clients within 14 days')).toBeInTheDocument()
  })

  it('greys out an item with nothing waiting', async () => {
    server.use(
      http.get('*/common/owner-summary', () =>
        HttpResponse.json(ownerSummaryResponse({ ...ownerSummaryFixture, attention: { ...ownerSummaryFixture.attention, suspended_partners: 0 } }))
      )
    )
    await renderPage()

    const item = screen.getByText('Suspended partners').closest('.os-attention__item') as HTMLElement
    expect(within(item).getByText('0')).toHaveClass('os-count--zero')
  })

  it('splits cash by stream and keeps booked commission apart from cash', async () => {
    await renderPage()
    const cash = within(screen.getByTestId('owner-cash'))

    expect(cash.getByText('Partner enrollment')).toBeInTheDocument()
    expect(cash.getByText('Borrower fees')).toBeInTheDocument()
    expect(cash.getByText('$1,000')).toBeInTheDocument()
    expect(cash.getByText('Four Corner client enrollment')).toBeInTheDocument()
    expect(cash.getByText('Total collected')).toBeInTheDocument()
    expect(cash.getByText('$1,550')).toBeInTheDocument()

    const commissions = within(screen.getByTestId('owner-commissions'))
    expect(commissions.getByText(/host share booked/i)).toBeInTheDocument()
    expect(commissions.getByText('$11,000')).toBeInTheDocument()
    expect(commissions.getByText(/not cash until the lender pays/i)).toBeInTheDocument()
  })

  it('splits what is owed by how late it is', async () => {
    await renderPage()
    const owed = within(screen.getByTestId('owner-owed'))

    expect(owed.getByText('3 invoices')).toBeInTheDocument()
    expect(owed.getByText('Unpaid over 30 days')).toBeInTheDocument()
    expect(owed.getByText('$120')).toBeInTheDocument()
    expect(owed.getByText('Payment failed')).toBeInTheDocument()
    expect(owed.getByRole('img')).toHaveAttribute('aria-label', expect.stringContaining('Payment failed $200'))
  })

  it('shows open applications by stage and how many reached each stage', async () => {
    await renderPage()
    const pipeline = within(screen.getByTestId('owner-pipeline'))

    expect(pipeline.getByText('2 open · $100.0K requested')).toBeInTheDocument()
    expect(pipeline.getByText('Underwriting')).toBeInTheDocument()
    expect(pipeline.getByText('$30,000')).toBeInTheDocument()
    expect(pipeline.getByText('With lender')).toBeInTheDocument()
    expect(pipeline.getByText('Reached funded')).toBeInTheDocument()
    expect(pipeline.getByText(/20 days median to fund/i)).toBeInTheDocument()
    expect(pipeline.getByText(/not one group followed through/i)).toBeInTheDocument()
  })

  it('shows the stalled deals with their real status and total', async () => {
    await renderPage()
    const stalled = within(screen.getByTestId('owner-stalled'))

    expect(stalled.getByText('1 deal · $30.0K requested')).toBeInTheDocument()
    expect(stalled.getByText('FUND-000044')).toBeInTheDocument()
    expect(stalled.getByText('Underwriting Review')).toBeInTheDocument()
    expect(stalled.getByText('45 days')).toHaveClass('os-idle--long')
    expect(stalled.getByRole('link', { name: 'Open FUND-000044' })).toHaveAttribute('href', '/intake-review/funding-application/4')
  })

  it('sorts the stalled deals by days idle or amount', async () => {
    const deal = ownerSummaryFixture.stalled_deals[0]
    server.use(
      http.get('*/common/owner-summary', () =>
        HttpResponse.json(ownerSummaryResponse({
          ...ownerSummaryFixture,
          stalled_deals: [
            { ...deal, id: 1, application_number: 'FUND-LONG', days_in_status: 60, requested_amount: 1000 },
            { ...deal, id: 2, application_number: 'FUND-BIG', days_in_status: 20, requested_amount: 90000 },
          ],
        }))
      )
    )
    await renderPage()
    const card = within(screen.getByTestId('owner-stalled'))
    const firstRow = () => card.getAllByRole('row')[1]

    expect(within(firstRow()).getByText('FUND-LONG')).toBeInTheDocument()

    await userEvent.selectOptions(card.getByLabelText('Sort by'), 'amount')

    expect(within(firstRow()).getByText('FUND-BIG')).toBeInTheDocument()
  })

  it('shows lead sources by their recorded name, with an unset source called out', async () => {
    await renderPage()
    const sources = within(screen.getByTestId('owner-sources'))

    expect(sources.getByText('3 leads, by lead source')).toBeInTheDocument()
    expect(sources.getByText('Referral Partner')).toBeInTheDocument()
    expect(sources.getByText('Source not set')).toBeInTheDocument()
    expect(sources.getByText('Embedded-form applications')).toBeInTheDocument()
    // Sources with no leads are left out.
    expect(sources.queryByText('Cold Outreach')).not.toBeInTheDocument()
  })

  it('draws both charts with the latest month highlighted', async () => {
    await renderPage()
    const funded = screen.getByTestId('owner-chart-funded')

    expect(within(funded).getByText('Funded volume by month')).toBeInTheDocument()
    expect(within(funded).getByText('$150.0K')).toBeInTheDocument()
    expect(within(funded).getByText('7.5× since Oct')).toBeInTheDocument()
    expect(funded.querySelectorAll('.os-chart__bar--current')).toHaveLength(1)
    expect(within(screen.getByTestId('owner-chart-cash')).getByText('Cash collected by month')).toBeInTheDocument()
  })

  it('shows a fall as a fall, not in the growth colour', async () => {
    server.use(
      http.get('*/common/owner-summary', () =>
        HttpResponse.json(ownerSummaryResponse({
          ...ownerSummaryFixture,
          monthly: [
            { month: '2026-10', funded: 100000, cash: 0 },
            { month: '2026-11', funded: 25000, cash: 0 },
          ],
        }))
      )
    )
    await renderPage()

    expect(within(screen.getByTestId('owner-chart-funded')).getByText('-75% since Oct')).toHaveClass('os-tag--down')
  })

  it('shows the partner network and the top partners', async () => {
    await renderPage()
    const network = within(screen.getByTestId('owner-network'))
    expect(network.getByText('White-label')).toBeInTheDocument()
    expect(network.getByText('1 of 2')).toBeInTheDocument()
    expect(network.getByText('1 · 1 end within 14 days')).toBeInTheDocument()

    const partners = within(screen.getByTestId('owner-top-partners'))
    expect(partners.getByText('Partner One')).toBeInTheDocument()
    expect(partners.getByText('White-label')).toHaveClass('os-tag--wl')
    expect(partners.getByText('$100,000')).toBeInTheDocument()
  })

  it('says what each number means', async () => {
    await renderPage()

    expect(screen.getByText(/funded = closed \(completed\)/i)).toBeInTheDocument()
  })

  it('says so when the API refuses the viewer', async () => {
    server.use(http.get('*/common/owner-summary', () => HttpResponse.json({ message: 'This action is unauthorized.' }, { status: 403 })))
    renderWithProviders(<OwnerSummary />, { route: '/owner-summary' })

    expect(await screen.findByText(/only the host owner can see this summary/i)).toBeInTheDocument()
  })

  it('does not break on a response without a summary in it', async () => {
    server.use(http.get('*/common/owner-summary', () => HttpResponse.json({ status: true, message: 'ok', data: [] })))
    renderWithProviders(<OwnerSummary />, { route: '/owner-summary' })

    expect(await screen.findByText(/the summary could not be loaded/i)).toBeInTheDocument()
  })

  it('shows a calm empty state when there are no stalled deals or top partners', async () => {
    server.use(
      http.get('*/common/owner-summary', () =>
        HttpResponse.json(ownerSummaryResponse({ ...ownerSummaryFixture, stalled_deals: [], top_partners: [] }))
      )
    )
    await renderPage()

    expect(within(screen.getByTestId('owner-stalled')).getByText(/no stalled deals/i)).toBeInTheDocument()
    expect(within(screen.getByTestId('owner-top-partners')).getByText(/no partner activity/i)).toBeInTheDocument()
  })
})
