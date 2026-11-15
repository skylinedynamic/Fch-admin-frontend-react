/**
 * The value a form's sign-in email field shows (BUG-203).
 *
 * While a change waits for confirmation, every form with a sign-in email -
 * Profile, Clients, Partners, Employees, Users - shows the pending email, and
 * the notice above it names the current one. A save that only edits other
 * fields then sends the pending email back untouched and the API keeps the
 * change; typing the current email back in is what withdraws it. The API
 * (fch-api `EmailChangeService::takeFrom()`) compares against the same value.
 */
export const emailFieldValue = (current?: string | null, pending?: string | null): string =>
  pending || current || ''
