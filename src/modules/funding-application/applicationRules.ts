/**
 * Limits the API puts on a funding application, kept here so the form offers
 * only what the server will accept.
 */

/** Owners and co-borrowers must be adults (App\Rules\AdultDateOfBirth) - R2 BUG-031. */
export const MINIMUM_APPLICANT_AGE = 18

/** The Purpose Note's limit (`purpose_note` max:500) - R2 BUG-032. */
export const PURPOSE_NOTE_MAX_LENGTH = 500

/**
 * The latest date of birth that is old enough today: the date pickers stop
 * there. They used to allow any date up to today, so a 17-year-old owner or
 * co-borrower could be picked and saved (R2 BUG-031).
 */
export function latestAdultBirthDate(today: Date = new Date()): Date {
  return new Date(today.getFullYear() - MINIMUM_APPLICANT_AGE, today.getMonth(), today.getDate())
}
