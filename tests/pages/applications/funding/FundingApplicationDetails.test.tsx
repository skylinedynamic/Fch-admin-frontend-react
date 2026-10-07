import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen } from '../../../test-utils'
import FundingApplicationDetails from '../../../../src/pages/applications/funding/FundingApplicationDetails'
import { useAuthStore } from '../../../../src/store/auth/authStore'
import { FUNDING_APPLICATION_STATUS } from '../../../../src/config/borrower'
import { FUNDING_REVIEW_STATUS } from '../../../../src/config/funding'

const detail = vi.hoisted(() => ({ application: {} as Record<string, unknown> }))

vi.mock('../../../../src/modules/application/queries', async (original) => ({
  ...(await original<typeof import('../../../../src/modules/application/queries')>()),
  useFundingApplicationDetails: () => ({ data: { data: detail.application }, isLoading: false, error: null }),
  useUpdateFundingApplicationStatus: () => ({ mutate: vi.fn(), isPending: false }),
  useSaveFundingApplicationCommission: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('../../../../src/components/Common/Activity/ActivitySidebar', () => ({ default: () => null }))

// A submitted application on an approved request that is still at status key 9 or below.
const editable = {
  id: 80,
  partner_id: 1,
  borrower_id: 1,
  status: FUNDING_APPLICATION_STATUS.PENDING,
  funding_request_id: 29,
  funding_request_status: FUNDING_REVIEW_STATUS.APPROVED,
  is_editable: true,
  full_name: 'Michael Chen',
  business_name: 'Alpha Tech Solutions',
  co_borrowers: [],
  documents: [],
}

const editLink = () => screen.queryByRole('link', { name: /edit funding application/i })

describe('FundingApplicationDetails — Edit Funding Application', () => {
  beforeEach(() => {
    detail.application = { ...editable }
    useAuthStore.setState({ user: { id: 1, is_host: true, partner_id: 1, permissions: [] } as never })
  })

  it('offers Edit Funding Application, opening the edit form on the funding request', () => {
    renderWithProviders(<FundingApplicationDetails />)

    expect(editLink()).toHaveAttribute('href', '/fund-application/29')
  })

  it('hides it once the application has moved past the last editable status', () => {
    detail.application = { ...editable, status: FUNDING_APPLICATION_STATUS.MATCHED_TO_LENDER, is_editable: false }
    renderWithProviders(<FundingApplicationDetails />)

    expect(editLink()).not.toBeInTheDocument()
  })

  // Status keys 1-9 are all editable; the server sends that as is_editable.
  it.each([
    FUNDING_APPLICATION_STATUS.ON_HOLD,
    FUNDING_APPLICATION_STATUS.DRAFT,
    FUNDING_APPLICATION_STATUS.PENDING,
    FUNDING_APPLICATION_STATUS.APPROVED_CONDITIONAL,
    FUNDING_APPLICATION_STATUS.APPROVED_FINAL,
  ])('offers it at %s, because the status key is 9 or below', (status) => {
    detail.application = { ...editable, status }
    renderWithProviders(<FundingApplicationDetails />)

    expect(editLink()).toBeInTheDocument()
  })

  it('hides it when the funding request is not approved', () => {
    detail.application = { ...editable, funding_request_status: FUNDING_REVIEW_STATUS.PENDING }
    renderWithProviders(<FundingApplicationDetails />)

    expect(editLink()).not.toBeInTheDocument()
  })

  it('hides it when the application has no funding request to open the form on', () => {
    detail.application = { ...editable, funding_request_id: null }
    renderWithProviders(<FundingApplicationDetails />)

    expect(editLink()).not.toBeInTheDocument()
  })
})
