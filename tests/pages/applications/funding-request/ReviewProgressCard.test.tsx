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
    [/received and waiting for the host to review/i],
    [/all documents and information are checked and complete/i],
    [/under review.*more information or documents/i],
    [/everything is complete and correct.*start your funding application/i],
    [/does not meet our requirements.*reapply if needed/i],
    [/stopped the request before it was completed/i],
  ])('explains what each status means: %s', (text) => {
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
