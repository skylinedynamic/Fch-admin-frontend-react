# Task due date with a time, Set Reminder below Want to Assign

2026-10-31

## Problem
In the activity log's New Activity modal (Partner profile and every other record page that uses it) for a **Task**:
- **Set Reminder** came before **Want to Assign**. It should come after it.
- **Due Date** only picked a day. It needs a date and a time.

The Edit activity modal had the same order and the same day-only due date.

## Solution
- `ActivityCreateModal` / `ActivityEditModal`: the Want to Assign block now comes before Set Reminder.
- `TaskAssignmentFields`: Due Date uses the standard date + time picker (`DateTimeField` with its default `withTime`). The placeholder is now "Select due date & time". The field sends `task_due_date` as `YYYY-MM-DD HH:mm:ss` in the viewer's timezone, the same as `activity_date`.
- API side (`fch-api`, same date): the API now requires `Y-m-d H:i:s`, rejects a due time that has already passed, stores the value in UTC and returns it in the viewer's timezone. See `fch-api/docs/handoff/2026-10-31-task-due-date-time.md`.

## Files changed
- `src/components/Common/Modals/ActivityCreateModal.jsx`: Want to Assign card moved above Set Reminder.
- `src/components/Common/Modals/ActivityEditModal.jsx`: Want to Assign block moved above the Reminder section (gets `mt-3`).
- `src/components/Common/Modals/activity-create/TaskAssignmentFields.tsx`: Due Date picks a time too, with a new placeholder.
- `tests/components/Common/Modals/ActivityCreateModal.test.tsx`: order (Set Reminder after Want to Assign), placeholder, due date sent with a time.
- `tests/components/Common/Modals/ActivityEditModal.test.tsx`: saved due date-time shown and re-sent, order, a newly typed date-time is sent.
- `tests/components/Common/Modals/activity-create/TaskAssignmentParts.test.tsx`, `tests/components/Common/Activity/ActivitySidebar.taskAssign.test.tsx`, `tests/modules/activity-log/constants.test.ts`: fixtures now use date-time values.
- `e2e/sidebar/clients/activity-task-assign.spec.ts`: Set Reminder now sits below the section, and the due date is filled and asserted with a time.

## Testing
- `npx vitest run`: 223 files, 1662 passed (2 expected fail, unchanged).
- `npm run typecheck`: clean.
- Playwright `--project=mock` (after `npm run build`), the activity-task-assign specs for clients, partners, leads and intake-review: 76 passed.

## Open items
- Tasks saved on `stage` before this change hold only a day. The API returns those as that day's `00:00:00`, so the picker shows 12:00 AM and the task can be saved unchanged.
- Typing a new date into a picker that already holds a time keeps the old time. `DateTimeField` merges the existing time into a picked day. This is the same as Activity Date and was left unchanged.
