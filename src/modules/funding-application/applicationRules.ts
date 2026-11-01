/**
 * Limits the API puts on a funding application, kept here so the form offers
 * only what the server will accept.
 */

/** The Purpose Note's limit (`purpose_note` max:500) - R2 BUG-032. */
export const PURPOSE_NOTE_MAX_LENGTH = 500
