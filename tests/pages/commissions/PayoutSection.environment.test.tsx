import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import PayoutSection from '../../../src/pages/commissions/components/PayoutSection'
import { PAYMENT_ENVIRONMENT } from '../../../src/config/paymentEnvironment'
import type { CommissionPayout } from '../../../src/modules/commission/types'

const PAYOUT_URL = '/admin/commission/1201/payout'

const payout = (over: Partial<CommissionPayout> = {}): CommissionPayout => ({
  payee: { id: 5, type: 'partner', name: 'Acme Funding', email: 'acme@example.test' },
  paid_by: null, service: null, payout_type: 'Commission', rate: 60,
  base_label: 'Total Commission', base_amount: 4500, amount: 2700,
  is_paid: false, paid_at: null, payment_method: null, can_pay: true,
  default_environment: PAYMENT_ENVIRONMENT.SANDBOX,
  ...over,
})

const mount = (over: Partial<CommissionPayout> = {}) => {
  signIn({ permissions: ['view commission'] })
  allowBackgroundCalls()
  const seen = api('post', PAYOUT_URL, { status: true, message: 'ok', data: {} })
  renderPage(<PayoutSection commissionId={1201} payout={payout(over)} currencySymbol="$" conversionRate="1" />, { path: '/commissions/:id', route: '/commissions/1201' })
  return seen
}

/** The Environment dropdown inside the open payout dialog. */
const environmentDropdown = () =>
  Array.from(document.querySelectorAll('.modal .p-dropdown')).find((el) =>
    el.closest('.mb-4')?.querySelector('label')?.textContent?.includes('Environment')
  ) as HTMLElement

/**
 * A commission payout goes through no gateway, so the host says whether it was
 * real money or a test, and the payment is filed under that environment. The
 * dialog starts on what the API suggests: Production on the production app,
 * Sandbox everywhere else.
 */
describe('PayoutSection - environment', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts on the environment the API suggests', async () => {
    const user = userEvent.setup()
    mount({ default_environment: PAYMENT_ENVIRONMENT.PRODUCTION })

    await user.click(screen.getByRole('button', { name: /make payment/i }))

    expect(environmentDropdown()).toHaveTextContent('Production')
  })

  it('sends the suggested environment when it is left as it is', async () => {
    const user = userEvent.setup()
    const seen = mount({ default_environment: PAYMENT_ENVIRONMENT.SANDBOX })

    await user.click(screen.getByRole('button', { name: /make payment/i }))
    await user.click(screen.getByRole('button', { name: /confirm payout/i }))

    await waitFor(() => expect(seen.bodies[0]).toMatchObject({ partner_payment_method: 'Cash', environment: PAYMENT_ENVIRONMENT.SANDBOX }))
  })

  it('sends the environment the host picks', async () => {
    const user = userEvent.setup()
    const seen = mount({ default_environment: PAYMENT_ENVIRONMENT.SANDBOX })

    await user.click(screen.getByRole('button', { name: /make payment/i }))
    await user.click(environmentDropdown())
    const production = await waitFor(() => {
      const item = Array.from(document.body.querySelectorAll('.p-dropdown-panel .p-dropdown-item')).find((el) => el.textContent === 'Production')
      if (!item) throw new Error('the Environment dropdown did not open')
      return item as HTMLElement
    })
    await user.click(production)
    await user.click(screen.getByRole('button', { name: /confirm payout/i }))

    await waitFor(() => expect(seen.bodies[0]).toMatchObject({ environment: PAYMENT_ENVIRONMENT.PRODUCTION }))
  })
})
