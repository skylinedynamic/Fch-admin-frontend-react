# Calendly integration (partner portal)

**Date:** 2026-11-10
**Branch:** `feature/calendly-integration` (from `release`)
**Author:** arafat-invento (with Claude Code)

## Problem
Meetings booked in the company Calendly didn't appear on the Appointments calendar, and nothing booked here reached Calendly.

## Solution
This is the partner-portal side of the backend change. See `fch-backend-api/docs/handoff/2026-11-10-calendly-integration.md` for how it works end to end.

- A **Calendly card** on Appointments, from `CalendlyConnectCard`, sits under the Create button.
  - **Host's team:** Connect Calendly (or Reconnect when it has expired), Sync now, Disconnect, and a warning when webhooks are not active.
  - **Everyone allowed to book:** Book via Calendly.
  - Nobody else sees the card.
- **Book via Calendly**, from `CalendlyBookingModal`:
  1. Pick the event type, then (the host only) who the meeting is with, then a day.
  2. Pick one of Calendly's open slots, shown in the browser's zone.
  3. Optionally add a subject, meeting type and description.
  4. The booking is made in Calendly and shows on the calendar.
- **Calendly meetings** get a "Calendly" badge in the list, with **Join** and **Reschedule** links. They can't be dragged on the calendar, because their time belongs to Calendly.
- Coming back from Calendly at `/appointments?calendly=connected|error` shows a toast and clears the flag.

## Files changed
- `src/modules/calendly/{types,services,queries,index}.ts` — the `/common/calendly/*` calls.
- `src/lib/query/queryKeys.ts` — `calendly` keys.
- `src/components/Calendly/CalendlyConnectCard.tsx`, `src/components/Calendly/CalendlyBookingModal.tsx` — new.
- `src/pages/appointments/Appointments.jsx` — the card and modal, the badge and links, no dragging for Calendly meetings, the return toast.
- `src/modules/appointment/types.ts` — the new appointment fields.

## Tests
- Added:
  - `tests/modules/calendly/services.test.ts`
  - `tests/components/Calendly/CalendlyConnectCard.test.tsx`
  - `tests/components/Calendly/CalendlyBookingModal.test.tsx`
- Updated:
  - `tests/pages/appointments/Appointments.test.tsx` — the Calendly badge and links, and the connected and error return toasts.

## Open / follow-up
- The edit modal (`AppointmentModal`) still lets you change a Calendly meeting's time. The API refuses it with "use its Reschedule link" (422), which the modal shows as an error. Hiding the time fields for `is_calendly` would be nicer.
- Backend D19 and O81–O83 (notifications, rotating the secret, Free plan limits, webhooks on localhost).
