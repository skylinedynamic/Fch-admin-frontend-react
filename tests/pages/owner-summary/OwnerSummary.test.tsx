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
  it('shows the seven headline numbers, split between host and partners', async () => {
    await renderPage()
    const card = (key: string) => within(screen.getByTestId(`owner-kpi-${key}`))
    const row = (key: string, label: string) => within(card(key).getByText(label).closest('.os-kpi__row') as HTMLElement)

    expect(within(screen.getByTestId('owner-kpis')).getAllByText(/./, { selector: '.os-label' }).map((el) => el.textContent)).toEqual([
      'Net Earnings', 'Funded Volume', 'Funded Deals', 'Partners', 'Clients', 'Leads', 'Lead-To-Funded',
    ])

    expect(card('net').getByText('$1.6K')).toBeInTheDocument()
    expect(card('net').getByText('+288%')).toBeInTheDocument()
    expect(card('net').getByText('vs $400 before')).toBeInTheDocument()

    expect(card('funded').getByText('$150.0K')).toBeInTheDocument()
    expect(row('funded', 'FCH').getByText('$50.0K')).toBeInTheDocument()
    expect(row('funded', 'Partners').getByText('$100.0K')).toBeInTheDocument()

    expect(card('deals').getByText('2')).toBeInTheDocument()
    expect(card('deals').getByText('+100%')).toBeInTheDocument()
    expect(row('deals', 'FCH').getByText('1')).toBeInTheDocument()
    expect(row('deals', 'Partners').getByText('1')).toBeInTheDocument()

    expect(card('partners').getByText('2', { selector: '.os-kpi__value' })).toBeInTheDocument()
    expect(row('partners', 'Active').getByText('1')).toBeInTheDocument()

    expect(card('clients').getByText('40')).toBeInTheDocument()
    expect(row('clients', 'Active').getByText('35')).toBeInTheDocument()
    // Archived clients are left out of this as well, so it can't exceed the total.
    expect(row('clients', 'New this period').getByText('8')).toBeInTheDocument()

    expect(card('leads').getByText('3')).toBeInTheDocument()
    expect(row('leads', 'FCH').getByText('1')).toBeInTheDocument()
    expect(row('leads', 'Partners').getByText('2')).toBeInTheDocument()

    expect(card('conversion').getByText('20%')).toBeInTheDocument()
    expect(row('conversion', 'FCH').getByText('25% (1 of 4)')).toBeInTheDocument()
    expect(row('conversion', 'Partners').getByText('17% (1 of 6)')).toBeInTheDocument()
  })

  it('puts net earnings, commissions and what is owed right after the top cards', async () => {
    await renderPage()

    const order = ['owner-kpis', 'owner-cash', 'owner-commissions', 'owner-owed', 'owner-attention'].map((id) => screen.getByTestId(id))
    order.slice(1).forEach((section, i) => {
      expect(order[i].compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })
  })

  it('shows a dash, not 0%, when there were no leads to convert', async () => {
    server.use(
      http.get('*/common/owner-summary', () =>
        HttpResponse.json(ownerSummaryResponse({
          ...ownerSummaryFixture,
          kpis: {
            ...ownerSummaryFixture.kpis,
            lead_conversion: { host: { leads: 0, funded: 0 }, partners: { leads: 0, funded: 0 } },
          },
        }))
      )
    )
    await renderPage()

    const card = within(screen.getByTestId('owner-kpi-conversion'))
    expect(card.getAllByText('—')).toHaveLength(3)
  })

  it('says which period is showing and what it is compared with', async () => {
    await renderPage()

    expect(screen.getByText(/This month \(1 – 30 Nov 2026\)/)).toBeInTheDocument()
    expect(screen.getByText(/compared with 1 – 31 Oct 2026/)).toBeInTheDocument()
    expect(screen.getByText('FCH owner only')).toBeInTheDocument()
  })

  describe('loading', () => {
    // Holds the API's answer until released, so the loading state can be looked at.
    const holdResponse = () => {
      let release = () => {}
      const gate = new Promise<void>((resolve) => { release = resolve })
      server.use(
        http.get('*/common/owner-summary', async () => {
          await gate
          return HttpResponse.json(ownerSummaryResponse())
        })
      )
      return () => release()
    }

    it('mirrors the page while it loads, then gives way to the numbers', async () => {
      const release = holdResponse()
      renderWithProviders(<OwnerSummary />, { route: '/owner-summary' })

      const skeleton = await screen.findByTestId('owner-skeleton')
      expect(skeleton).toHaveAttribute('aria-busy', 'true')
      expect(screen.getByRole('status', { name: 'Loading summary' })).toBe(skeleton)
      expect(skeleton.querySelectorAll('.os-kpi')).toHaveLength(7)
      // Partners and Clients have no comparison line on the loaded page either.
      expect(skeleton.querySelectorAll('.os-kpi__foot')).toHaveLength(5)
      expect(skeleton.querySelectorAll('.os-kpi__rows')).toHaveLength(6)
      expect(skeleton.querySelector('.os-row .os-grow-wide')).not.toBeNull()
      expect(skeleton.querySelectorAll('.os-row .os-grow-side .os-card')).toHaveLength(2)
      expect(skeleton.querySelector('.os-attention')).not.toBeNull()
      expect(skeleton).toHaveTextContent('')

      release()

      await screen.findByTestId('owner-kpis')
      expect(screen.queryByTestId('owner-skeleton')).not.toBeInTheDocument()
    })

    it.each([
      ['period', 'This week'],
      ['payments switch', 'Sandbox'],
    ])('keeps the numbers on screen when the %s changes', async (_, name) => {
      await renderPage()
      const release = holdResponse()

      await userEvent.click(screen.getByRole('button', { name }))

      expect(screen.queryByTestId('owner-skeleton')).not.toBeInTheDocument()
      expect(screen.getByTestId('owner-kpis')).toBeInTheDocument()
      release()
    })

    it('shows the message, not the skeleton, when loading fails', async () => {
      server.use(http.get('*/common/owner-summary', () => HttpResponse.json({ message: 'x' }, { status: 403 })))
      renderWithProviders(<OwnerSummary />, { route: '/owner-summary' })

      await screen.findByText('Only the FCH owner can see this summary.')
      expect(screen.queryByTestId('owner-skeleton')).not.toBeInTheDocument()
    })
  })

  describe('payments switch', () => {
    const choose = async (name: string) =>
      userEvent.click(within(screen.getByRole('group', { name: 'Payments' })).getByRole('button', { name }))

    // Answers with the mode it was asked for, as the API does.
    const echoEnvironment = () =>
      server.use(
        http.get('*/common/owner-summary', ({ request }) => {
          const params = new URL(request.url).searchParams
          requests.push(params)
          return HttpResponse.json(ownerSummaryResponse({ ...ownerSummaryFixture, environment: params.get('environment') as string }))
        })
      )

    it('offers all three and starts on Production', async () => {
      await renderPage()

      const buttons = within(screen.getByRole('group', { name: 'Payments' })).getAllByRole('button')
      expect(buttons.map((button) => button.textContent)).toEqual(['All Payment', 'Production', 'Sandbox'])
      expect(screen.getByRole('button', { name: 'Production' })).toHaveAttribute('aria-pressed', 'true')
      expect(requests[0].get('environment')).toBe('production')
    })

    it.each([
      ['All Payment', 'all', /All Payment/],
      ['Sandbox', 'sandbox', /Sandbox payments/],
    ])('%s asks the API for it and says so', async (name, environment, showing) => {
      echoEnvironment()
      await renderPage()

      await choose(name)

      await waitFor(() => expect(lastRequest().get('environment')).toBe(environment))
      expect(await screen.findByText(showing, { selector: '.os-showing, .os-showing *' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByTestId('owner-environment-note')).toHaveTextContent('only changes payment numbers')
    })

    it('needs no warning on Production', async () => {
      echoEnvironment()
      await renderPage()

      expect(screen.getByText(/Production payments/, { selector: '.os-showing, .os-showing *' })).toBeInTheDocument()
      expect(screen.queryByTestId('owner-environment-note')).not.toBeInTheDocument()
    })

    it('keeps the chosen period', async () => {
      await renderPage()
      await userEvent.click(screen.getByRole('button', { name: 'This week' }))
      await waitFor(() => expect(lastRequest().get('period')).toBe('this_week'))

      await choose('Sandbox')

      await waitFor(() => expect(lastRequest().get('environment')).toBe('sandbox'))
      expect(lastRequest().get('period')).toBe('this_week')
    })

    it('keeps the mode when the period changes', async () => {
      await renderPage()
      await choose('Sandbox')
      await waitFor(() => expect(lastRequest().get('environment')).toBe('sandbox'))

      await userEvent.click(screen.getByRole('button', { name: 'This week' }))

      await waitFor(() => expect(lastRequest().get('period')).toBe('this_week'))
      expect(lastRequest().get('environment')).toBe('sandbox')
    })
  })

  it('asks for this month first, and again when the period changes', async () => {
    await renderPage()
    expect(requests[0].get('period')).toBe('this_month')
    const periods = within(screen.getByRole('group', { name: 'Period' }))
    expect(periods.getByRole('button', { name: 'This month' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(periods.getByRole('button', { name: 'This week' }))

    await waitFor(() => expect(lastRequest().get('period')).toBe('this_week'))
    expect(periods.getByRole('button', { name: 'This week' })).toHaveAttribute('aria-pressed', 'true')
    expect(periods.getByRole('button', { name: 'This month' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('offers this week, this month and a custom range', async () => {
    await renderPage()

    const buttons = within(screen.getByRole('group', { name: 'Period' })).getAllByRole('button')

    expect(buttons.map((button) => button.textContent)).toEqual(['This week', 'This month', 'Custom'])
  })

  describe('custom range', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date(2026, 10, 9, 10, 0, 0))
    })

    afterEach(() => vi.useRealTimers())

    const openCustom = async () => {
      await renderPage()
      await userEvent.click(within(screen.getByRole('group', { name: 'Period' })).getByRole('button', { name: 'Custom' }))
    }

    it('is hidden until Custom is chosen, and hides again for another period', async () => {
      await renderPage()
      expect(screen.queryByLabelText('From')).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Custom' }))
      expect(screen.getByLabelText('From')).toBeInTheDocument()
      expect(screen.getByText('Not in the future. Compared with the same number of days just before.')).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'This week' }))
      expect(screen.queryByLabelText('From')).not.toBeInTheDocument()
    })

    it('starts on the year up to today and asks for nothing until Apply', async () => {
      await openCustom()

      expect(screen.getByLabelText('From')).toHaveValue('09 Nov, 2025')
      expect(screen.getByLabelText('To')).toHaveValue('09 Nov, 2026')
      expect(requests).toHaveLength(1)

      await userEvent.click(screen.getByRole('button', { name: 'Apply' }))

      await waitFor(() => expect(lastRequest().get('period')).toBe('custom'))
      expect(lastRequest().get('from')).toBe('2025-11-09')
      expect(lastRequest().get('to')).toBe('2026-11-09')
    })

    it('uses the app calendar, stopping at today, to pick a date', async () => {
      await openCustom()

      await userEvent.click(screen.getByLabelText('To'))
      const panel = await waitFor(() => {
        const el = document.querySelector('.p-datepicker')
        expect(el).not.toBeNull()
        return el as HTMLElement
      })
      const day = (n: number) =>
        Array.from(panel.querySelectorAll('td:not(.p-datepicker-other-month) span')).find((s) => s.textContent === String(n)) as HTMLElement
      // Today is the 9th: the 15th is in the future and cannot be picked.
      await userEvent.click(day(15))
      expect(screen.getByLabelText('To')).toHaveValue('09 Nov, 2026')

      await userEvent.click(day(5))
      await userEvent.click(screen.getByRole('button', { name: 'Apply' }))

      await waitFor(() => expect(lastRequest().get('to')).toBe('2026-11-05'))
      expect(lastRequest().get('from')).toBe('2025-11-09')
    })

    it('says which range is showing and how long the comparison is', async () => {
      server.use(
        http.get('*/common/owner-summary', () =>
          HttpResponse.json(ownerSummaryResponse({
            ...ownerSummaryFixture,
            period: { ...ownerSummaryFixture.period, key: 'custom', from: '2026-10-01', to: '2026-10-31', previous_from: '2026-08-31', previous_to: '2026-09-30' },
          }))
        )
      )
      await renderPage()

      expect(screen.getByText(/1 – 31 Oct 2026 \(custom\)/)).toBeInTheDocument()
      expect(screen.getByText(/compared with 31 days before \(31 Aug – 30 Sep 2026\)/)).toBeInTheDocument()
      expect(within(screen.getByTestId('owner-cash')).getByRole('columnheader', { name: 'Selected range' })).toBeInTheDocument()
    })

    it('shows a refused range under its field and keeps the numbers on screen', async () => {
      await openCustom()
      server.use(
        http.get('*/common/owner-summary', () =>
          HttpResponse.json({ message: 'The end date cannot be before the start date.', errors: { to: ['The end date cannot be before the start date.'] } }, { status: 422 })
        )
      )

      await userEvent.click(screen.getByRole('button', { name: 'Apply' }))

      const message = await screen.findByText('The end date cannot be before the start date.')
      expect(message.closest('[data-field="to"]')).not.toBeNull()
      expect(within(screen.getByTestId('owner-kpis')).getByText('$1.6K')).toBeInTheDocument()
      expect(screen.queryByText(/the summary could not be loaded/i)).not.toBeInTheDocument()
    })

    it('reads an error sent as one string per field too', async () => {
      await openCustom()
      server.use(
        http.get('*/common/owner-summary', () =>
          HttpResponse.json({ status: false, message: 'Choose a start date.', errors: { from: 'Choose a start date.' } }, { status: 422 })
        )
      )

      await userEvent.click(screen.getByRole('button', { name: 'Apply' }))

      const message = await screen.findByText('Choose a start date.')
      expect(message.closest('[data-field="from"]')).not.toBeNull()
    })

    it('drops the error once the date is changed', async () => {
      await openCustom()
      server.use(
        http.get('*/common/owner-summary', () =>
          HttpResponse.json({ message: 'x', errors: { to: ['The end date cannot be before the start date.'] } }, { status: 422 })
        )
      )
      await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
      await screen.findByText('The end date cannot be before the start date.')

      await userEvent.click(screen.getByLabelText('To'))
      const panel = await waitFor(() => {
        const el = document.querySelector('.p-datepicker')
        expect(el).not.toBeNull()
        return el as HTMLElement
      })
      await userEvent.click(
        Array.from(panel.querySelectorAll('td:not(.p-datepicker-other-month) span')).find((s) => s.textContent === '5') as HTMLElement
      )

      expect(screen.queryByText('The end date cannot be before the start date.')).not.toBeInTheDocument()
    })
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
    expect(commissions.getByText(/FCH share booked/i)).toBeInTheDocument()
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

    expect(within(funded).getByText('Funded Volume By Month')).toBeInTheDocument()
    expect(within(funded).getByText('$150.0K')).toBeInTheDocument()
    expect(within(funded).getByText('7.5× since Oct')).toBeInTheDocument()
    expect(funded.querySelectorAll('.os-chart__bar--current')).toHaveLength(1)
    expect(within(screen.getByTestId('owner-chart-cash')).getByText('Net Earnings By Month')).toBeInTheDocument()
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

    expect(await screen.findByText(/only the FCH owner can see this summary/i)).toBeInTheDocument()
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
