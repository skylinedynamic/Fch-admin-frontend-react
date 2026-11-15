# R3-BUG-026 (partner side): the portal ends a free trial after its end date on the local calendar

Date: 2026-11-15

## Problem

`ProtectedRoute` signed a free-trial partner out once `now > <end date>T23:59:59Z`, the end of the end date in **UTC**. The menu lock (`subscriptionUtils`), the Partners list and the API treat the end date as a trial day on the user's own calendar.

The UTC boundary ended the trial hours early or late by timezone. In UTC+6 a partner whose trial ended on the 11th stayed in until 06:00 on the 12th. In UTC−5 they were signed out at 19:00 on their last day.

## Solution

`isTrialEndDateExpired()` compares calendar days: `startOfToday() > parseDateOnly(endDate)`. This is the same helper and rule as `subscriptionUtils`.

The API side (fch-api, same date) applies the same boundary at sign-in and answers 401 on every request once the trial has expired. `apiClient` already signs out on 401.

## Files changed

- `src/lib/auth/ProtectedRoute.tsx`: compares the local calendar day.
- `tests/lib/auth/ProtectedRoute.test.tsx`: +2 tests:
  - still in at 23:30 on the end date
  - signed out at 00:30 the next day

## Testing

- **Seen failing first:** "signed out at 00:30 the next day". On this machine (UTC+6) the old code kept the partner in.
- **`tests/lib/auth`:** 70 passed. **`npm run typecheck`:** clean.
- **Full Vitest suite:** 435 files, 3,239 passed (2 expected fail).

## Open items

- **None for the portal.** The session end on the API side is in the fch-api handoff.
