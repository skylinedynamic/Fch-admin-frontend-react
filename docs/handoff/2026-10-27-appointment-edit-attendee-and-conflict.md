# Editing an appointment keeps its attendee and checks conflicts before saving (BUG-100)

Date: 2026-10-27

## Problem
Wanda › Appointments › an appointment with QA-TEST Wanda Client One › Edit:
- "Meeting with host" was ticked and "Appointment With" showed "Select Users" (empty).
- Changing the time and saving showed "Appointment updated successfully." together with "Scheduling Conflict".

Causes:
1. On edit, a partner's checkbox was ticked whenever the attendee was a client. Ticked, the picker lists the host's users (`meeting_with_host`), so the client was not in it and the dropdown looked empty.
2. The conflict check runs 500ms after each change. A quick Save went out with no conflict information, the update succeeded, and the late check then showed the conflict. The API does not block overlaps.

## Solution
1. The checkbox follows who the meeting is with: ticked only when the attendee is a partner account. That is another partner for the host ("Meeting with partner"), or the host for a partner ("Meeting with host"). The stored flags are used only when there is no attendee type. The debug `console.log`s in that block are gone.
2. Save asks `check-availability` afresh before updating. A conflict with another appointment shows the error toast and the Scheduling Conflict panel and saves nothing. Otherwise it saves once and says only that it was updated. The appointment itself is still excluded by id.

## Files changed
- `src/components/Common/Modals/AppointmentModal.jsx`: checkbox from the attendee type; pre-save availability check; the conflict panel is filled from that check.
- `tests/components/Common/Modals/AppointmentModal.test.tsx`: `open()` takes extra stubs; new block for a partner editing its appointment with a client (attendee shown, box unticked; a conflict blocks the save; no conflict saves once).

## Testing
- The new tests failed first (the client was missing from the picker).
- With the pre-save check switched off, the conflict test fails; switched back on, all pass.
- `AppointmentModal.test.tsx`: 13/13.
- Full Vitest run: 1838 passed, 2 expected fail (262 files). `npm run typecheck`: 0 errors. Mock E2E for appointments, invoices, embedded form and users after `npm run build`: 119/119.

## Open items
- The API still accepts an overlapping booking if a client skips the form's check.
