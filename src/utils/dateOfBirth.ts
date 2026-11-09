/**
 * The platform minimum age, as the API checks it (fch-backend-api
 * App\Rules\DateOfBirth, config app.minimum_age).
 *
 * Every date-of-birth calendar:
 *   - offers every date up to today (no future dates);
 *   - opens an empty field 18 years back (latestDateOfBirth(), e.g. November
 *     2008 on 9 November 2026 and March 2009 on 15 March 2027); a saved date
 *     opens on that date;
 *   - shows dateOfBirthError() under the field as soon as a date is picked, so
 *     an under-18 date gets "You must be at least 18 years old to continue."
 *     straight away. The API checks the same rule on save and answers with the
 *     same message.
 *
 * The borrower (client-fch) and partner (Fch-admin-frontend-react) portals
 * carry identical copies of this file; keep the two in sync.
 */
export const MINIMUM_AGE = 18

export const MINIMUM_AGE_MESSAGE = `You must be at least ${MINIMUM_AGE} years old to continue.`
export const FUTURE_DATE_OF_BIRTH_MESSAGE = 'Date of birth cannot be in the future.'

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/**
 * The latest date of birth that is old enough today, at local midnight.
 * Someone turning 18 today is old enough. On 29 February the cutoff is
 * 28 February, never 1 March (the API's rule too).
 */
export const latestDateOfBirth = (today: Date = new Date()): Date => {
  const year = today.getFullYear() - MINIMUM_AGE
  const month = today.getMonth()
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate()

  return new Date(year, month, Math.min(today.getDate(), lastDayOfMonth))
}

/** A YYYY-MM-DD value (what the calendars post) as a local date. */
const parseYmd = (value: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

/**
 * The message for a picked date of birth, or null when it is fine (or empty -
 * whether the field is required is the form's own check).
 */
export const dateOfBirthError = (value: Date | string | null | undefined, today: Date = new Date()): string | null => {
  const date = typeof value === 'string' ? parseYmd(value) : value
  if (!date || Number.isNaN(date.getTime())) return null

  const day = startOfDay(date)
  if (day > startOfDay(today)) return FUTURE_DATE_OF_BIRTH_MESSAGE
  if (day > latestDateOfBirth(today)) return MINIMUM_AGE_MESSAGE

  return null
}

/**
 * Flatpickr onOpen hook: an empty date-of-birth field opens 18 years back
 * instead of on today's month. A field with a date opens on that date.
 */
export const openOnLatestDateOfBirth = (
  selectedDates: Date[],
  _dateStr: string,
  instance: { jumpToDate: (date: Date) => void },
) => {
  if (!selectedDates.length) instance.jumpToDate(latestDateOfBirth())
}
