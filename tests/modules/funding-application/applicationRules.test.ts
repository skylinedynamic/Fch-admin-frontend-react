import { describe, expect, it } from 'vitest'
import { latestAdultBirthDate, MINIMUM_APPLICANT_AGE, PURPOSE_NOTE_MAX_LENGTH } from '../../../src/modules/funding-application/applicationRules'

/**
 * Defect: R2 BUG-031 - the owner's and co-borrower's date-of-birth pickers
 * allowed any date up to today, so a 17-year-old could be picked and saved.
 */
describe('latestAdultBirthDate', () => {
  const today = new Date(2026, 9, 21) // 21 Oct 2026

  it('is the same day 18 years ago', () => {
    expect(latestAdultBirthDate(today)).toEqual(new Date(2008, 9, 21))
  })

  it('lets someone who turns 18 today through, and not someone a day younger', () => {
    const latest = latestAdultBirthDate(today)
    expect(new Date(2008, 9, 21) <= latest).toBe(true)
    expect(new Date(2008, 9, 22) <= latest).toBe(false)
  })

  it('refuses the QA case: born 15 Oct 2009 (17)', () => {
    expect(new Date(2009, 9, 15) <= latestAdultBirthDate(today)).toBe(false)
  })

  it('matches the API minimum age', () => {
    expect(MINIMUM_APPLICANT_AGE).toBe(18)
  })
})

/** R2 BUG-032 - the Purpose Note limit is the API's (max:500). */
describe('PURPOSE_NOTE_MAX_LENGTH', () => {
  it('is 500', () => {
    expect(PURPOSE_NOTE_MAX_LENGTH).toBe(500)
  })
})
