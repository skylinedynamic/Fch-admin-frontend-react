# Appointments — the person a meeting was booked with can reschedule, confirm or cancel it (BUG-102)

2026-10-25

## Problem
QA defect log **BUG-102** (E2E-21, Partner portal › Appointments): a white-label client (QA-TEST Wanda Client One) booked "QA-TEST Run1 WL client booking" with its partner Wanda. Wanda saw it (calendar, list, bell 4 → 5, status Pending), but the Appointment Details dialog had no Edit, Delete or Confirm button, so the meeting stayed Pending.

`AppointmentModal` showed Edit and Delete only when the signed-in user was `scheduled_by` — the client — and had no way to change the status at all. The API already lets both people on a meeting (`scheduled_by` or `assigned_for`) update it, and accepts `status` (`UpdateAppointmentRequest`), so this was portal-only.

## Solution
In the details dialog, for the person it was booked with (`assigned_for`, not the booker), with `update appointments`:
- **Reschedule** (in place of Edit) opens the edit form without the "Appointment With" picker and "Meeting with host" toggle — they cannot change who the meeting is with. The save sends the new time with `assigned_for` unchanged and no `entity_type` / `entity_id` / `meeting_with(_host)`, so the API keeps the booking as it was.
- **Confirm** while Pending → `PUT /common/appointments/{id}` `{ assigned_for, status: "confirmed" }`.
- **Cancel Appointment** while Pending or Confirmed → asks "Cancel this appointment?", then `{ assigned_for, status: "cancelled" }`. Cancel keeps the record (the booker sees it as cancelled) instead of deleting it.
- Confirm / Cancel are not offered once the meeting's time has passed.

The booker keeps Edit and Delete exactly as before. Statuses come from a new `APPOINTMENT_STATUS` in `src/config/appointmentTypeOptions.ts` instead of inline strings.

## Files changed
- `src/components/Common/Modals/AppointmentModal.jsx` — scheduler / invitee roles, Reschedule / Confirm / Cancel Appointment, cancel question (`ConfirmationModal`), invitee save payload.
- `src/config/appointmentTypeOptions.ts`, `src/config/index.ts` — `APPOINTMENT_STATUS`.
- `tests/components/Common/Modals/AppointmentModal.test.tsx` — new, 10 tests.
- `e2e/sidebar/appointments/appointment-modal.spec.ts` — new "the person it was booked with" block, 5 tests.

## Testing
- New Vitest (integration — the real dialog, store and `apiClient`, HTTP via MSW): invitee sees Reschedule / Confirm / Cancel and no Delete; Confirm and Cancel payloads; cancel asks first; Close returns to the details, a finished cancel does not reopen them; no Confirm once confirmed, nothing once cancelled; nothing without `update appointments`; Reschedule hides the picker and keeps `assigned_for`. 5 **failed first**, pass after; the 3 booker / permission cases passed throughout. Full suite: 253 files, 1776 passed (2 expected fail). `npm run typecheck` clean.
- New E2E (mock, production build): Reschedule / Confirm / Cancel for the invitee, Edit / Delete for the booker — the 4 invitee tests **failed on the old code** (source stashed and rebuilt), pass after. `e2e/sidebar/appointments`: 20 passed with `--workers=1`; with the default 50% workers this machine closed browser sessions mid-run ("Protocol error … session closed") across untouched specs too.
- Not run: the live suite, or a click-through on the local database as Wanda.

## Open items
- Mark BUG-102 in the QA defect log, and retest on stage as Wanda with a booking from Wanda Client One.
- Rescheduling sends no status, so a rescheduled meeting keeps its status (e.g. Pending). The API also has `rescheduled` / `rejected`, which the portal has no label for in `APPOINTMENT_STATUS_CONFIG` — decide if the invitee's reschedule should set one.
- The invitee's availability check runs against their own calendar only, not the booker's.
