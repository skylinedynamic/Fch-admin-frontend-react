import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { server } from '../../../mocks/server'
import { renderWithProviders, screen } from '../../../test-utils'
import { useAuthStore } from '../../../../src/store/auth/authStore'
import FundingRequestDetail from '../../../../src/pages/applications/funding-request/FundingRequestDetail'

// The activity sidebar pulls in Summernote, which needs a real canvas.
vi.mock('../../../../src/components/Common/Activity/ActivitySidebar', () => ({ default: () => null }))

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
