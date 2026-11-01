import { describe, expect, it } from 'vitest'
import { FUNDING_REVIEW_GUIDELINE_CARDS, FUNDING_REVIEW_STATUS } from '../../src/config/funding'

const descOf = (label: string) => FUNDING_REVIEW_GUIDELINE_CARDS.find((card) => card.label === label)?.desc

/** Defect (BUG-015): the status guideline read "Admin can reviewing…" and "declined missing information". */
describe('funding request status guideline', () => {
  it('reads correctly for In Progress and Rejected', () => {
    expect(descOf(FUNDING_REVIEW_STATUS.IN_PROGRESS)).toBe('Admin is reviewing the request.')
    expect(descOf(FUNDING_REVIEW_STATUS.REJECTED)).toBe('Request declined due to missing information.')
  })
})
