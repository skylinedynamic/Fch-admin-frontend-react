# Appointment dialog redesign

2026-11-23

## Problem
The appointment dialog on `/appointments` (Add, Edit and Appointment Details) looked unfinished:
- **Form:** everything was in one flat list, and the Event Date and Time Slot row was out of line with the fields above it. Its end-time box ran past the right edge.
- **Details view:** the Edit button floated in a corner, there was no status, the "Appointment With" box was heavy, and the header was plain.

## Solution
Changed the layout and styles only. What the dialog sends and loads is unchanged.
- **Header:** an icon (different for add, edit and details), the title, and a one-line subtitle.
- **Form:** four sections, each a white card with a heading: **Meeting** (title, type), **People** (attendees; still hidden for an invitee, BUG-102), **Schedule** (date, time slot, clash alert, time zone) and **Notes** (description). The date and time row is now a normal two-column row, so it lines up with the other fields.
- **Details:**
  - The top card shows a status badge, the meeting type and the title, with Edit or Reschedule on the right.
  - Date, time, time zone and "scheduled by" sit in a 2×2 grid of cards, one column on phones.
  - The description is in its own card.
  - "Appointment With" is a lighter card with a coloured left edge.
- **Status badge:** uses `APPOINTMENT_STATUS_CONFIG`. A pending meeting whose time has passed shows as **Expired**, as in the appointments list. For this, `APPOINTMENT_STATUS.EXPIRED` (`'expired'`) was added; it is display only and is never sent to the API.
- **Look, as asked:**
  - The dialog and its cards use a 4px radius.
  - Buttons use the app's standard classes (`btn-primary`, `btn-light`, `btn-soft-danger`, `btn-success`, `btn-sm btn-soft-primary`). The dialog's own `.btn-soft-danger` override was removed.
- **Colours:** come from the theme variables (`--vz-primary`, `--vz-primary-rgb`), so each partner's brand colour still applies.

## Files changed
- `src/components/Common/Modals/AppointmentModal.jsx`: new header, details layout and form sections; new `FormSection` helper; simpler `DetailItem`; status badge.
- `assets/css/appointment-modal.css`: new styles under `.appointment-modal-theme` (4px radius); the old `.btn-soft-danger` override removed.
- `src/config/appointmentTypeOptions.ts`: `APPOINTMENT_STATUS.EXPIRED` (display only).
- `tests/components/Common/Modals/AppointmentModal.test.tsx`: 3 new tests (status and type beside the title; a past pending meeting shows Expired; the form has Meeting, People, Schedule and Notes sections).

## Testing
- New tests failed first (3 failed), then passed.
- `npx vitest run`: full suite, 493 files, 3751 passed and 2 expected failures. This ran before the 4px and button change.
- After the 4px and button change: the modal and page tests pass (36/36), and `npm run typecheck` is clean.
- `npx playwright test e2e/sidebar/appointments --project=mock`: 34/34 pass.
- Checked with screenshots of the Add form (desktop and 390px wide) and the details view.

## Open items
- The Edit form opened through Reschedule (invitee) and the Calendly booking fields inside **People** were not screenshot-checked. They use the same section styling.
