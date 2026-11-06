# 2026-11-02 — Appointments can end after midnight, and a refused save says why (BUG-024, round 2)

## At a glance

| | |
|---|---|
| **Problem** | Appointments (R2-OP-APPT-02): with the start at **11:30 PM**, the end list was empty. Confirm sent `duration_minutes: 0`, the API answered 422 "Duration must be at least 1 minute.", and the modal stayed open with no message. |
| **Solution** | The end list runs on past midnight ("12:00 AM (next day)"), the duration counts across midnight, and an API refusal is shown under the time slot. That includes one on a field the form has no place for; nothing is toasted. |
| **Changed** | `src/utils/appointmentTime.ts`, `src/components/Common/Modals/AppointmentModal.jsx`, plus tests (below). |

## 2026-11-02 — Ending after midnight

### Problem
- The end options were `TIME_SLOTS.filter(slot => slot.value > timeStart)`, a same-day "HH:mm" comparison. Nothing comes after 23:30, so the list was empty.
- Picking a start set the end 30 minutes later, but past 24:00 it fell back to the **start** time. `timeAfter()` also capped at 23:59.
- The duration was end minus start on the same date, so it came out as 0 and the API refused it (`duration_minutes: min:1`).
- The 422's `errors.duration_minutes` went into `formErrors`, but the form showed no such field. Because `errors` was present, no toast fired either, so the failure was silent.

The API needs no change. It stores the start plus `duration_minutes` in UTC, and its validation and clash check (`AppointmentTimeRules`, with a one-day look-back) already handle an appointment that crosses midnight.

### Solution
- **`appointmentTime.ts`**:
  - `timeAfter()` wraps past midnight (23:30 → 00:00).
  - New `endSlotsAfter(slots, start)`: every slot after the start, then the next day's slots up to the start, labelled "(next day)".
  - New `minutesBetween(start, end)`: an end at or before the start is on the next day.
  - New `endWithinDay(start, end)`: an end past midnight reads "24:00", for comparing with that day's conflicts.
- **`AppointmentModal.jsx`**:
  - The end list uses `endSlotsAfter`.
  - A new start sets the end to `timeAfter(start)`.
  - `duration_minutes` comes from `minutesBetween`.
  - The two local overlap checks use `endWithinDay`.
  - `formErrors.duration_minutes` is shown under the time slot.
  - A 422 on a field outside `FORM_ERROR_FIELDS` is shown under the time slot too (`timeSlotError`), not toasted.

### Files
- `src/utils/appointmentTime.ts`: `timeAfter` wraps; adds `endSlotsAfter`, `minutesBetween`, `endWithinDay`.
- `src/components/Common/Modals/AppointmentModal.jsx`: end list, duration, overlap checks, error display.
- `tests/utils/appointmentTime.test.ts`: the old "11:30 PM ends at 23:59" expectation is replaced; +4 tests.
- `tests/components/Common/Modals/AppointmentModal.test.tsx`: +3 tests (11:30 PM ends at 12:00 AM the next day and saves 30 minutes; a `duration_minutes` 422 is shown; a 422 on a field the form has no place for shows under the time slot, with no toast).
- `e2e/sidebar/appointments/appointment-modal.spec.ts`: +2 mocked specs (QA's steps: start 11:30 PM, end list, Confirm → `duration_minutes: 30`; a `duration_minutes` 422 shown under the time slot).

### Tests added or updated
- Unit (4) and integration (3) tests were written first, and all failed before the fix.
- The 2 new E2E specs were run against the old code and failed there (end label "End"; message not shown), then passed with the fix.

### Verified
- Vitest: `appointmentTime` + `AppointmentModal`, 30 passed. Full suite: 340 files, 2,421 passed, 2 expected fail, **1 failed**. The failure is unrelated: `tests/pages/applications/fundapplication/components/steps/FundingRequestStep.test.tsx` (multi-select purposes / additional funding types). It also fails with this change stashed, and a different test in that file fails on each run, so it is a pre-existing flaky test.
- `npm run typecheck`: clean.
- E2E `e2e/sidebar/appointments/appointment-modal.spec.ts` (dev server on :5174, `--workers=2`): 18 passed. With the default workers the dev server timed out on `page.goto` even for untouched specs; that was load, not a defect.

### Status
Fixed. QA sheet BUG-024 (round 2) → Fixed in build, pending stage retest.

## Still pending
- The same fix is in `fch-borrower-react` (`borrower-fch`), same date and title.
- `FundingRequestStep.test.tsx` is flaky and fails on `bugfix/round-2` without this change. It needs its own fix.
- `isSlotBlocked()` in the modal is unused and still compares same-day times; it was left as it was.

## 2026-11-02 — The reason goes under the time slot, never in a toast

### Problem
A refusal on a field the form has no place for was toasted. Reviewer's request: no toast for an error message; show the reason under Time Slot.

### Solution
`timeSlotError` is the `duration_minutes` refusal, else the first refusal on a field outside `FORM_ERROR_FIELDS`. It renders under the time slot. The toast in the save handler's 422 branch is removed.

### Files
- `src/components/Common/Modals/AppointmentModal.jsx`: `timeSlotError`; the 422 toast is removed.
- `tests/components/Common/Modals/AppointmentModal.test.tsx`: the toast test now expects the reason right after `.time-slot-container`, and no toast. It failed first.
- `e2e/sidebar/appointments/appointment-modal.spec.ts`: +1 mocked spec (a 422 on `status` shows under the time slot; no toast on the page).

### Verified
- Vitest `AppointmentModal` + `appointmentTime`: 30 passed. `npm run typecheck`: clean.
- E2E `appointment-modal.spec.ts` (`--workers=2`): 19 passed.

### Status
Done.
