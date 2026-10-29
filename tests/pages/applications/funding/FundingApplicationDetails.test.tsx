import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen } from '../../../test-utils'
import userEvent from '@testing-library/user-event'
import FundingApplicationDetails from '../../../../src/pages/applications/funding/FundingApplicationDetails'
import { useAuthStore } from '../../../../src/store/auth/authStore'
import { FUNDING_APPLICATION_STATUS } from '../../../../src/config/borrower'
import { FUNDING_REVIEW_STATUS } from '../../../../src/config/funding'
import { PARTNER_TYPES } from '../../../../src/config/partnerTypeOptions'

const detail = vi.hoisted(() => ({ application: {} as Record<string, unknown> }))

vi.mock('../../../../src/modules/application/queries', async (original) => ({
  ...(await original<typeof import('../../../../src/modules/application/queries')>()),
  useFundingApplicationDetails: () => ({ data: { data: detail.application }, isLoading: false, error: null }),
  useUpdateFundingApplicationStatus: () => ({ mutate: vi.fn(), isPending: false }),
  useSaveFundingApplicationCommission: () => ({ mutate: vi.fn(), isPending: false }),
}))

vi.mock('../../../../src/components/Common/Activity/ActivitySidebar', () => ({ default: () => null }))

// A submitted application on an approved request, in an editable status.
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

  it('hides it once the application is in a status that is not editable', () => {
    detail.application = { ...editable, status: FUNDING_APPLICATION_STATUS.MATCHED_TO_LENDER, is_editable: false }
    renderWithProviders(<FundingApplicationDetails />)

    expect(editLink()).not.toBeInTheDocument()
  })

  // The 11 editable statuses (API config `statuses.editable`); the server sends that as is_editable.
  it.each([
    FUNDING_APPLICATION_STATUS.ON_HOLD,
    FUNDING_APPLICATION_STATUS.DRAFT,
    FUNDING_APPLICATION_STATUS.PENDING,
    FUNDING_APPLICATION_STATUS.APPROVED_CONDITIONAL,
    FUNDING_APPLICATION_STATUS.APPROVED_FINAL,
    FUNDING_APPLICATION_STATUS.PENDING_CLARIFICATION,
    FUNDING_APPLICATION_STATUS.READY_FOR_SUBMISSION,
  ])('offers it at %s, an editable status', (status) => {
    detail.application = { ...editable, status }
    renderWithProviders(<FundingApplicationDetails />)

    expect(editLink()).toBeInTheDocument()
  })

  it.each([
    FUNDING_APPLICATION_STATUS.WITHDRAWN,
    FUNDING_APPLICATION_STATUS.OFFER_DECLINED_BY_BORROWER,
    FUNDING_APPLICATION_STATUS.CLOSED_NO_RESPONSE,
    FUNDING_APPLICATION_STATUS.CLOSED_INCOMPLETE_APPLICATION,
    FUNDING_APPLICATION_STATUS.CLOSED_ERROR,
  ])('hides it at %s, a new closing status', (status) => {
    detail.application = { ...editable, status, is_editable: false }
    renderWithProviders(<FundingApplicationDetails />)

    expect(editLink()).not.toBeInTheDocument()
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

  it("offers the host Edit on another partner's application too", () => {
    detail.application = { ...editable, partner_id: 7 }
    renderWithProviders(<FundingApplicationDetails />)

    expect(editLink()).toHaveAttribute('href', '/fund-application/29')
  })

  it("offers it to a white-label partner on its own borrower's application", () => {
    detail.application = { ...editable, partner_id: 2 }
    useAuthStore.setState({ user: { id: 2, is_host: false, partner_id: 2, partner_type: PARTNER_TYPES.WHITE_LABEL, permissions: [] } as never })
    renderWithProviders(<FundingApplicationDetails />)

    expect(editLink()).toHaveAttribute('href', '/fund-application/29')
  })

  it("never offers it to a white-label partner on another partner's application", () => {
    detail.application = { ...editable, partner_id: 7 }
    useAuthStore.setState({ user: { id: 2, is_host: false, partner_id: 2, partner_type: PARTNER_TYPES.WHITE_LABEL, permissions: [] } as never })
    renderWithProviders(<FundingApplicationDetails />)

    expect(editLink()).not.toBeInTheDocument()
  })

  // Certified partners edit their own borrowers' applications the same as
  // white-label ones (it used to be white-label only).
  it("offers it to a certified partner on its own borrower's application", () => {
    detail.application = { ...editable, partner_id: 3 }
    useAuthStore.setState({ user: { id: 3, is_host: false, partner_id: 3, partner_type: PARTNER_TYPES.CERTIFIED, permissions: [] } as never })
    renderWithProviders(<FundingApplicationDetails />)

    expect(editLink()).toHaveAttribute('href', '/fund-application/29')
  })

  it("never offers it to a certified partner on another partner's application", () => {
    detail.application = { ...editable, partner_id: 7 }
    useAuthStore.setState({ user: { id: 3, is_host: false, partner_id: 3, partner_type: PARTNER_TYPES.CERTIFIED, permissions: [] } as never })
    renderWithProviders(<FundingApplicationDetails />)

    expect(editLink()).not.toBeInTheDocument()
  })
})

/**
 * Ownership Information: the owner's and each co-borrower's SSN were written
 * 3-3-3 (325-555-555) by a formatter of the page's own. They show the way every
 * SSN does: masked ***-**-5555, written 325-55-5555 on the eye button.
 */
describe('FundingApplicationDetails — Ownership Information SSN', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: 1, is_host: true, partner_id: 1, permissions: [] } as never })
  })

  const openOwnershipTab = () => {
    renderWithProviders(<FundingApplicationDetails />)
    screen.getAllByText('Ownership Information')[0].closest('button, a, li, .list-group-item')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }

  it('shows the owner SSN masked, and written XXX-XX-XXXX on the eye button', async () => {
    const user = userEvent.setup()
    detail.application = { ...editable, ssn: '325555555' }
    openOwnershipTab()

    expect(await screen.findByText('***-**-5555')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show SSN' }))
    expect(screen.getByText('325-55-5555')).toBeInTheDocument()
    expect(screen.queryByText('325-555-555')).not.toBeInTheDocument()
  })

  it('shows a co-borrower SSN the same way, and each of its rows once', async () => {
    const user = userEvent.setup()
    detail.application = {
      ...editable,
      ssn: null,
      has_co_borrower: true,
      co_borrowers: [{ id: 1, first_name: 'Cora', last_name: 'Co', ssn: '234567890', home_phone: '(555) 234-5678', date_of_birth: '1985-05-05' }],
    }
    openOwnershipTab()

    expect(await screen.findByText('***-**-7890')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show SSN' }))
    expect(screen.getByText('234-56-7890')).toBeInTheDocument()
    expect(screen.getAllByText('Home Phone')).toHaveLength(1)
    expect(screen.getAllByText('Date of Birth')).toHaveLength(2) // the owner's and the co-borrower's
  })
})

describe('FundingApplicationDetails — Funding Request tab', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: 1, is_host: true, partner_id: 1, permissions: [] } as never })
  })

  const openFundingRequestTab = () => {
    renderWithProviders(<FundingApplicationDetails />)
    screen.getAllByText('Funding Request')[0].closest('button, a, li, .list-group-item')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }

  it('lists the additional funding types after the preferred one', async () => {
    detail.application = { ...editable, preferred_funding_type: 'Term Loan', additional_funding_types: ['SBA Loan', 'Line of Credit'] }
    openFundingRequestTab()

    const preferred = await screen.findByText('Preferred Funding Type')
    const additional = screen.getByText('Additional Funding Types')
    expect(preferred.compareDocumentPosition(additional) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('SBA Loan, Line of Credit')).toBeInTheDocument()
  })

  it('shows a dash when none were chosen', async () => {
    detail.application = { ...editable, preferred_funding_type: 'Term Loan', additional_funding_types: [] }
    openFundingRequestTab()

    const additional = await screen.findByText('Additional Funding Types')
    expect(additional.nextElementSibling).toHaveTextContent('-')
  })
})

describe('FundingApplicationDetails — Status Notes', () => {
  beforeEach(() => {
    detail.application = { ...editable }
    useAuthStore.setState({ user: { id: 1, is_host: true, partner_id: 1, permissions: ['update funding application'] } as never })
  })

  it('caps Status Notes at the 10,000 characters the API accepts', () => {
    renderWithProviders(<FundingApplicationDetails />)

    expect(screen.getByLabelText(/status notes/i)).toHaveAttribute('maxLength', '10000')
  })

  it('shows how many characters are used', () => {
    detail.application = { ...editable, status_note: 'Withdrawn by borrower' }
    renderWithProviders(<FundingApplicationDetails />)

    expect(screen.getByText('21 / 10,000')).toBeInTheDocument()
  })
})

describe("FundingApplicationDetails — Can't edit a locked application", () => {
  const reason = 'This application can no longer be edited because it is "Withdrawn". Contact your funding advisor if something needs to change.'
  const locked = { ...editable, status: FUNDING_APPLICATION_STATUS.WITHDRAWN, is_editable: false, locked_reason: reason }
  const cantEdit = () => screen.queryByRole('button', { name: /can't edit funding application/i })

  const viewers = {
    host: { id: 1, is_host: true, partner_id: 1, permissions: [] },
    'white-label partner': { id: 2, is_host: false, partner_id: 1, partner_type: PARTNER_TYPES.WHITE_LABEL, permissions: [] },
    'certified partner': { id: 3, is_host: false, partner_id: 1, partner_type: PARTNER_TYPES.CERTIFIED, permissions: [] },
  }

  it.each(Object.entries(viewers))('tells the %s it can no longer be edited, and why', (_, user) => {
    detail.application = { ...locked }
    useAuthStore.setState({ user: user as never })
    renderWithProviders(<FundingApplicationDetails />)

    expect(editLink()).not.toBeInTheDocument()
    expect(cantEdit()).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent(reason)
  })

  it.each([
    FUNDING_APPLICATION_STATUS.MATCHED_TO_LENDER,
    FUNDING_APPLICATION_STATUS.FUNDED,
    FUNDING_APPLICATION_STATUS.OFFER_DECLINED_BY_BORROWER,
    FUNDING_APPLICATION_STATUS.CLOSED_NO_RESPONSE,
    FUNDING_APPLICATION_STATUS.CLOSED_INCOMPLETE_APPLICATION,
    FUNDING_APPLICATION_STATUS.CLOSED_ERROR,
  ])('says so at %s, naming the status when the server sends no reason', (status) => {
    detail.application = { ...locked, status, locked_reason: undefined }
    useAuthStore.setState({ user: viewers.host as never })
    renderWithProviders(<FundingApplicationDetails />)

    expect(cantEdit()).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent(`because it is "${status}"`)
  })

  it('says nothing of the kind while the application is editable', () => {
    detail.application = { ...editable, status: FUNDING_APPLICATION_STATUS.READY_FOR_SUBMISSION }
    useAuthStore.setState({ user: viewers.host as never })
    renderWithProviders(<FundingApplicationDetails />)

    expect(cantEdit()).not.toBeInTheDocument()
    expect(screen.queryByText(/can no longer be edited/i)).not.toBeInTheDocument()
  })
})
