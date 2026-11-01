import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import PartnerProfile from '../../../src/pages/partners/PartnerProfile'

// What GET /common/partner-plans sends for an installment plan (SubscriptionPlanResource).
const installmentPlan = (upto: number) => ({
  id: 8,
  partner_type: 'Certified Partner',
  enrollment_type: 'Installment',
  enrollment_type_slug: 'installment',
  total_amount: 5496.7,
  platform_fee: 299,
  total_installment_count_upto: upto,
  is_installment: true,
  supports_installment: true,
  installment_min_months: 2,
  installment_max_months: upto,
  installment_default_months: upto > 12 ? 12 : upto,
})

const dropdown = (label: string) =>
  screen.getByText(label, { selector: 'label' }).parentElement!.querySelector('.p-dropdown') as HTMLElement

const pick = async (user: ReturnType<typeof userEvent.setup>, label: string, option: string) => {
  await user.click(dropdown(label))
  const item = await waitFor(() => {
    const found = Array.from(dropdown(label).querySelectorAll('.p-dropdown-item')).find((o) => o.textContent === option)
    expect(found).toBeTruthy()
    return found as HTMLElement
  })
  await user.click(item)
}

const chooseInstallment = async (upto: number) => {
  signIn({ permissions: ['view partners', 'create partners', 'update partners'] })
  allowBackgroundCalls()
  api('get', '/common/partner-plans', { status: true, message: 'ok', data: [installmentPlan(upto)] })
  const user = userEvent.setup()
  renderPage(<PartnerProfile />, { path: '/partners/create' })

  await waitFor(() => expect(dropdown('Partner Type')).toBeTruthy())
  await pick(user, 'Partner Type', 'Certified Partner')
  await pick(user, 'Enrollment Type', 'Installment')
}

const duration = () => screen.getByText(/Installment Duration:/).closest('div')!.querySelector('.info-value')!.textContent
const monthly = () => screen.getByText(/Monthly Installment Amount:/).closest('div')!.querySelector('.amount-value')!.textContent

beforeEach(() => vi.clearAllMocks())

// BUG-114: the installment card defaults to 12 months, or to the plan's
// "Installment Upto" when that is under 12.
describe('Partner create › installment default months', () => {
  it('is 12 months when the plan allows more', async () => {
    await chooseInstallment(24)

    await waitFor(() => expect(duration()).toBe('12 Months'))
    expect(monthly()).toBe('$458.06')
  })

  it("is the plan's Installment Upto when that is under 12", async () => {
    await chooseInstallment(6)

    await waitFor(() => expect(duration()).toBe('6 Months'))
    expect(monthly()).toBe('$916.12')
  })

  // The calculator opens with the card's months, not a fixed 12.
  it.each([[24, '12 Months'], [6, '6 Months']])('the calculator opens at the plan default (Installment Upto %i)', async (upto, label) => {
    await chooseInstallment(upto)
    await waitFor(() => expect(duration()).toBe(label))

    await userEvent.setup().click(screen.getByRole('button', { name: /View (Payment|Installment) Details/ }))

    const calculator = screen.getByText('Installment Duration', { selector: 'label' }).closest('.idm-form-group') as HTMLElement
    await waitFor(() => expect(calculator.querySelector('.p-dropdown-label')).toHaveTextContent(label))
  })
})
