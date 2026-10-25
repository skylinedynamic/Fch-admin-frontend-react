import { describe, expect, it, vi } from 'vitest'
import { screen } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn, type TestUser } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import CommissionDetails from '../../../src/pages/commissions/CommissionDetails'

/** A commission as the API sends it to this viewer: money fields only where the viewer may see them. */
const commission = (over: Record<string, unknown> = {}) => ({
  id: 1201, partner_id: 1, partner_name: 'Host Co', partner_company_name: 'Host LLC', partner_logo: null,
  borrower_id: 7, borrower_name: 'Johnathan Smithfield', borrower_business_name: 'Smithfield Bakery',
  funding_requested_amount: 50000, funded_amount: 50000, funding_status: 'Closed (Completed)',
  commission_status: 'Processing', commission_payment_status: 'Unpaid', commission_note: null,
  currency_symbol: '$', conversion_rate: '1', ...over,
})

const open = async (user: TestUser, data: Record<string, unknown>) => {
  signIn({ permissions: ['view commission'], ...user })
  allowBackgroundCalls()
  api('get', '/common/commissions/1201', { status: true, message: 'ok', data })
  renderPage(<CommissionDetails />, { path: '/commissions/:id', route: '/commissions/1201' })
  await screen.findByText('Commission Status')
}

describe('CommissionDetails › per viewer', () => {
  it('shows host staff their own payout as their commission, without the breakdown', async () => {
    await open({ is_host: 1, entity_type: 'Employee' }, commission({
      viewer: 'host_staff',
      payout: {
        payee: { id: 9, type: 'user', name: 'Sam Seller', email: 'sam@host.test' }, paid_by: 'Per Deal', service: 'Funding',
        payout_type: 'Commission', rate: 20, base_label: 'Admin Commission', base_amount: 5000, amount: 1000,
        is_paid: false, paid_at: null, payment_method: null, can_pay: false,
      },
    }))

    const card = screen.getByText('My Commission').closest('.card') as HTMLElement
    expect(card).toHaveTextContent('$1,000')
    expect(screen.queryByText('Commission Breakdown')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pay/i })).not.toBeInTheDocument()
  })

  it('shows partner staff the deal without any commission money', async () => {
    await open({ is_host: 0, partner_id: 5, entity_type: 'Employee' }, commission({ viewer: 'partner_staff', partner_id: 5 }))

    expect(screen.queryByText('Your Commission')).not.toBeInTheDocument()
    expect(screen.queryByText('Total Commission')).not.toBeInTheDocument()
    expect(screen.queryByText('My Commission')).not.toBeInTheDocument()
    expect(screen.queryByText('Commission Breakdown')).not.toBeInTheDocument()
    // The deal itself still shows (as a card and in the funding details).
    expect(screen.getAllByText('Requested Amount').length).toBeGreaterThan(0)
  })
})
