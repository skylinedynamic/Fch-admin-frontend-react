# Appointments side panel uses the borrower-portal design

2026-11-23

## Problem
On `/appointments` in the partner portal, the side panel above the appointments list did not match the borrower portal (client-fch `/appointment`). It had an "All Appointments" heading and a small dashed box saying "No upcoming appointments". The borrower portal's design was the one to keep.

## Solution
Copied the borrower portal's markup from `client-fch/src/pages/appointment/Appointments.tsx`:
- Heading: "Upcoming Appointment" (`h4 fs-18`), with the subtitle "Don't miss scheduled appointments".
- Empty state: a card with a round calendar icon. It says "No Upcoming Events" on desktop and "There is no schedule found" on mobile, followed by "Use the button above to book your next session."

One difference from the borrower portal: the "Use the button above…" hint only appears when the user has the `create appointments` permission. The Create button is hidden without that permission, so the hint would point to nothing.

The empty card uses a new `.appointment-empty-card` class (in `assets/css/custom.css`) in place of `border-dashed border-light`. This app's theme sets `.border-dashed{border:none!important}`, so the dashed box never appeared. The borrower portal draws it with its own `custom.css` rule (1px dashed `#d1d5db`, 0.375rem radius, `#f8f9fa` background). The new class uses the same values but applies only to this card, so other `.border-dashed` elements in the partner portal don't change.

The loading placeholders, the appointment cards and the rule that the list shows only meetings that have not ended did not change.

## Files changed
- `src/pages/appointments/Appointments.jsx`: new heading and empty-state markup.
- `assets/css/custom.css`: new `.appointment-empty-card` rule, with the borrower portal's dashed border, corner radius and background.
- `tests/pages/appointments/Appointments.test.tsx`: two new tests (the new heading and empty state; no hint without the create permission). One existing test now expects the new empty-state text.

## Testing
- `npx vitest run tests/pages/appointments/Appointments.test.tsx`: 14/14 pass. The 2 new tests failed before the change.
- `npm run typecheck`: clean.
- No E2E spec checks this panel's text, so none needed changing.

## Open items
- The page hasn't been checked in a browser yet; compare it with the borrower portal at desktop width.
