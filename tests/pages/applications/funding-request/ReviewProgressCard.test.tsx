import { describe, expect, it } from 'vitest'
import { renderWithProviders, screen, within } from '../../../test-utils'
import ReviewProgressCard from '../../../../src/pages/applications/funding-request/components/ReviewProgressCard'
import { FUNDING_REVIEW_STATUS } from '../../../../src/config/funding'

const guideline = () => screen.getByRole('region', { name: 'Status Guideline' })

/**
 * Defect (QA 2026-10-16): the admin Status Guideline was unclear and wrong
 * ("Admin can reviewing the request.", Accepted = "Review completed
 * successfully."). It did not tell the Host when to set each status, and did
 * not show which status the request is at now.
 */
describe('ReviewProgressCard status guideline (Host)', () => {
  it('lists every status the Host can set, in review order', () => {
    renderWithProviders(<ReviewProgressCard status={FUNDING_REVIEW_STATUS.PENDING} />)

    const titles = within(guideline()).getAllByRole('heading', { level: 6 }).map((h) => h.textContent)
    expect(titles).toEqual(['Pending', 'Accepted', 'In Progress', 'Approved', 'Rejected', 'Cancelled'])
    expect(screen.queryByText(/admin can reviewing/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/review completed successfully/i)).not.toBeInTheDocument()
  })

  it.each([
    [/new request.*only the host reviews/i],
    [/set when all documents and information are checked and complete/i],
    [/set while you process the application or need something from the borrower/i],
    [/set when everything is complete and correct.*borrower can start the funding application/i],
    [/set when documents are missing or the funding requested is wrong/i],
    [/set to stop a request.*wrong funding type/i],
  ])('tells the Host when to use each status: %s', (text) => {
    renderWithProviders(<ReviewProgressCard status={FUNDING_REVIEW_STATUS.PENDING} />)

    expect(within(guideline()).getByText(text)).toBeInTheDocument()
  })

  it.each([FUNDING_REVIEW_STATUS.PENDING, FUNDING_REVIEW_STATUS.IN_PROGRESS, FUNDING_REVIEW_STATUS.CANCELED])(
    'marks %s as the current status',
    (status) => {
      renderWithProviders(<ReviewProgressCard status={status} />)

      const current = within(guideline()).getByRole('listitem', { current: 'step' })
      expect(within(current).getByRole('heading', { level: 6 })).toHaveTextContent(status)
      expect(within(current).getByText('Current')).toBeInTheDocument()
    },
  )
})
