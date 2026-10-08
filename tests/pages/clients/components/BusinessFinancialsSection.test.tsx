import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { act, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { server } from '../../../mocks/server'
import BusinessFinancialsSection, {
  type BusinessFinancialsSectionRef,
} from '../../../../src/pages/clients/components/BusinessFinancialsSection'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

/**
 * Annual Personal Income on a client's Business Financials section.
 *
 * It is optional, but once entered it could not be changed, set to zero or
 * removed: the section showed the field and then left it out of what it saved,
 * so the old amount came back on reload. These cover the screen's half of the
 * fix - that the field is sent, sent unformatted, and sent as "cleared" when it
 * is emptied.
 */

const financials = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  currency: 'USD',
  monthly_revenue: '50,000.00',
  annual_revenue: '600,000.00',
  annual_personal_income: '1,000,000.00',
  avg_bank_balance: null,
  average_monthly_deposits: null,
  monthly_deposit_count: null,
  profit_margin: null,
  current_business_debt: null,
  fico_score: null,
  paydex_score: null,
  number_of_employees: null,
  nsf_count: null,
  negative_days: null,
  funding_urgency: null,
  bank_accounts: [],
  ...overrides,
})

/**
 * Serves the section's data and records what each save sends. The save answers
 * the way the API does: the amount it stored, formatted, or null when cleared.
 */
const mockApi = (initial: Record<string, unknown> = {}) => {
  const saved: Array<Record<string, any>> = []

  server.use(
    http.get('*/common/borrowers/business-financials/:id', () =>
      HttpResponse.json({ status: true, data: financials(initial) })
    ),
    http.post('*/common/borrowers/:id/business-financials', async ({ request }) => {
      const body = (await request.json()) as Record<string, any>
      saved.push(body)

      const income = body.annual_personal_income
      const stored =
        income === null || income === undefined || income === ''
          ? null
          : Number(income).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

      return HttpResponse.json({ status: true, data: financials({ ...initial, annual_personal_income: stored }) })
    })
  )

  return saved
}

const renderSection = () => {
  const ref = createRef<BusinessFinancialsSectionRef>()
  renderWithProviders(<BusinessFinancialsSection ref={ref} clientId="1" />)

  return ref
}

const incomeField = () => screen.findByLabelText('Annual Personal Income') as Promise<HTMLInputElement>

const save = async (ref: React.RefObject<BusinessFinancialsSectionRef | null>) => {
  await act(async () => {
    await ref.current!.save()
  })
}

describe('Client business financials - Annual Personal Income', () => {
  afterEach(() => server.resetHandlers())

  it('shows the stored amount when the section loads', async () => {
    mockApi()
    renderSection()

    expect(await incomeField()).toHaveValue('1,000,000.00')
  })

  it('sends a changed amount on save, without the thousands separators', async () => {
    const saved = mockApi()
    const user = userEvent.setup()
    const ref = renderSection()

    const field = await incomeField()
    await user.clear(field)
    await user.type(field, '85000.50')
    // Formatted for reading as it is typed...
    expect(field).toHaveValue('85,000.50')

    await save(ref)

    // ...and sent as a plain number.
    expect(saved).toHaveLength(1)
    expect(saved[0]).toHaveProperty('annual_personal_income', '85000.50')
    await waitFor(() => expect(field).toHaveValue('85,000.50'))
  })

  it('sends an emptied field as cleared, and leaves it empty afterwards', async () => {
    const saved = mockApi()
    const user = userEvent.setup()
    const ref = renderSection()

    const field = await incomeField()
    await user.clear(field)
    expect(field).toHaveValue('')

    await save(ref)

    // The key is present and null. Left out, or sent as '', the server would
    // keep the old amount and it would reappear on reload.
    expect(saved[0]).toHaveProperty('annual_personal_income', null)
    await waitFor(() => expect(field).toHaveValue(''))
  })

  it('lets the amount be set to zero', async () => {
    const saved = mockApi()
    const user = userEvent.setup()
    const ref = renderSection()

    const field = await incomeField()
    await user.clear(field)
    await user.type(field, '0')

    await save(ref)

    expect(saved[0]).toHaveProperty('annual_personal_income', '0')
    // The API answers "0.00"; the field shows the zero rather than going blank.
    await waitFor(() => expect(field).toHaveValue('0.00'))
  })

  it('is optional: a client with no amount saves it as cleared, not as an error', async () => {
    const saved = mockApi({ annual_personal_income: null })
    const ref = renderSection()

    const field = await incomeField()
    expect(field).toHaveValue('')

    await save(ref)

    expect(saved[0]).toHaveProperty('annual_personal_income', null)
  })

  it('clears the other money fields the same way when they are emptied', async () => {
    const saved = mockApi()
    const user = userEvent.setup()
    const ref = renderSection()

    await incomeField()
    await user.clear(screen.getByLabelText(/Annual Revenue/i))

    await save(ref)

    expect(saved[0]).toHaveProperty('annual_revenue', null)
    // Untouched fields keep their amounts.
    expect(saved[0]).toHaveProperty('monthly_revenue', '50000.00')
    expect(saved[0]).toHaveProperty('annual_personal_income', '1000000.00')
  })
})
