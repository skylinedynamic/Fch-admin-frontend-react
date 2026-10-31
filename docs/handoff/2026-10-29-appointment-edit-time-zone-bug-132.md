# Appointment edit saved 6 hours late — fixed by the browser time zone change (BUG-132)

2026-10-29

## Problem
QA defect log **BUG-132** (PP-APPT-04, reported 27-Oct). Wanda edited an appointment's start to 02:00 PM, and it was saved and shown as 8:00 PM. The edit request sent `appointment_date 2026-10-29 14:00:00` with `timezone: UTC`, so the browser's local time was labelled as UTC. The API then added the user's offset (Asia/Dhaka, +6) a second time. On create, QA picked "Time Zone UTC" from the dropdown, and the edit form's Time Zone was empty.

## Finding
No new code was needed. QA's run used a stage build from before the 24-Oct time zone change ([2026-10-24-appointments-browser-time-zone-and-no-past-times.md](2026-10-24-appointments-browser-time-zone-and-no-past-times.md), BUG-080). That change reached stage on 27-Oct 16:16 (merge `7790d8a7`, PR #40). It made the dialog's Time Zone the browser's own, read only, on both create and edit. Every save sends that zone as `timezone`, so a picked time is never relabelled as UTC.

The two signs of the old build are in QA's own steps:
- a Time Zone choice of "UTC" on create
- an empty Time Zone on edit

Neither is possible now.

## Files changed
- `e2e/sidebar/appointments/appointment-modal.spec.ts`: +1 test, "Edit saves the time picked, in the browser's time zone". The booker edits, sees Time Zone "Asia/Dhaka (GMT+06:00)", picks 02:00 PM, and the PUT carries `appointment_date: 2026-10-28 14:00:00` with `timezone: Asia/Dhaka`. The edit path had no test pinning the zone.

## Testing
- The new test fails against the dialog from before the 24-Oct change (Time Zone not the browser's) and passes now.
- `appointment-modal.spec.ts`: 16/16.

## Open items
- **QA retest on the current stage.** Book 09:00 AM, edit to 02:00 PM, reopen: Details shows 2:00 PM–2:30 PM with the browser's time zone.
- **Appointments booked with the old "UTC" choice** keep their stored time. Only the label of new and edited ones changes.
