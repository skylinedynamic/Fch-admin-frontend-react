import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen } from '../../../test-utils'
import userEvent from '@testing-library/user-event'
import FundingApplicationDetails from '../../../../src/pages/applications/funding/FundingApplicationDetails'
import { useAuthStore } from '../../../../src/store/auth/authStore'
import { FUNDING_APPLICATION_STATUS } from '../../../../src/config/borrower'
import { FUNDING_REVIEW_STATUS } from '../../../../src/config/funding'

// R3-BUG-016: a status note is internal unless "Visible to client" is ticked,
// the form says who will see it, and the box starts empty for each change
// (the last note is shown above it, read-only).

const detail = vi.hoisted(() => ({ application: {} as Record<string, unknown> }))
const mutations = vi.hoisted(() => ({ updateStatus: vi.fn() }))

vi.mock('../../../../src/modules/application/queries', async (original) => ({
  ...(await original<typeof import('../../../../src/modules/application/queries')>()),
  useFundingApplicationDetails: () => ({ data: { data: detail.application }, isLoading: false, error: null }),
  useUpdateFundingApplicationStatus: () => ({ mutate: mutations.updateStatus, isPending: false }),
  useSaveFundingApplicationCommission: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
  useAssignLenderToFundingApplication: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('bootstrap/js/dist/modal', () => import('../../../mocks/fakeBootstrapModal'))
vi.mock('../../../../src/components/Common/Activity/ActivitySidebar', () => ({ default: () => null }))

const app = {
  id: 107,
  partner_id: 1,
  borrower_id: 1,
  status: FUNDING_APPLICATION_STATUS.PENDING,
  status_note: 'QA-TEST R3 please confirm revenue',
  status_note_visible_to_client: true,
  funding_request_id: 29,
  funding_request_status: FUNDING_REVIEW_STATUS.APPROVED,
  is_editable: true,
  full_name: 'QA-TEST ONB',
  business_name: 'QA-TEST ONB Wanda LLC',
  co_borrowers: [],
  documents: [],
}

const host = { id: 1, is_host: true, partner_id: 1, permissions: ['update funding application'] }

async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Update Status' }))
  await user.click(screen.getByRole('button', { name: 'Update', hidden: true }))
}

describe('FundingApplicationDetails — who sees the status note', () => {
  beforeEach(() => {
    detail.application = { ...app }
    mutations.updateStatus.mockReset()
    useAuthStore.setState({ user: host as never })
  })

  it('starts the note box empty and shows the last note above it, with who saw it', () => {
    renderWithProviders(<FundingApplicationDetails />)

    expect(screen.getByLabelText(/status notes/i)).toHaveValue('')
    const last = screen.getByTestId('last-status-note')
    expect(last).toHaveTextContent('QA-TEST R3 please confirm revenue')
    expect(last).toHaveTextContent('Visible to client')
  })

  it('marks an internal last note as internal', () => {
    detail.application = { ...app, status_note: 'lender X declined', status_note_visible_to_client: false }
    renderWithProviders(<FundingApplicationDetails />)

    expect(screen.getByTestId('last-status-note')).toHaveTextContent('Internal')
  })

  it('has "Visible to client" off by default and says what each choice means', () => {
    renderWithProviders(<FundingApplicationDetails />)

    expect(screen.getByRole('checkbox', { name: /visible to client/i })).not.toBeChecked()
    expect(screen.getByText(/only your team sees this note/i)).toBeInTheDocument()
  })

  it('saves a note as internal unless ticked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FundingApplicationDetails />)

    await user.type(screen.getByLabelText(/status notes/i), 'QA-TEST internal: lender X declined, try Y')
    await submit(user)

    expect(mutations.updateStatus).toHaveBeenCalledTimes(1)
    expect(mutations.updateStatus.mock.calls[0][0]).toMatchObject({
      funding_application_id: 107,
      status_note: 'QA-TEST internal: lender X declined, try Y',
      status_note_visible_to_client: false,
    })
  })

  it('sends the note to the client when ticked, and the form says so', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FundingApplicationDetails />)

    await user.type(screen.getByLabelText(/status notes/i), 'Please upload bank statements')
    await user.click(screen.getByRole('checkbox', { name: /visible to client/i }))
    expect(screen.getByText(/the client sees this note/i)).toBeInTheDocument()
    await submit(user)

    expect(mutations.updateStatus.mock.calls[0][0]).toMatchObject({
      status_note: 'Please upload bank statements',
      status_note_visible_to_client: true,
    })
  })

  it('does not resend the last note when only the status changes', async () => {
    const user = userEvent.setup()
    detail.application = { ...app, status: FUNDING_APPLICATION_STATUS.SUBMITTED }
    renderWithProviders(<FundingApplicationDetails />)

    await submit(user)

    expect(mutations.updateStatus.mock.calls[0][0].status_note).toBe('')
  })

  it('clears the box and the tick after a save', async () => {
    mutations.updateStatus.mockImplementation((_body, options) => options?.onSuccess?.())
    const user = userEvent.setup()
    renderWithProviders(<FundingApplicationDetails />)

    await user.type(screen.getByLabelText(/status notes/i), 'Sent')
    await user.click(screen.getByRole('checkbox', { name: /visible to client/i }))
    await submit(user)

    expect(screen.getByLabelText(/status notes/i)).toHaveValue('')
    expect(screen.getByRole('checkbox', { name: /visible to client/i })).not.toBeChecked()
  })
})
