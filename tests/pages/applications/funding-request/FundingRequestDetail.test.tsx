import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { server } from '../../../mocks/server'
import { fireEvent, renderWithProviders, screen, waitFor, within } from '../../../test-utils'
import { toast } from 'react-toastify'
import { useAuthStore } from '../../../../src/store/auth/authStore'
import FundingRequestDetail from '../../../../src/pages/applications/funding-request/FundingRequestDetail'
import { FUNDING_REVIEW_STATUS } from '../../../../src/config/funding'
import { FUNDING_APPLICATION_STATUS } from '../../../../src/config/borrower'
import { PARTNER_TYPES } from '../../../../src/config/partnerTypeOptions'

// The activity sidebar pulls in Summernote, which needs a real canvas.
const sidebar = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }))
vi.mock('../../../../src/components/Common/Activity/ActivitySidebar', () => ({
  default: (props: Record<string, unknown>) => {
    sidebar.props = props
    return null
  },
}))

// Funding Request Details: "Go to Client" in the header and "Confirm" in
// Review Actions are the page's main actions, in the primary (brand) colour.
const review = {
  id: 5,
  borrower_id: 3,
  borrower: { id: 3, first_name: 'Giselle', last_name: 'Noel', business_name: 'Noel Holdings LLC' },
  status: 'Pending',
  funding_type: 'Term Loan',
  requested_amount: 45000,
  documents_with_urls: [],
  matched_lenders: [],
  lender_names: [],
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-01T10:00:00Z',
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/intake-review/funding-request/:id" element={<FundingRequestDetail />} />
    </Routes>,
    { route: `/intake-review/funding-request/${review.id}` }
  )
}

describe('Funding Request Details: action buttons', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: 't', user: { id: 1, name: 'Host Admin', is_host: 1, permissions: [] } } as never)
    server.use(
      http.get('*/common/funding-request/:id', () => HttpResponse.json({ status: true, message: 'ok', data: review }))
    )
  })

  afterEach(() => server.resetHandlers())

  it('shows Go to Client in the primary colour', async () => {
    renderPage()

    const goToClient = await screen.findByRole('link', { name: /go to client/i })
    expect(goToClient).toHaveAttribute('href', '/clients/3')
    expect(goToClient).toHaveClass('btn-primary')
    expect(goToClient).not.toHaveClass('btn-info')
  })

  it('shows Confirm in Review Actions in the primary colour', async () => {
    renderPage()

    const confirm = await screen.findByRole('button', { name: /^confirm/i })
    expect(confirm).toHaveClass('btn-primary')
    expect(confirm).not.toHaveClass('btn-dark')
  })

  // R2 BUG-019: the modal read "Assign to Lender. You can assign Before Approved".
  it('asks for a lender in plain words before an approval', async () => {
    server.use(
      http.get('*/common/funding-request/:id', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { ...review, status: 'Approved' } })
      )
    )
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /^confirm/i }))

    expect(await screen.findByText('Lender Required')).toBeInTheDocument()
    expect(screen.getByText('Assign a lender before approving this request.')).toBeInTheDocument()
    expect(screen.queryByText(/You can assign Before/i)).not.toBeInTheDocument()
  })

  it('keeps Confirm primary when rejecting, below the reason', async () => {
    server.use(
      http.get('*/common/funding-request/:id', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { ...review, status: 'Rejected' } })
      )
    )
    renderPage()

    const confirm = await screen.findByRole('button', { name: /^confirm/i })
    expect(screen.getByPlaceholderText(/reason/i)).toBeInTheDocument()
    expect(confirm).toHaveClass('btn-primary')
    expect(confirm).not.toHaveClass('btn-dark')
  })

  /**
   * Defect: a rejected request opened with an empty Reason / Note - the saved
   * reject_reason came back from the API but the box always started blank, so
   * after a save or a reload the reason seemed lost.
   */
  it('opens a rejected request with its saved reason in Reason / Note', async () => {
    server.use(
      http.get('*/common/funding-request/:id', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { ...review, status: 'Rejected', reject_reason: 'Missing bank statements' } })
      )
    )
    renderPage()

    const note = await screen.findByPlaceholderText(/reason/i)
    await waitFor(() => expect(note).toHaveValue('Missing bank statements'))
    expect(screen.getByText('23 / 10,000')).toBeInTheDocument()
  })

  /**
   * Defect: Reason / Note had no limit and no counter; the API now takes up to
   * 10,000 characters, and the box stops there and shows how many are used.
   */
  it('counts the rejection note against its 10,000 characters', async () => {
    server.use(
      http.get('*/common/funding-request/:id', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { ...review, status: 'Rejected' } })
      )
    )
    renderPage()

    const note = await screen.findByPlaceholderText(/reason/i)
    expect(note).toHaveAttribute('maxLength', '10000')
    expect(screen.getByText('0 / 10,000')).toBeInTheDocument()
    fireEvent.change(note, { target: { value: 'Missing bank statements' } })
    expect(screen.getByText('23 / 10,000')).toBeInTheDocument()
  })

  /**
   * Defect: a long rejection note made "Confirm Status Update" taller than the
   * screen. The note shows its start with See more, and See less folds it again.
   */
  it('shows a long rejection note folded in the confirmation, with See more and See less', async () => {
    server.use(
      http.get('*/common/funding-request/:id', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { ...review, status: 'Rejected' } })
      )
    )
    renderPage()
    const longNote = 'The borrower did not send the bank statements we asked for. '.repeat(20).trim()

    fireEvent.change(await screen.findByPlaceholderText(/reason/i), { target: { value: longNote } })
    fireEvent.click(screen.getByRole('button', { name: /^confirm/i }))

    const preview = await screen.findByTestId('reject-note-preview')
    expect(preview.textContent).not.toContain(longNote)
    const more = within(preview.parentElement as HTMLElement).getByRole('button', { name: 'See more' })
    fireEvent.click(more)
    expect(preview.textContent).toContain(longNote)
    fireEvent.click(within(preview.parentElement as HTMLElement).getByRole('button', { name: 'See less' }))
    expect(preview.textContent).not.toContain(longNote)
  })

  it('shows a short rejection note in full, without See more', async () => {
    server.use(
      http.get('*/common/funding-request/:id', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { ...review, status: 'Rejected' } })
      )
    )
    renderPage()

    fireEvent.change(await screen.findByPlaceholderText(/reason/i), { target: { value: 'Missing bank statements' } })
    fireEvent.click(screen.getByRole('button', { name: /^confirm/i }))

    expect((await screen.findByTestId('reject-note-preview')).textContent).toContain('Missing bank statements')
    expect(screen.queryByRole('button', { name: 'See more' })).not.toBeInTheDocument()
  })
})

// An approved request whose submitted application is still at status key 9 or below.
const approvedWithApplication = {
  ...review,
  status: FUNDING_REVIEW_STATUS.APPROVED,
  partner_id: 2,
  funding_application: { id: 80, status: FUNDING_APPLICATION_STATUS.PENDING, is_editable: true },
}

describe('Funding Request Details: Edit Funding Application', () => {
  const signIn = (user: Record<string, unknown>) =>
    useAuthStore.setState({ token: 't', user: { id: 1, name: 'Someone', permissions: [], ...user } } as never)

  beforeEach(() => {
    server.use(
      http.get('*/common/funding-request/:id', () =>
        HttpResponse.json({ status: true, message: 'ok', data: approvedWithApplication })
      )
    )
  })

  afterEach(() => server.resetHandlers())

  const editLink = () => screen.findByRole('link', { name: /edit funding application/i })

  it("offers it to the host, even on another partner's request, opening the edit form on it", async () => {
    signIn({ is_host: 1, partner_id: 1 })
    renderPage()

    expect(await editLink()).toHaveAttribute('href', `/fund-application/${review.id}`)
  })

  it("offers it to a white-label partner on its own borrower's request", async () => {
    signIn({ is_host: 0, partner_id: 2, partner_type: PARTNER_TYPES.WHITE_LABEL })
    renderPage()

    expect(await editLink()).toHaveAttribute('href', `/fund-application/${review.id}`)
  })

  it("never offers it to a white-label partner on another partner's request", async () => {
    signIn({ is_host: 0, partner_id: 9, partner_type: PARTNER_TYPES.WHITE_LABEL })
    renderPage()

    await screen.findByRole('link', { name: /go to client/i })
    expect(screen.queryByRole('link', { name: /edit funding application/i })).not.toBeInTheDocument()
  })

  const withApplication = (status: string) =>
    server.use(
      http.get('*/common/funding-request/:id', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { ...approvedWithApplication, funding_application: { id: 80, status, is_editable: true } } })
      )
    )
  const processLink = () => screen.findByRole('link', { name: /process application/i })

  // A Draft / On Hold application keeps Process Application for everyone, as
  // before, and also offers the host Edit Funding Application.
  it.each([FUNDING_APPLICATION_STATUS.DRAFT, FUNDING_APPLICATION_STATUS.ON_HOLD])(
    'offers the host both Process Application and Edit on a %s application',
    async (status) => {
      withApplication(status)
      signIn({ is_host: 1, partner_id: 1 })
      renderPage()

      expect(await processLink()).toHaveAttribute('href', `/fund-application/${review.id}`)
      expect(await editLink()).toHaveAttribute('href', `/fund-application/${review.id}`)
    }
  )

  // A certified partner is treated as a white-label one here: on its own
  // borrower's Draft / On Hold application it keeps Process Application and
  // also gets Edit.
  it.each([FUNDING_APPLICATION_STATUS.DRAFT, FUNDING_APPLICATION_STATUS.ON_HOLD])(
    "offers a certified partner Process Application and Edit on its own borrower's %s application",
    async (status) => {
      withApplication(status)
      signIn({ is_host: 0, partner_id: 2, partner_type: PARTNER_TYPES.CERTIFIED })
      renderPage()

      expect(await processLink()).toHaveAttribute('href', `/fund-application/${review.id}`)
      expect(await editLink()).toHaveAttribute('href', `/fund-application/${review.id}`)
    }
  )

  it("offers the partner Edit on its own borrower's Draft application", async () => {
    server.use(
      http.get('*/common/funding-request/:id', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { ...approvedWithApplication, funding_application: { id: 80, status: FUNDING_APPLICATION_STATUS.DRAFT, is_editable: true } } })
      )
    )
    signIn({ is_host: 0, partner_id: 2, partner_type: PARTNER_TYPES.WHITE_LABEL })
    renderPage()

    expect(await editLink()).toHaveAttribute('href', `/fund-application/${review.id}`)
  })

  it('offers Process Application while no application exists', async () => {
    server.use(
      http.get('*/common/funding-request/:id', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { ...approvedWithApplication, funding_application: null } })
      )
    )
    signIn({ is_host: 1, partner_id: 1 })
    renderPage()

    expect(await screen.findByRole('link', { name: /process application/i })).toHaveAttribute('href', `/fund-application/${review.id}`)
    expect(screen.queryByRole('link', { name: /edit funding application/i })).not.toBeInTheDocument()
  })

  // Certified partners edit their own borrowers' applications the same as
  // white-label ones (it used to be white-label only).
  it("offers it to a certified partner on its own borrower's request", async () => {
    signIn({ is_host: 0, partner_id: 2, partner_type: PARTNER_TYPES.CERTIFIED })
    renderPage()

    expect(await editLink()).toHaveAttribute('href', `/fund-application/${review.id}`)
  })

  it("never offers it to a certified partner on another partner's request", async () => {
    signIn({ is_host: 0, partner_id: 9, partner_type: PARTNER_TYPES.CERTIFIED })
    renderPage()

    await screen.findByRole('link', { name: /go to client/i })
    expect(screen.queryByRole('link', { name: /edit funding application/i })).not.toBeInTheDocument()
  })
})

describe('Funding Request Details: activity log Want to Assign', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: 't', user: { id: 1, name: 'Host Admin', is_host: 1, permissions: [] } } as never)
    sidebar.props = null
  })

  afterEach(() => server.resetHandlers())

  it("lists the request partner's staff and shows its borrower's Assign to", async () => {
    server.use(
      http.get('*/common/funding-request/:id', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { ...review, partner_id: 4, borrower: { ...review.borrower, assign_id: 14 } } })
      )
    )
    renderPage()

    await screen.findByRole('link', { name: /go to client/i })
    expect(sidebar.props).toMatchObject({ entityType: 'Funding Request', partnerId: 4, taskOwner: { id: 14 } })
  })

  it('shows nobody when the borrower has no Assign to', async () => {
    server.use(http.get('*/common/funding-request/:id', () => HttpResponse.json({ status: true, message: 'ok', data: review })))
    renderPage()

    await screen.findByRole('link', { name: /go to client/i })
    expect(sidebar.props?.taskOwner).toBeNull()
  })
})

// Lender Information (host): assign from the shared card, then show the row as assigned.
describe('Funding Request Details: assigning a lender', () => {
  const lender = {
    id: 5,
    name: 'Fundbox Financing',
    phone: null,
    email: null,
    product_category: 'Term Loan',
    requirements: { min_fico: 450, min_business_credit_score: null, min_revenue: 4500, min_tib: 6, min_deposit: 2700 },
    checks: { fico: true, business_credit: true, revenue: true, tib: true, deposit: false },
    score: 75,
    score_text: 'Good Match',
    score_hex: '#d97706',
    matches_fraction: '3/4',
  }

  beforeEach(() => {
    useAuthStore.setState({ token: 't', user: { id: 1, name: 'Host Admin', is_host: 1, permissions: [] } } as never)
    server.use(
      http.get('*/common/funding-request/:id', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { ...review, matched_lenders: [lender] } })
      )
    )
  })

  afterEach(() => {
    server.resetHandlers()
    vi.restoreAllMocks()
  })

  async function assignFundbox() {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /^assign$/i }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /assign lender/i }))
  }

  it('assigns the lender to this request and shows it as assigned', async () => {
    let body: unknown = null
    server.use(
      http.post('*/common/funding-request/assign-lender', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ status: true, message: 'ok', data: {} })
      })
    )
    const success = vi.spyOn(toast, 'success')
    const refreshed = vi.fn()
    window.addEventListener('refreshActivities', refreshed)

    await assignFundbox()

    await waitFor(() => expect(success).toHaveBeenCalledWith('Lender assigned successfully'))
    expect(body).toEqual({ id: review.id, lender_ids: [5] })
    expect(await screen.findByText('Assigned')).toBeInTheDocument()
    expect(refreshed).toHaveBeenCalled()
    window.removeEventListener('refreshActivities', refreshed)
  })

  it('says why an assignment was refused and keeps the lender unassigned', async () => {
    server.use(
      http.post('*/common/funding-request/assign-lender', () =>
        HttpResponse.json({ status: false, message: 'The lender is fixed.' }, { status: 422 })
      )
    )
    const failure = vi.spyOn(toast, 'error')

    await assignFundbox()

    await waitFor(() => expect(failure).toHaveBeenCalledWith('The lender is fixed.'))
    expect(screen.queryByText('Assigned')).not.toBeInTheDocument()
  })

  it('falls back to a general message when the refusal says nothing', async () => {
    server.use(http.post('*/common/funding-request/assign-lender', () => HttpResponse.error()))
    const failure = vi.spyOn(toast, 'error')

    await assignFundbox()

    await waitFor(() => expect(failure).toHaveBeenCalledWith('Failed to assign lender'))
  })
})

/**
 * Defect: R2 BUG-008 - two lenders named "Kabbage" looked identical in Lender
 * Information, its Lender filter and the assign dialog. Each now reads
 * "Lender Name - Legal Name", and the filter picks just the one chosen.
 */
describe('Funding Request Details: lenders shown with their legal name', () => {
  const lender = (id: number, legal: string) => ({
    id,
    name: 'Kabbage',
    legal_name: legal,
    display_name: `Kabbage - ${legal}`,
    phone: null,
    email: null,
    product_category: 'Term Loan',
    requirements: { min_fico: 450, min_business_credit_score: null, min_revenue: 4500, min_tib: 6, min_deposit: 2700 },
    checks: { fico: true, business_credit: true, revenue: true, tib: true, deposit: false },
    score: 75,
    score_text: 'Good Match',
    score_hex: '#d97706',
    matches_fraction: '3/4',
  })

  beforeEach(() => {
    useAuthStore.setState({ token: 't', user: { id: 1, name: 'Host Admin', is_host: 1, permissions: [] } } as never)
    server.use(
      http.get('*/common/funding-request/:id', () =>
        HttpResponse.json({ status: true, message: 'ok', data: { ...review, matched_lenders: [lender(5, 'Kabbage Inc.'), lender(6, 'Kabbage Funding LLC')] } })
      )
    )
  })

  afterEach(() => server.resetHandlers())

  it('names each lender with its legal name, and the assign dialog too', async () => {
    renderPage()

    expect(await screen.findByText('Kabbage - Kabbage Inc.')).toBeInTheDocument()
    expect(screen.getByText('Kabbage - Kabbage Funding LLC')).toBeInTheDocument()

    const row = screen.getByText('Kabbage - Kabbage Funding LLC').closest('tr') as HTMLElement
    await userEvent.click(within(row).getByRole('button', { name: /assign/i }))
    await waitFor(() => expect(screen.getAllByText('Kabbage - Kabbage Funding LLC').length).toBeGreaterThan(1))
  })

  it('offers each lender once in the Lender filter, by that name, and filters to just it', async () => {
    renderPage()
    await screen.findByText('Kabbage - Kabbage Inc.')

    const lenderFilter = Array.from(document.querySelectorAll('.p-dropdown')).find((el) => el.textContent?.includes('All Lenders')) as HTMLElement
    await userEvent.click(lenderFilter)
    const option = await waitFor(() => {
      const found = Array.from(document.querySelectorAll('.p-dropdown-panel .p-dropdown-item'))
        .find((el) => el.textContent?.trim() === 'Kabbage - Kabbage Inc.')
      if (!found) throw new Error('no option')
      return found as HTMLElement
    })
    await userEvent.click(option)
    await userEvent.click(screen.getByRole('button', { name: /filters/i }))

    await waitFor(() => expect(screen.queryByText('Kabbage - Kabbage Funding LLC')).not.toBeInTheDocument())
    expect(screen.getAllByText('Kabbage - Kabbage Inc.').length).toBeGreaterThan(0)
  })
})
