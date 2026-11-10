import { describe, expect, it } from 'vitest'
import { renderWithProviders, screen } from '../../../../test-utils'
import ReviewProgressCard from '../../../../../src/pages/applications/funding-request/components/ReviewProgressCard'

/**
 * Defect (BUG-070): once a request was approved the tracker kept only the
 * submission and approval dates - Accepted and In Progress lost theirs. Each
 * step reached shows the date it was reached (status_dates from the API).
 */
const day = (iso: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))

describe('ReviewProgressCard - step dates', () => {
  it('keeps the date of every step reached after the request is approved', () => {
    const statusDates = {
      Accepted: '2026-10-20T09:00:00+00:00',
      'In Progress': '2026-10-21T10:30:00+00:00',
      Approved: '2026-10-22T15:45:00+00:00',
    }
    renderWithProviders(
      <ReviewProgressCard status="Approved" createdAt="2026-10-19T08:00:00+00:00" updatedAt="2026-10-22T15:45:00+00:00" statusDates={statusDates} />
    )

    for (const iso of ['2026-10-19T08:00:00+00:00', ...Object.values(statusDates)]) {
      expect(screen.getByText(day(iso))).toBeInTheDocument()
    }
  })

  it('without step dates, still shows the submission and the current step', () => {
    renderWithProviders(<ReviewProgressCard status="In Progress" createdAt="2026-10-19T08:00:00+00:00" updatedAt="2026-10-21T10:30:00+00:00" />)

    expect(screen.getByText(day('2026-10-19T08:00:00+00:00'))).toBeInTheDocument()
    expect(screen.getByText(day('2026-10-21T10:30:00+00:00'))).toBeInTheDocument()
  })
})

/**
 * Defect (BUG-159, OP-FREQ-14): the reason a request was rejected was saved
 * and shown to the client, but the staff page never showed it - the card got
 * the reason and dropped it. A rejected request shows why.
 */
describe('ReviewProgressCard - rejection reason', () => {
  const reason = 'Please add 3 months of bank statements'

  it('shows the reason on a rejected request', () => {
    renderWithProviders(<ReviewProgressCard status="Rejected" createdAt="2026-10-19T08:00:00+00:00" rejectReason={reason} />)

    const block = screen.getByRole('region', { name: 'Rejection reason' })
    expect(block).toHaveTextContent(reason)
  })

  it('shows no reason block while the request is not rejected', () => {
    renderWithProviders(<ReviewProgressCard status="Approved" createdAt="2026-10-19T08:00:00+00:00" rejectReason={reason} />)

    expect(screen.queryByRole('region', { name: 'Rejection reason' })).not.toBeInTheDocument()
    expect(screen.queryByText(reason)).not.toBeInTheDocument()
  })
})
