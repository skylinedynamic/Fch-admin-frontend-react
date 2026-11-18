import { describe, expect, it, vi } from 'vitest'
import { screen, within } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn, type TestUser } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import CommissionDetails from '../../../src/pages/commissions/CommissionDetails'

/**
 * Commission details: a partner share from a Flat Amount tier (Partner
 * profile › Commissions) is a fixed $. It showed as "1.67%" / "98.33%" - a
 * rounded % of the success fee - everywhere on the page.
 */
const commission = (over: Record<string, unknown> = {}) => ({
  id: 1201, partner_id: 5, partner_name: 'Acme', partner_company_name: 'Acme Funding', partner_logo: null,
  borrower_id: 7, borrower_name: 'Johnathan Smithfield', borrower_business_name: 'Smithfield Bakery',
  funding_requested_amount: 250000, funded_amount: 250000, funding_status: 'Closed (Completed)',
  commission_status: 'Processing', commission_payment_status: 'Unpaid', commission_note: null,
  currency_symbol: '$', conversion_rate: '1',
  total_commission: '12.00', admin_commission: '98.33', partner_commission: '1.67',
  total_commission_amount: '30000.00', admin_commission_amount: '29500.00', partner_commission_amount: '500.00',
  ...over,
})

const partnerPayout = (over: Record<string, unknown> = {}) => ({
  payee: { id: 5, type: 'partner', name: 'Acme Funding', email: 'acme@example.test' }, paid_by: null, service: null,
  payout_type: 'Flat Amount', rate: null, base_label: 'Total Commission', base_amount: 30000, amount: 500,
  is_paid: false, paid_at: null, payment_method: null, can_pay: true,
  ...over,
})

const open = async (user: TestUser, data: Record<string, unknown>) => {
  signIn({ permissions: ['view commission', 'update commission'], ...user })
  allowBackgroundCalls()
  api('get', '/common/commissions/1201', { status: true, message: 'ok', data })
  renderPage(<CommissionDetails />, { path: '/commissions/:id', route: '/commissions/1201' })
  await screen.findByText('Commission Status')
}

const breakdownRow = (label: string) =>
  within(screen.getByText('Commission Breakdown').closest('.card') as HTMLElement).getByText(label).closest('tr') as HTMLElement

describe('CommissionDetails › a flat partner commission', () => {
  it('shows the host the partner share as a flat amount, with no rounded %', async () => {
    await open({ is_host: 1, entity_type: 'Partner' }, commission({ viewer: 'host_owner', partner_commission_type: 'flat', payout: partnerPayout() }))

    expect(breakdownRow('Success Fee')).toHaveTextContent('12.00%')
    expect(breakdownRow('Partner Commission')).toHaveTextContent('Flat amount')
    expect(breakdownRow('Partner Commission')).toHaveTextContent('$500')
    expect(breakdownRow('Admin Commission')).toHaveTextContent('$29,500')
    expect(screen.queryByText(/1\.67%/)).not.toBeInTheDocument()
    expect(screen.queryByText(/98\.33%/)).not.toBeInTheDocument()
    // The payout to the partner: a Flat Amount, not "x% of Total Commission".
    expect(screen.getAllByText('Flat Amount').length).toBeGreaterThan(0)
    expect(screen.queryByText(/% of Total Commission/)).not.toBeInTheDocument()
  })

  it('shows the partner its commission as a flat amount, not a % rate', async () => {
    await open({ is_host: 0, partner_id: 5, entity_type: 'Partner' }, commission({ viewer: 'partner_owner', partner_commission_type: 'flat', admin_commission: undefined, admin_commission_amount: undefined }))

    const card = screen.getByText('Your Commission').closest('.card') as HTMLElement
    expect(card).toHaveTextContent('$500')
    expect(card).toHaveTextContent('Flat amount')
    expect(card).not.toHaveTextContent('% Rate')
  })

  it('still shows a percentage share as its %', async () => {
    await open({ is_host: 1, entity_type: 'Partner' }, commission({
      viewer: 'host_owner', partner_commission_type: 'percentage',
      admin_commission: '80.00', partner_commission: '20.00', admin_commission_amount: '24000.00', partner_commission_amount: '6000.00',
      payout: partnerPayout({ payout_type: 'Commission', rate: 20, amount: 6000 }),
    }))

    expect(breakdownRow('Partner Commission')).toHaveTextContent('20.00%')
    expect(breakdownRow('Admin Commission')).toHaveTextContent('80.00%')
  })
})
