# Partner Confirm uses the new confirm endpoint

2026-11-24

## Problem
In the partner portal, **Confirm** in Appointment Details sent a general `PUT /common/appointments/{id}` with `{ assigned_for, status: 'confirmed' }`. The others on the meeting were emailed "Appointment Updated", not "Confirmed". The API has since gained a dedicated `POST /common/appointments/{id}/confirm`, which the borrower portal now uses too (fch-api handoff `2026-11-24-appointment-confirm.md`).

## Solution
- **Confirm button:** now calls `confirmAppointment(id)`, which is `POST …/confirm`. It shows the API's message ("Appointment confirmed."), closes the dialog and reloads the calendar. A refusal shows the API's reason.
- **Unchanged:** when Confirm is shown (to the person it was booked with, while it is pending and still ahead), and Cancel, which is still a PUT with `status: cancelled`.
- **Organiser's view:** after a borrower confirms a meeting the partner booked, the partner sees it as **Confirmed**, from the status badge added in the dialog redesign. No new button was needed. A test now covers this.

## Files changed
- `src/modules/appointment/services.ts`: `confirmAppointment()`.
- `src/components/Common/Modals/AppointmentModal.jsx`: `handleConfirm()`; Confirm no longer goes through `updateStatus`.
- `tests/modules/appointment/services.test.ts`: `confirmAppointment` posts to `/appointments/{id}/confirm`.
- `tests/components/Common/Modals/AppointmentModal.test.tsx`:
  - The test "Confirm sets the status to confirmed" (PUT) is replaced by "Confirm posts to the confirm endpoint, says so, and does not edit the appointment".
  - New: a refused confirm shows the reason.
  - New: the organiser sees a confirmed meeting as Confirmed, with nothing to confirm.
- `e2e/sidebar/appointments/appointment-modal.spec.ts`: "Confirm sets the status to confirmed" is now "Confirm posts to the confirm endpoint and says so" (mock for `POST …/1/confirm`).

## Testing
- The changed and new tests failed first (3), then passed. `tests/modules/appointment`, `tests/components/Common/Modals/AppointmentModal.test.tsx`, `tests/pages/appointments` and `tests/components/Appointment`: 110/110.
- `npm run typecheck`: clean.
- `npx playwright test e2e/sidebar/appointments --project=mock` (against the dev server on :5174): 34/34.

## Open items
- None.
