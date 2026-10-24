# Appointments — booked in the browser's time zone, no past times today (BUG-078, 079, 080)

2026-10-24

## Problem
- **BUG-080**: the appointment dialog defaulted Time Zone to "UTC (GMT+00:00)" and the calendar showed times as stored, unconverted. It also took "today" and an edited appointment's day from `toISOString()` — the UTC day, wrong east of UTC late in the evening.
- **BUG-078**: the Time Slot list offered every time of today, past ones included (only past days were blocked).
- **BUG-079**: overlapping bookings were saved — fixed in the API; the dialog shows its refusal.

## Solution
- New `src/utils/appointmentTime.ts`: `browserTimeZone()`, `timeZoneLabel()` ("Asia/Dhaka (GMT+06:00)"), `localDateString()` (the browser's day), `startSlotsFrom()` (today: only times still ahead), `defaultStart()` (09:00, else the next time still ahead, else tomorrow 09:00), `timeAfter()`.
- `AppointmentModal.jsx`:
  - Time Zone is the browser's, read only, with "Times are booked and shown in your time zone."; the booking sends it as `timezone` (an IANA name). The API stores UTC and sends times back in the browser's zone (X-Timezone), so the calendar shows local times with no change of its own. The details dialog's Time Zone shows the browser's zone.
  - Start times of today that have passed are not offered; a new booking starts at `defaultStart()`; picking today moves a passed start to the next one; an edited appointment keeps its own time in the list.
  - Dates use the browser's day.
  - The API's refusals (time passed, clash) show under the date (`formErrors.appointment_date`, unchanged).
- API side: fch-api `docs/handoff/2026-10-24-appointments-utc-past-times-and-clashes.md`.

## Files changed
- `src/utils/appointmentTime.ts` — new.
- `src/components/Common/Modals/AppointmentModal.jsx` — zone, start times, local day.
- `tests/utils/appointmentTime.test.ts` — new, 9 tests.
- `e2e/sidebar/appointments/appointment-modal.spec.ts` — clock and zone fixed (Asia/Dhaka, 26 Oct 2026); the save test now expects exactly `2026-10-26 09:00:00`; +3 tests (browser zone shown and sent; passed times not offered and the start moved; the API's refusal shown under the date).

## Testing
- New E2E tests: zone and passed-times failed first, pass after; the refusal test passed already (the field shows `appointment_date` errors).
- Vitest: 246 files, 1727 passed. `npm run typecheck` clean. E2E (mock) `e2e/sidebar/appointments`: 15 passed.

## Open items
- `TIMEZONE_OPTIONS` in `src/config` is no longer used by the dialog; left in place.
- Mark BUG-078, 079, 080 in the QA defect log In Progress, then Fixed after the stage retest.
