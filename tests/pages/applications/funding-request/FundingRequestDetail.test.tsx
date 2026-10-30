import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { server } from '../../../mocks/server'
import { renderWithProviders, screen } from '../../../test-utils'
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
