# Appointment form: Calendly time fit, quiet clash check, email check, layout

**Date:** 2026-11-23

## Problem
- A start time that is not open in Calendly was only found out on Confirm (Calendly refuses it); the end time did not follow the event type's length (Calendly books that long anyway).
- Picking a time popped up a loading skeleton for the clash check every time.
- A mistyped outside email was only refused by the API on save.
- The modal was narrow; Title and Type took a row each.

## Solution
- `CalendlyBookingFields` tells the form, via `onCalendlyFit({ minutes, open })`, the event type's length and whether the start (`selectedTime`) is one of Calendly's open times (null when not syncing). The form sets the end to start + length while syncing, and shows "Not an open time in your Calendly - Calendly will refuse it…" under Time Slot.
- The clash check runs without the skeleton (`isCheckingAvailability` still disables Confirm); only a clash shows.
- Attendee picker: an outside email must look like name@domain.tld (`ATTENDEE_EMAIL_PATTERN`, `ATTENDEE_EMAIL_INVALID` in `modules/appointment/types.ts`) before it is added - on Enter (and the borrower portal's Add). The API still checks it on save.
- Modal 960px wide (`appointment-modal-dialog` in `assets/css/appointment-modal.css`); Title (col-md-8) and Type (col-md-4) on one line.
- Admin only: several event types - the dropdown at ~320px with the place chip beside it, the same height (38px).

## Files changed
- `CalendlyBookingFields.tsx`, `AttendeePicker.tsx`, the appointment modal, `modules/appointment/types.ts`, `assets/css/appointment-modal.css` (+ admin `assets/css/calendly-appointments.css`).

## Testing
- Booking panel reports the fit; picker refuses malformed emails; borrower form: note under Time Slot, end after the event type length, no skeleton while a check runs (held open in the test); admin e2e: the note and the end time. Admin Vitest (appointment components, modal, page): 72 passed; borrower appointment tests: 65 passed; admin `sidebar/appointments` e2e: 37 passed, 1 skipped (live). Typecheck clean in both.

## Open items
- The email check is in the portal at the user's request (the usual rule keeps format checks in fch-api); the API's attendee rules stay the authority.
- Follow-up: the attendee search list closes once someone is picked (or an email added); typing opens it again. Test: `AttendeePicker` "closes the list once someone is picked".
