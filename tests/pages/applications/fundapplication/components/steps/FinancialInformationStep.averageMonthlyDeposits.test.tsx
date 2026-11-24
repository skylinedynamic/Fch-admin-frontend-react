import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { http, HttpResponse } from 'msw'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { server } from '../../../../../mocks/server'
import { createTestQueryClient } from '../../../../../test-utils'
import FinancialInformationStep from '../../../../../../src/pages/applications/fundapplication/components/steps/FinancialInformationStep'
import type { FinancialInfo } from '../../../../../../src/pages/applications/fundapplication/types'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('react-flatpickr', () => ({
  default: ({ value, onChange, className, placeholder }: any) => (
    <input className={className} value={value || ''} placeholder={placeholder} onChange={(e: any) => onChange([e.target.value], e.target.value)} />
  ),
}))

/**
 * Ticket 512: Average Monthly Deposits on Step 3 (Financial Information) of
 * the admin/partner wizard - a dollar amount, sent apart from Monthly Revenue,
 * opened with the saved value.
 */
const financial: FinancialInfo = {
  id: null, monthlyRevenue: '10,000', annualRevenue: '', averageMonthlyDeposits: '', bankName: '', checkingStartDate: '2020-01-01',
  personalCreditScore: '700-749', businessCreditScore: '', existingDebt: false, debtBalance: '',
}

const STEP = '*/common/funding-application/financial-info'

function Harness({ onSaveReady }: { onSaveReady: (fn: () => Promise<boolean>) => void }) {
  const [f, setF] = useState(financial)
  return (
    <FinancialInformationStep financial={f} setFinancial={setF} onNext={() => {}} onBack={() => {}}
      loading={false} fundingRequestId={7} onRegisterSave={(fn) => fn && onSaveReady(fn)} />
  )
}

const renderStep = () => {
  let save: (() => Promise<boolean>) | null = null
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <Harness onSaveReady={(fn) => (save = fn)} />
    </QueryClientProvider>
  )
  return { getSave: () => save }
}

const capturePost = (into: { body: Record<string, unknown> }) =>
  server.use(
    http.get(STEP, () => HttpResponse.json({ status: true, data: { id: 21 } })),
    http.post(STEP, async ({ request }) => {
      into.body = (await request.json()) as Record<string, unknown>
      return HttpResponse.json({ status: true, data: { id: 21 } })
    }),
  )

describe('Financial Information step (admin wizard) - Average Monthly Deposits', () => {
  afterEach(() => {
    server.resetHandlers()
    vi.clearAllMocks()
  })

  it('opens with the saved amount', async () => {
    server.use(http.get(STEP, () =>
      HttpResponse.json({ status: true, data: { id: 21, monthly_revenue: '42000.00', average_monthly_deposits: '15000.50' } })))
    renderStep()

    expect(await screen.findByLabelText('Average Monthly Deposits')).toHaveValue('15,000.50')
    expect(screen.getByPlaceholderText('Enter monthly revenue')).toHaveValue('42,000.00')
  })

  it('sends the amount as a number, apart from monthly revenue', async () => {
    const sent = { body: {} as Record<string, unknown> }
    capturePost(sent)
    const { getSave } = renderStep()
    const input = await screen.findByLabelText('Average Monthly Deposits')

    await userEvent.type(input, '25000')
    expect(input).toHaveValue('25,000')

    await waitFor(() => expect(getSave()).toBeTruthy())
    await expect(getSave()!()).resolves.toBe(true)
    expect(sent.body.average_monthly_deposits).toBe('25000')
    expect(sent.body.monthly_revenue).toBe('10000')
  })

  it('is optional: the step can be saved without it', async () => {
    const sent = { body: {} as Record<string, unknown> }
    capturePost(sent)
    const { getSave } = renderStep()
    await screen.findByLabelText('Average Monthly Deposits')

    await waitFor(() => expect(getSave()).toBeTruthy())
    await expect(getSave()!()).resolves.toBe(true)
    expect(sent.body.average_monthly_deposits).toBe('')
  })

  it('shows the server error under the field', async () => {
    server.use(
      http.get(STEP, () => HttpResponse.json({ status: true, data: { id: 21 } })),
      http.post(STEP, () =>
        HttpResponse.json({ status: false, message: 'Invalid', errors: { average_monthly_deposits: ['Average monthly deposits cannot be negative'] } }, { status: 422 })),
    )
    const { getSave } = renderStep()
    await screen.findByLabelText('Average Monthly Deposits')

    await waitFor(() => expect(getSave()).toBeTruthy())
    await expect(getSave()!()).resolves.toBe(false)
    expect(await screen.findByText('Average monthly deposits cannot be negative')).toBeInTheDocument()
  })
})
