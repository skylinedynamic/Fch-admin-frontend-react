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
  useSaveFundingApplicationCommission: () => ({ mutate: mocks.saveCommission, isPending: false }),
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

  // R2 BUG-045: the change carries the status this page shows, so a repeat or a stale page is refused.
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

  // R2 BUG-044: 0 was refused with nothing on screen, and the card showed the unsaved 0%.
  it('shows a refused Success Fee and keeps the card on the saved rate', async () => {
    mocks.saveCommission.mockImplementation((_payload, options) =>
      options.onError({ response: { status: 422, data: { errors: { total_commission: ['The success fee commission must be at least 1.'] } } } })
    )
    renderWithProviders(<FundingApplicationDetails />)

    const fee = screen.getByLabelText('Success Fee (%)')
    expect(fee).toHaveAttribute('min', '1')
    expect(fee).toHaveAttribute('max', '100')
    fireEvent.change(fee, { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: /save commission/i }))

    expect(await screen.findByText('The success fee commission must be at least 1.')).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith('The success fee commission must be at least 1.')
    await waitFor(() => expect(screen.getByLabelText('Success Fee (%)')).toHaveValue(7.5))
    expect(screen.getByText('7.5% of success fee')).toBeInTheDocument()
  })
})
