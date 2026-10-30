# Activity log: a Task takes any date, and validation is not toasted

2026-10-28

## Problem
- **New Event with Reference = Task:** the date had to be in the future. The form showed "Task and Meeting dates must be in the future." and Create stayed disabled.
  - On `bugfix/all-bugfix` the date defaults to now (BUG-057), so picking Task blocked Create straight away.
  - Only the portal enforced this. The API has no such rule.
- **A 422 from the activity API:** the New Event and Edit modals showed the errors under the fields and also raised a toast. The toast either repeated an inline message or said "Please fix the highlighted fields."

## Solution
- **Task dates:** `FUTURE_ACTIVITY_REFERENCES` (`src/config/appConfig.ts`) is now `['Meeting']`. A Task can be dated any day. The future-only check for a Meeting is unchanged.
- **Validation errors:** these are no longer toasted. Each server message shows under its own field.
  - A message with no field of its own goes into `errors.form` and shows as an alert above the form.
  - The new `withFormLevelError()` (`src/modules/activity-log/constants.ts`) handles this, so no error is lost without a toast.
  - `getActivityValidationToast()` now returns `null` when every error is already inline. This is the same change `bugfix/all-bugfix` made, so the two branches merge cleanly here.
- **Unchanged:**
  - Non-validation failures (500, a `status: false` reply without `errors`) still toast.
  - The Task **due date** keeps its server rule that it can't be in the past.

## Files changed
- `src/config/appConfig.ts`: `FUTURE_ACTIVITY_REFERENCES` drops Task.
- `src/modules/activity-log/constants.ts`: `getActivityValidationToast` returns null when nothing is unshown; new `withFormLevelError`.
- `src/components/Common/Modals/ActivityCreateModal.jsx`: no validation toast; an `errors.form` alert.
- `src/components/Common/Modals/ActivityEditModal.jsx`: the same.
- `tests/modules/activity-log/constants.test.ts`: the visibility case expects null.
- `tests/components/Common/Modals/ActivityCreateModal.test.tsx`: +2 tests (a past-dated Task is sent; a field-less error shows above the form). The 422 test also asserts no toast.
- `tests/components/Common/Modals/ActivityEditModal.test.tsx`: +1 test (field-less error). The 422 test asserts no toast.
- `e2e/sidebar/clients/activity-task-assign.spec.ts`: +1 test (a Task dated 2020 is created). The 422 test asserts no toast.

## Testing
- All 6 new or changed expectations were red before the change.
- Vitest: `tests/components/Common/Modals`, `tests/modules/activity-log`, `tests/components/Common/Activity` and `tests/config` give 117/117. `npm run typecheck` is clean.
- Playwright: the activity specs for clients, leads, partners and intake-review give 23/23 (`--workers=2`).

## Open items
- **This is on `feature/activity-task-assign`.** `bugfix/all-bugfix` already has the merged redesign, with `typeFutureActivityDate` in the Task tests. When this branch is merged again, that helper is no longer needed, but it still passes.
- **The future-only check for Meeting is still client-side only.** If it should hold, it belongs in `StoreActivityLogRequest`/`UpdateActivityLogRequest` in fch-api.
- **Typing a date-time into the field keeps the earlier time on this branch.** `bugfix/all-bugfix` fixes this with `mergePickedDateTime`, so the new unit test only checks the day.
