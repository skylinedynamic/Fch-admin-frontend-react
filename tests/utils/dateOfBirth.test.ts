import { describe, expect, it, vi } from 'vitest'
import { MINIMUM_AGE, MINIMUM_AGE_MESSAGE, dateOfBirthError, latestDateOfBirth, openOnLatestDateOfBirth } from '../../src/utils/dateOfBirth'

/**
 * The platform minimum age (18), as the API checks it (App\Rules\DateOfBirth):
 * every date-of-birth calendar opens there when empty, and a later pick gets
 * the API's minimum-age message.
 */
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

describe('date of birth limit', () => {
  it('is 18 years', () => {
    expect(MINIMUM_AGE).toBe(18)
  })

  it('is 18 years before today, so someone turning 18 today can be picked', () => {
    expect(ymd(latestDateOfBirth(new Date(2026, 10, 9, 15, 30)))).toBe('2008-11-09')
  })

  it('is local midnight, so the whole last day can be picked', () => {
    const d = latestDateOfBirth(new Date(2026, 10, 9, 23, 59))
    expect([d.getHours(), d.getMinutes()]).toEqual([0, 0])
  })

  it('does not roll 29 February into March', () => {
    // 2010 has no 29 Feb: someone born on 1 March 2010 is still 17.
    expect(ymd(latestDateOfBirth(new Date(2028, 1, 29)))).toBe('2010-02-28')
  })
})

describe('date of birth limit moves with the current date', () => {
  it.each([
    [new Date(2026, 10, 9), '2008-11-09'],
    [new Date(2027, 2, 15), '2009-03-15'],
    [new Date(2030, 0, 1), '2012-01-01'],
  ])('on %s it is %s', (today, expected) => {
    expect(ymd(latestDateOfBirth(today))).toBe(expected)
  })
})

describe('dateOfBirthError', () => {
  const today = new Date(2026, 10, 9, 15, 0)

  it('passes someone turning 18 today and anyone older', () => {
    expect(dateOfBirthError('2008-11-09', today)).toBeNull()
    expect(dateOfBirthError(new Date(1985, 3, 12), today)).toBeNull()
  })

  it('gives the API minimum-age message for an under-18 date, e.g. this year', () => {
    expect(dateOfBirthError('2008-11-10', today)).toBe('You must be at least 18 years old to continue.')
    expect(dateOfBirthError('2026-01-01', today)).toBe(MINIMUM_AGE_MESSAGE)
    expect(dateOfBirthError(new Date(2026, 10, 9), today)).toBe(MINIMUM_AGE_MESSAGE)
  })

  it('gives the future-date message for a date after today', () => {
    expect(dateOfBirthError('2026-11-10', today)).toBe('Date of birth cannot be in the future.')
  })

  it('leaves an empty field to the form', () => {
    expect(dateOfBirthError('', today)).toBeNull()
    expect(dateOfBirthError(null, today)).toBeNull()
    expect(dateOfBirthError(undefined, today)).toBeNull()
  })
})

describe('openOnLatestDateOfBirth (Flatpickr onOpen)', () => {
  it('opens an empty calendar 18 years back', () => {
    const jumpToDate = vi.fn()
    openOnLatestDateOfBirth([], '', { jumpToDate })
    expect(ymd(jumpToDate.mock.calls[0][0])).toBe(ymd(latestDateOfBirth()))
  })

  it('leaves a calendar with a date on that date', () => {
    const jumpToDate = vi.fn()
    openOnLatestDateOfBirth([new Date(1990, 4, 12)], '1990-05-12', { jumpToDate })
    expect(jumpToDate).not.toHaveBeenCalled()
  })
})
