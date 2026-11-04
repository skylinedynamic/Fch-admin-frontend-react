import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, renderWithProviders, screen, waitFor, within } from '../../../test-utils'
import { toast } from 'react-toastify'
import userEvent from '@testing-library/user-event'
import FundingApplicationDetails from '../../../../src/pages/applications/funding/FundingApplicationDetails'
import { useAuthStore } from '../../../../src/store/auth/authStore'
import { FUNDING_APPLICATION_STATUS } from '../../../../src/config/borrower'
import { FUNDING_REVIEW_STATUS } from '../../../../src/config/funding'
import { PARTNER_TYPES } from '../../../../src/config/partnerTypeOptions'

const detail = vi.hoisted(() => ({ application: {} as Record<string, unknown> }))
// Shared spies, so a test can see what the page saved and in which order.
const mutations = vi.hoisted(() => ({ updateStatus: vi.fn(), saveCommission: vi.fn(), assignLender: vi.fn() }))

vi.mock('../../../../src/modules/application/queries', async (original) => ({
  ...(await original<typeof import('../../../../src/modules/application/queries')>()),
  useFundingApplicationDetails: () => ({ data: { data: detail.application }, isLoading: false, error: null }),
  useUpdateFundingApplicationStatus: () => ({ mutate: mutations.updateStatus, isPending: false }),
  useSaveFundingApplicationCommission: () => ({ mutate: vi.fn(), mutateAsync: mutations.saveCommission, isPending: false }),
  useAssignLenderToFundingApplication: () => ({ mutateAsync: mutations.assignLender, isPending: false }),
}))

// The real Bootstrap modal cannot show under jsdom, like the other modal tests.
vi.mock('bootstrap/js/dist/modal', () => import('../../../mocks/fakeBootstrapModal'))

// Records what the page hands the activity log, which is not rendered here.
const sidebar = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }))
vi.mock('../../../../src/components/Common/Activity/ActivitySidebar', () => ({
  default: (props: Record<string, unknown>) => {
    sidebar.props = props
    return null
  },
}))

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

  it('offers Edit Funding Application, opening the edit form by the application id', () => {
    renderWithProviders(<FundingApplicationDetails />)

    expect(editLink()).toHaveAttribute('href', '/intake-review/funding-application/80/edit')
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

  // F169: the editable statuses are the only rule - not the funding request.
  it('offers it whatever state the funding request is in', () => {
    detail.application = { ...editable, funding_request_status: FUNDING_REVIEW_STATUS.PENDING }
    renderWithProviders(<FundingApplicationDetails />)

    expect(editLink()).toHaveAttribute('href', '/intake-review/funding-application/80/edit')
  })

  it('offers it on an application converted from a loan application, with no funding request', () => {
    detail.application = { ...editable, funding_request_id: null, funding_request_status: null }
    renderWithProviders(<FundingApplicationDetails />)

    expect(editLink()).toHaveAttribute('href', '/intake-review/funding-application/80/edit')
  })

  it("offers the host Edit on another partner's application too", () => {
    detail.application = { ...editable, partner_id: 7 }
    renderWithProviders(<FundingApplicationDetails />)

    expect(editLink()).toHaveAttribute('href', '/intake-review/funding-application/80/edit')
  })

  it("offers it to a white-label partner on its own borrower's application", () => {
    detail.application = { ...editable, partner_id: 2 }
    useAuthStore.setState({ user: { id: 2, is_host: false, partner_id: 2, partner_type: PARTNER_TYPES.WHITE_LABEL, permissions: [] } as never })
    renderWithProviders(<FundingApplicationDetails />)

    expect(editLink()).toHaveAttribute('href', '/intake-review/funding-application/80/edit')
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

    expect(editLink()).toHaveAttribute('href', '/intake-review/funding-application/80/edit')
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

describe('FundingApplicationDetails - activity log Want to Assign', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: 1, is_host: true, partner_id: 1, permissions: [] } as never })
    sidebar.props = null
  })

  it("lists the application partner's staff and shows its borrower's Assign to", () => {
    detail.application = { ...editable, partner_id: 4, borrower: { id: 1, assign_id: 14, email: 'b@example.test' } }
    renderWithProviders(<FundingApplicationDetails />)

    expect(sidebar.props).toMatchObject({
      entityType: 'Funding Application',
      partnerId: 4,
      taskOwner: { id: 14 },
    })
  })

  it('shows nobody when the borrower has no Assign to', () => {
    detail.application = { ...editable, borrower: { id: 1, assign_id: null } }
    renderWithProviders(<FundingApplicationDetails />)

    expect(sidebar.props?.taskOwner).toBeNull()
  })

  it("lines the activity card up under the page's own title bar (no fixed offset)", () => {
    renderWithProviders(<FundingApplicationDetails />)

    expect(sidebar.props?.stickyTopOffset).toBeUndefined()
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

// F173: one banner says why (first sentence bold, the rest beneath), no
// disabled "Can't Edit" button beside it.
describe("FundingApplicationDetails — Can't edit a locked application", () => {
  const reason = 'This funding application is "Withdrawn", so it can no longer be edited. Funding applications can only be edited while their status is one of the editable statuses.'
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
    expect(cantEdit()).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('This funding application is "Withdrawn", so it can no longer be edited.')
    expect(screen.getByRole('status')).toHaveTextContent('Funding applications can only be edited while their status is one of the editable statuses.')
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

    expect(cantEdit()).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(`This funding application is "${status}", so it can no longer be edited.`)
  })

  it('says nothing of the kind while the application is editable', () => {
    detail.application = { ...editable, status: FUNDING_APPLICATION_STATUS.READY_FOR_SUBMISSION }
    useAuthStore.setState({ user: viewers.host as never })
    renderWithProviders(<FundingApplicationDetails />)

    expect(cantEdit()).not.toBeInTheDocument()
    expect(screen.queryByText(/can no longer be edited/i)).not.toBeInTheDocument()
  })
})

// F172: Lender Information is the host's only - even if lender data reached a
// partner's page, it is not shown.
describe('FundingApplicationDetails — Lender Information', () => {
  const lender = {
    id: 5,
    name: 'Fundbox Financing',
    phone: '(888) 555-0102',
    email: null,
    product_category: 'Term Loan',
    requirements: { min_fico: 450, min_business_credit_score: null, min_revenue: 4500, min_tib: 6, min_deposit: 2700 },
    checks: { fico: true, business_credit: true, revenue: true, tib: true, deposit: false },
    score: 75,
    score_text: 'Good Match',
    score_hex: '#d97706',
    matches_fraction: '3/4',
  }
  const withLenders = { ...editable, matched_lenders: [lender], assigned_lender_ids: [], can_assign_lender: true }
  const lenderInformation = () => screen.queryByRole('heading', { name: 'Lender Information' })

  it('shows it to the host', () => {
    detail.application = { ...withLenders }
    useAuthStore.setState({ user: { id: 1, is_host: true, partner_id: 1, permissions: [] } as never })
    renderWithProviders(<FundingApplicationDetails />)

    expect(lenderInformation()).toBeInTheDocument()
    expect(screen.getByText('Fundbox Financing')).toBeInTheDocument()
  })

  it.each([
    ['white-label partner', PARTNER_TYPES.WHITE_LABEL],
    ['certified partner', PARTNER_TYPES.CERTIFIED],
  ])('never shows it to a %s', (_, partnerType) => {
    detail.application = { ...withLenders }
    useAuthStore.setState({ user: { id: 2, is_host: false, partner_id: 1, partner_type: partnerType, permissions: [] } as never })
    renderWithProviders(<FundingApplicationDetails />)

    expect(lenderInformation()).not.toBeInTheDocument()
    expect(screen.queryByText('Fundbox Financing')).not.toBeInTheDocument()
  })

  it('shows only the assigned lender, as a card, once it is fixed', () => {
    detail.application = {
      ...withLenders,
      status: FUNDING_APPLICATION_STATUS.MATCHED_TO_LENDER,
      is_editable: false,
      matched_lenders: [lender, { ...lender, id: 6, name: 'LendingClub' }],
      assigned_lender_ids: [5],
      can_assign_lender: false,
    }
    useAuthStore.setState({ user: { id: 1, is_host: true, partner_id: 1, permissions: [] } as never })
    renderWithProviders(<FundingApplicationDetails />)

    expect(screen.getByText('Fundbox Financing')).toBeInTheDocument()
    expect(screen.queryByText('LendingClub')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Search lenders...')).not.toBeInTheDocument()
    expect(screen.getByText('Assigned Lender')).toBeInTheDocument()
  })

  /**
   * Defect: Lender Information named the lender "LendingClub" alone; it is
   * shown as "Lender Name - Legal Name" (R2 BUG-008) - in the table, the
   * "All Lenders" filter and the assigned lender card.
   */
  describe('names each lender "Lender Name - Legal Name"', () => {
    const named = [
      { ...lender, legal_name: 'Fundbox, Inc.' },
      { ...lender, id: 6, name: 'LendingClub', legal_name: 'LendingClub Bank, N.A.' },
      { ...lender, id: 7, name: 'OnDeck', legal_name: null },
    ]

    it('in the table, and the lender filter picks that lender', async () => {
      detail.application = { ...withLenders, matched_lenders: named }
      useAuthStore.setState({ user: { id: 1, is_host: true, partner_id: 1, permissions: [] } as never })
      renderWithProviders(<FundingApplicationDetails />)

      const table = () => within(screen.getByRole('table'))
      expect(table().getByText('Fundbox Financing - Fundbox, Inc.')).toBeInTheDocument()
      expect(table().getByText('LendingClub - LendingClub Bank, N.A.')).toBeInTheDocument()
      // No legal name: the name alone.
      expect(table().getByText('OnDeck')).toBeInTheDocument()

      const dropdown = screen.getAllByText('All Lenders').map((el) => el.closest('.p-dropdown')).find(Boolean) as HTMLElement
      await userEvent.click(dropdown)
      const option = await waitFor(() => {
        const found = Array.from(document.body.querySelectorAll('.p-dropdown-panel .p-dropdown-item'))
          .find((el) => el.textContent?.trim() === 'LendingClub - LendingClub Bank, N.A.')
        if (!found) throw new Error('no "Lender Name - Legal Name" option')
        return found as HTMLElement
      })
      await userEvent.click(option)

      expect(table().getByText('LendingClub - LendingClub Bank, N.A.')).toBeInTheDocument()
      expect(table().queryByText('Fundbox Financing - Fundbox, Inc.')).not.toBeInTheDocument()
      expect(table().queryByText('OnDeck')).not.toBeInTheDocument()
    })

    it('finds a lender by its legal name in the search', async () => {
      detail.application = { ...withLenders, matched_lenders: named }
      useAuthStore.setState({ user: { id: 1, is_host: true, partner_id: 1, permissions: [] } as never })
      renderWithProviders(<FundingApplicationDetails />)

      await userEvent.type(screen.getByPlaceholderText('Search lenders...'), 'fundbox, inc')

      const table = within(screen.getByRole('table'))
      expect(table.getByText('Fundbox Financing - Fundbox, Inc.')).toBeInTheDocument()
      expect(table.queryByText('LendingClub - LendingClub Bank, N.A.')).not.toBeInTheDocument()
      expect(table.queryByText('OnDeck')).not.toBeInTheDocument()
    })

    it('on the assigned lender card', () => {
      detail.application = {
        ...withLenders,
        status: FUNDING_APPLICATION_STATUS.MATCHED_TO_LENDER,
        is_editable: false,
        matched_lenders: named,
        assigned_lender_ids: [6],
        can_assign_lender: false,
      }
      useAuthStore.setState({ user: { id: 1, is_host: true, partner_id: 1, permissions: [] } as never })
      renderWithProviders(<FundingApplicationDetails />)

      expect(screen.getByText('LendingClub - LendingClub Bank, N.A.')).toBeInTheDocument()
    })
  })

  async function assignFundbox() {
    await userEvent.click(screen.getByRole('button', { name: /^assign$/i }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /assign lender/i }))
    return dialog
  }

  it('assigns the lender to this application by its own id, and refreshes the activity log', async () => {
    mutations.assignLender.mockReset().mockResolvedValue({})
    const success = vi.spyOn(toast, 'success')
    const refreshed = vi.fn()
    window.addEventListener('refreshActivities', refreshed)
    detail.application = { ...withLenders }
    useAuthStore.setState({ user: { id: 1, is_host: true, partner_id: 1, permissions: [] } as never })
    renderWithProviders(<FundingApplicationDetails />)

    await assignFundbox()

    await waitFor(() => expect(success).toHaveBeenCalledWith('Lender assigned successfully'))
    expect(mutations.assignLender).toHaveBeenCalledWith({ id: 80, lender_ids: [5] })
    expect(refreshed).toHaveBeenCalled()
    window.removeEventListener('refreshActivities', refreshed)
    success.mockRestore()
  })

  it("says why an assignment was refused, and keeps the dialog open to retry", async () => {
    mutations.assignLender.mockReset().mockRejectedValue({ response: { data: { message: 'The lender is fixed.' } } })
    const failure = vi.spyOn(toast, 'error')
    detail.application = { ...withLenders }
    useAuthStore.setState({ user: { id: 1, is_host: true, partner_id: 1, permissions: [] } as never })
    renderWithProviders(<FundingApplicationDetails />)

    const dialog = await assignFundbox()

    await waitFor(() => expect(failure).toHaveBeenCalledWith('The lender is fixed.'))
    expect(dialog).toBeInTheDocument()
    failure.mockRestore()
  })

  it('falls back to a general message when the refusal says nothing', async () => {
    mutations.assignLender.mockReset().mockRejectedValue(new Error('network'))
    const failure = vi.spyOn(toast, 'error')
    detail.application = { ...withLenders }
    useAuthStore.setState({ user: { id: 1, is_host: true, partner_id: 1, permissions: [] } as never })
    renderWithProviders(<FundingApplicationDetails />)

    await assignFundbox()

    await waitFor(() => expect(failure).toHaveBeenCalledWith('Failed to assign lender'))
    failure.mockRestore()
  })
})

// Opens the Status dropdown and picks a status, as the other PrimeReact dropdown tests do.
async function pickStatus(label: string) {
  const dropdown = document.querySelector('.p-dropdown') as HTMLElement
  await userEvent.click(dropdown)
  const item = await waitFor(() => {
    const found = Array.from(document.body.querySelectorAll('.p-dropdown-panel .p-dropdown-item'))
      .find((el) => el.textContent?.trim() === label)
    if (!found) throw new Error(`no "${label}" option`)
    return found as HTMLElement
  })
  await userEvent.click(item)
}

const hostWithRights = { id: 1, is_host: true, partner_id: 1, permissions: ['update funding application', 'view commission', 'update commission'] }

/**
 * Closed (Completed): the commission is set in the modal and saved through the
 * Commission Details card's API first, then the status - and never the
 * requested amount (the card that edited it is gone; sending it overwrote an
 * application-from-a-request's amount with 0).
 */
describe('FundingApplicationDetails — closing with a commission', () => {
  const closable = {
    ...editable,
    status: FUNDING_APPLICATION_STATUS.APPROVED_FINAL,
    requested_amount: '$25,000.00',
    requested_amount_original: null,
    has_assigned_lender: true,
    lender_required_statuses: [FUNDING_APPLICATION_STATUS.CLOSED, FUNDING_APPLICATION_STATUS.MATCHED_TO_LENDER],
  }

  beforeEach(() => {
    mutations.updateStatus.mockReset()
    mutations.saveCommission.mockReset()
    detail.application = { ...closable }
    useAuthStore.setState({ user: hostWithRights as never })
  })

  it("saves the commission, then closes on the funded amount - the request's amount by default", async () => {
    mutations.saveCommission.mockResolvedValue({})
    renderWithProviders(<FundingApplicationDetails />)

    await pickStatus(FUNDING_APPLICATION_STATUS.CLOSED)
    await userEvent.click(screen.getByRole('button', { name: 'Update Status' }))
    expect(await screen.findByLabelText(/funded amount/i)).toHaveValue(25000)

    await userEvent.type(screen.getByLabelText('Success Fee (%)'), '10')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm & Update' }))

    await waitFor(() => expect(mutations.updateStatus).toHaveBeenCalled())
    expect(mutations.saveCommission).toHaveBeenCalledWith({ funding_application_id: 80, total_commission: 10, admin_commission: 10 })
    expect(mutations.saveCommission.mock.invocationCallOrder[0]).toBeLessThan(mutations.updateStatus.mock.invocationCallOrder[0])
    expect(mutations.updateStatus.mock.calls[0][0]).toMatchObject({ funding_application_id: 80, status: FUNDING_APPLICATION_STATUS.CLOSED, funded_amount: '25000' })
  })

  it('closes without saving a commission when none is entered', async () => {
    renderWithProviders(<FundingApplicationDetails />)

    await pickStatus(FUNDING_APPLICATION_STATUS.CLOSED)
    await userEvent.click(screen.getByRole('button', { name: 'Update Status' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm & Update' }))

    await waitFor(() => expect(mutations.updateStatus).toHaveBeenCalled())
    expect(mutations.saveCommission).not.toHaveBeenCalled()
  })

  it('does not close when the commission is refused, and shows why', async () => {
    mutations.saveCommission.mockRejectedValue({ response: { status: 422, data: { errors: { total_commission: ['The success fee may not be greater than 100.'] } } } })
    renderWithProviders(<FundingApplicationDetails />)

    await pickStatus(FUNDING_APPLICATION_STATUS.CLOSED)
    await userEvent.click(screen.getByRole('button', { name: 'Update Status' }))
    await userEvent.type(await screen.findByLabelText('Success Fee (%)'), '10')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm & Update' }))

    expect(await screen.findByText('The success fee may not be greater than 100.')).toBeInTheDocument()
    expect(mutations.updateStatus).not.toHaveBeenCalled()
  })

  it('does not close when the commission could not be saved for another reason', async () => {
    mutations.saveCommission.mockRejectedValue({ response: { status: 500, data: {} } })
    const failure = vi.spyOn(toast, 'error')
    renderWithProviders(<FundingApplicationDetails />)

    await pickStatus(FUNDING_APPLICATION_STATUS.CLOSED)
    await userEvent.click(screen.getByRole('button', { name: 'Update Status' }))
    await userEvent.type(await screen.findByLabelText('Success Fee (%)'), '10')
    await userEvent.click(screen.getByRole('button', { name: 'Confirm & Update' }))

    await waitFor(() => expect(failure).toHaveBeenCalledWith('Failed to save commission. The status was not changed.'))
    expect(mutations.updateStatus).not.toHaveBeenCalled()
    failure.mockRestore()
  })

  it('says the status is unchanged instead of asking to confirm nothing', async () => {
    const info = vi.spyOn(toast, 'info')
    renderWithProviders(<FundingApplicationDetails />)

    await userEvent.click(screen.getByRole('button', { name: 'Update Status' }))

    expect(info).toHaveBeenCalledWith('Status is unchanged.')
    expect(screen.queryByRole('button', { name: 'Confirm & Update' })).not.toBeInTheDocument()
    expect(mutations.updateStatus).not.toHaveBeenCalled()
    info.mockRestore()
  })
})

/** A status past the editable ones needs a lender first - the funding request page's modal. */
describe('FundingApplicationDetails — Lender Required', () => {
  beforeEach(() => {
    mutations.updateStatus.mockReset()
    detail.application = {
      ...editable,
      status: FUNDING_APPLICATION_STATUS.APPROVED_FINAL,
      has_assigned_lender: false,
      matched_lenders: [],
      assigned_lender_ids: [],
      can_assign_lender: true,
      lender_required_statuses: [FUNDING_APPLICATION_STATUS.MATCHED_TO_LENDER],
    }
  })

  it('stops the host and offers to take them to Lender Information', async () => {
    useAuthStore.setState({ user: hostWithRights as never })
    renderWithProviders(<FundingApplicationDetails />)

    await pickStatus(FUNDING_APPLICATION_STATUS.MATCHED_TO_LENDER)
    await userEvent.click(screen.getByRole('button', { name: 'Update Status' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Lender Required')
    expect(dialog).toHaveTextContent(`You can assign before ${FUNDING_APPLICATION_STATUS.MATCHED_TO_LENDER}`)
    expect(screen.getByRole('button', { name: /got it, take me there/i })).toBeInTheDocument()
    expect(mutations.updateStatus).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: /got it, take me there/i }))
    await waitFor(() => expect(screen.queryByText('Lender Required')).not.toBeInTheDocument())
  })

  async function openLenderRequired() {
    await pickStatus(FUNDING_APPLICATION_STATUS.MATCHED_TO_LENDER)
    await userEvent.click(screen.getByRole('button', { name: 'Update Status' }))
    return screen.findByRole('dialog')
  }
  const lenderCard = () => screen.getByRole('heading', { name: 'Lender Information' }).closest('.card') as HTMLElement

  it('outlines Lender Information after "take me there", for 30 seconds', async () => {
    useAuthStore.setState({ user: hostWithRights as never })
    renderWithProviders(<FundingApplicationDetails />)
    await openLenderRequired()

    // Fake only setTimeout from here, so the 30-second pulse can be run out.
    vi.useFakeTimers({ toFake: ['setTimeout'], shouldAdvanceTime: true })
    try {
      await userEvent.click(screen.getByRole('button', { name: /got it, take me there/i }))
      await waitFor(() => expect(lenderCard()).toHaveClass('border-danger'))

      await act(async () => { vi.advanceTimersByTime(30000) })
      expect(lenderCard()).not.toHaveClass('border-danger')
    } finally {
      vi.useRealTimers()
    }
  })

  it.each([
    ['Cancel', async () => userEvent.click(screen.getByRole('button', { name: 'Cancel' }))],
    ['Escape', async () => fireEvent.keyUp(screen.getByRole('dialog'), { key: 'Escape', keyCode: 27 })],
  ])('%s closes it without moving to Lender Information or changing the status', async (_, close) => {
    useAuthStore.setState({ user: hostWithRights as never })
    renderWithProviders(<FundingApplicationDetails />)
    await openLenderRequired()

    await close()

    await waitFor(() => expect(screen.queryByText('Lender Required')).not.toBeInTheDocument())
    expect(lenderCard()).not.toHaveClass('border-danger')
    expect(mutations.updateStatus).not.toHaveBeenCalled()
  })

  it('just closes when there is no Lender Information to go to', async () => {
    detail.application = { ...detail.application, matched_lenders: undefined }
    useAuthStore.setState({ user: hostWithRights as never })
    renderWithProviders(<FundingApplicationDetails />)
    await openLenderRequired()

    await userEvent.click(screen.getByRole('button', { name: /got it, take me there/i }))

    await waitFor(() => expect(screen.queryByText('Lender Required')).not.toBeInTheDocument())
    expect(screen.queryByRole('heading', { name: 'Lender Information' })).not.toBeInTheDocument()
  })

  it('leaves the status read-only for a partner, so a partner never meets it', () => {
    useAuthStore.setState({ user: { ...hostWithRights, is_host: false, partner_type: PARTNER_TYPES.WHITE_LABEL } as never })
    renderWithProviders(<FundingApplicationDetails />)

    expect(screen.queryByRole('button', { name: 'Update Status' })).not.toBeInTheDocument()
    expect(document.querySelector('.p-dropdown')).toBeNull()
  })
})

/** Closed (Completed): the summary takes the lock banner's place. */
describe('FundingApplicationDetails — Closed (Completed)', () => {
  const closedApp = {
    ...editable,
    status: FUNDING_APPLICATION_STATUS.CLOSED,
    is_editable: false,
    locked_reason: 'This funding application is "Closed (Completed)", so it can no longer be edited.',
    total_funded_amount: '100000.00',
    total_commission: '10.00',
    admin_commission: '100.00',
    total_commission_amount: '10000.00',
    admin_commission_amount: '10000.00',
    partner_commission: '0.00',
    partner_commission_amount: '0.00',
  }

  it('shows the host the summary instead of the lock banner', () => {
    detail.application = { ...closedApp }
    useAuthStore.setState({ user: { id: 1, is_host: true, partner_id: 1, permissions: [] } as never })
    renderWithProviders(<FundingApplicationDetails />)

    expect(screen.getByTestId('closed-summary')).toHaveTextContent('Funding Completed')
    expect(screen.queryByText(/so it can no longer be edited/)).not.toBeInTheDocument()
  })

  it("shows a partner only their commission, in place of the old breakdown", () => {
    detail.application = { ...closedApp, partner_id: 2, partner_commission: '60.00', partner_commission_amount: '6000.00' }
    useAuthStore.setState({ user: { id: 2, is_host: false, partner_id: 2, partner_type: PARTNER_TYPES.WHITE_LABEL, permissions: [] } as never })
    renderWithProviders(<FundingApplicationDetails />)

    expect(screen.getByTestId('closed-summary')).toHaveTextContent('Partner Commission Details')
    expect(screen.getByTestId('closed-summary')).toHaveTextContent('$6,000.00')
    expect(screen.queryByText('Your Commission Breakdown')).not.toBeInTheDocument()
    expect(screen.getByTestId('closed-summary')).toHaveTextContent('Total Funded Amount')
    expect(screen.getByTestId('closed-summary')).not.toHaveTextContent('Admin Commission')
  })
})

/** The commission is shown only once the application is Closed (Completed) - to host and partner alike. */
describe('FundingApplicationDetails — commission before closing', () => {
  const open = { ...editable, status: FUNDING_APPLICATION_STATUS.APPROVED_FINAL, partner_id: 2, total_commission: '10.00', partner_commission: '60.00', partner_commission_amount: '6000.00' }

  it.each([
    ['host', { id: 1, is_host: true, partner_id: 1, permissions: ['view commission'] }],
    ['partner', { id: 2, is_host: false, partner_id: 2, partner_type: PARTNER_TYPES.WHITE_LABEL, permissions: ['view commission'] }],
  ])('shows the %s no commission yet', (_, user) => {
    detail.application = { ...open }
    useAuthStore.setState({ user: user as never })
    renderWithProviders(<FundingApplicationDetails />)

    expect(screen.queryByTestId('closed-summary')).not.toBeInTheDocument()
    expect(screen.queryByText('Partner Commission Details')).not.toBeInTheDocument()
    expect(screen.queryByText('Your Commission Breakdown')).not.toBeInTheDocument()
    // On the page itself - the hidden Closed (Completed) modal has its own section.
    expect(screen.queryAllByText('Commission Details').filter((el) => !el.closest('.fam-modal'))).toHaveLength(0)
  })
})
