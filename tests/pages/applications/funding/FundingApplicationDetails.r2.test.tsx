import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, renderWithProviders, screen, waitFor } from '../../../test-utils'
import userEvent from '@testing-library/user-event'
import { useAuthStore } from '../../../../src/store/auth/authStore'
import { FUNDING_APPLICATION_STATUS } from '../../../../src/config/borrower'
import { FUNDING_REVIEW_STATUS } from '../../../../src/config/funding'

const mocks = vi.hoisted(() => ({
  application: {} as Record<string, unknown>,
  updateStatus: vi.fn(),
  saveCommission: vi.fn(),
  refetch: vi.fn(),
}))

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn() }) }
})

vi.mock('../../../../src/modules/application/queries', async (original) => ({
  ...(await original<typeof import('../../../../src/modules/application/queries')>()),
  useFundingApplicationDetails: () => ({ data: { data: mocks.application }, isLoading: false, error: null, refetch: mocks.refetch }),
  useUpdateFundingApplicationStatus: () => ({ mutate: mocks.updateStatus, isPending: false }),
  useSaveFundingApplicationCommission: () => ({ mutate: vi.fn(), mutateAsync: mocks.saveCommission, isPending: false }),
}))

vi.mock('../../../../src/components/Common/Activity/ActivitySidebar', () => ({ default: () => null }))
vi.mock('bootstrap/js/dist/modal', () => ({ default: class { show() {} hide() {} dispose() {} } }))

import { toast } from 'react-toastify'
import FundingApplicationDetails from '../../../../src/pages/applications/funding/FundingApplicationDetails'

const application = {
  id: 90,
  partner_id: 1,
  borrower_id: 1,
  status: FUNDING_APPLICATION_STATUS.PENDING,
  funding_request_id: 47,
  funding_request_status: FUNDING_REVIEW_STATUS.APPROVED,
  is_editable: true,
  full_name: 'QA-TEST Owner Client Two',
  business_name: 'QA Co',
  co_borrowers: [],
  documents: [],
  requested_amount_original: 12000,
  total_commission: 7.5,
  admin_commission: 100,
  partner_commission: 0,
}

describe('FundingApplicationDetails - QA round 2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.application = { ...application }
    useAuthStore.setState({
      user: { id: 1, is_host: true, partner_id: 1, permissions: ['update funding application', 'view commission', 'update commission'] } as never,
    })
  })

  // R2 BUG-037: the change carries the status this page shows, so a repeat or a stale page is refused.
  it('sends the status the page shows with a status change', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FundingApplicationDetails />)

    await user.click(screen.getByRole('button', { name: 'Update Status' }))
    await user.click(screen.getByRole('button', { name: 'Update', hidden: true }))

    expect(mocks.updateStatus).toHaveBeenCalledTimes(1)
    expect(mocks.updateStatus.mock.calls[0][0]).toMatchObject({ funding_application_id: 90, expected_status: FUNDING_APPLICATION_STATUS.PENDING })
  })

  it('says so and reloads when the status was changed elsewhere (409)', async () => {
    mocks.updateStatus.mockImplementation((_payload, options) =>
      options.onError({ response: { status: 409, data: { message: 'This application is already "Submitted (Received)".' } } })
    )
    const user = userEvent.setup()
    renderWithProviders(<FundingApplicationDetails />)

    await user.click(screen.getByRole('button', { name: 'Update Status' }))
    await user.click(screen.getByRole('button', { name: 'Update', hidden: true }))

    expect(toast.error).toHaveBeenCalledWith('This application is already "Submitted (Received)".')
    expect(mocks.refetch).toHaveBeenCalled()
  })

  // R2 BUG-036: 0 was refused with nothing on screen. The commission is now set
  // in the Closed (Completed) modal: its Success Fee takes the API's 1-100%, and
  // a refusal is shown under it and the application is not closed. Since R2
  // BUG-079 the modal refuses a fee outside 1-100% (or with a third decimal)
  // itself, so nothing is sent to the API for it.
  it('shows a refused Success Fee in the Closed modal and does not close', async () => {
    mocks.application = {
      ...application,
      status: FUNDING_APPLICATION_STATUS.APPROVED_FINAL,
      total_commission: null,
      admin_commission: null,
      partner_commission: null,
      has_assigned_lender: true,
      lender_required_statuses: [FUNDING_APPLICATION_STATUS.CLOSED],
    }
    mocks.saveCommission.mockRejectedValue({ response: { status: 422, data: { errors: { total_commission: ['The success fee commission must be at least 1.'] } } } })
    renderWithProviders(<FundingApplicationDetails />)

    await userEvent.click(document.querySelector('.p-dropdown') as HTMLElement)
    const closed = await waitFor(() => {
      const found = Array.from(document.body.querySelectorAll('.p-dropdown-panel .p-dropdown-item'))
        .find((el) => el.textContent?.trim() === FUNDING_APPLICATION_STATUS.CLOSED)
      if (!found) throw new Error('no Closed option')
      return found as HTMLElement
    })
    await userEvent.click(closed)
    await userEvent.click(screen.getByRole('button', { name: 'Update Status' }))

    const fee = await screen.findByLabelText('Success Fee (%)')
    expect(fee).toHaveAttribute('min', '1')
    expect(fee).toHaveAttribute('max', '100')
    await userEvent.type(fee, '0.5')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm & Update', hidden: true }))

    expect(await screen.findByText('Success fee must be between 1% and 100%.')).toBeInTheDocument()
    expect(fee).toHaveClass('is-invalid')
    expect(toast.error).not.toHaveBeenCalled()
    expect(mocks.saveCommission).not.toHaveBeenCalled()
    expect(mocks.updateStatus).not.toHaveBeenCalled()
  })
})
