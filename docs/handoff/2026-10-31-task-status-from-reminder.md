# Task status changed from the reminder popup, details and list

2026-10-31

## Problem
When a Task's reminder showed, neither the assignee nor the creator could change the task's progress. Only the creator could, through Edit, which opens the whole activity. On the Task & Reminders page, entries assigned by someone else had no Edit button at all.

## Solution
The task's creator and assignee can now set **Open / In Progress / Complete** in three places:
- **Reminder popup** (`ReminderModal`, single view): a "Task" box under the activity details shows Assigned To, Assigned By, Due and Priority, with three progress buttons.
- **Task & Reminder Details** (`ReminderViewModal`): the same box. A change there also updates the list row.
- **Task & Reminders list** (`ReminderList`): a new **Task Status** column, with a dropdown for the creator or assignee, a badge for anyone else, and "—" for reminders that aren't tasks. Changing it does not open the row's details.

Anyone else sees the status as a badge only. Whether someone may change it comes from the API (`task_can_update_status`). The API endpoint is `PATCH common/activity-logs/{id}/task-status`; see `fch-api/docs/handoff/2026-10-31-task-status-from-reminder.md`. Open popups follow changes made elsewhere through the existing `.reminder.updated` push.

## Files changed
- `src/components/Common/ReminderTaskStatus.tsx`: new. The default export is the box for the modals; `TaskStatusCell` is the list cell. Both share the save hook, success/error toasts, and follow a status changed elsewhere.
- `src/modules/activity-log/services.ts`: `updateActivityTaskStatus()`.
- `src/modules/activity-log/queries.ts`: `useUpdateTaskStatus()` mutation.
- `src/config/reminders.ts`: `ReminderTask`, plus `task` and `task_can_update_status` on `Reminder`.
- `src/components/Common/ReminderModal.tsx`, `src/components/Common/Modals/ReminderViewModal.tsx`: show the box (`onTaskStatusChanged` on the view modal).
- `src/pages/reminders/ReminderList.tsx`: Task Status column and `applyTaskStatus()` to update the row and the open details.
- Tests: `tests/components/Common/ReminderTaskStatus.test.tsx` (new), `tests/pages/reminders/Reminders.taskStatus.test.tsx` (new), `tests/components/Common/ReminderModal.realtime.test.tsx` (popup change plus pushed change), `e2e/sidebar/task-reminders/reminder-popup.spec.ts` and `reminders.spec.ts` (popup, list and details flows).

## Testing
- `npx vitest run`: 226 files, 1689 passed (2 expected fail, unchanged).
- `tsc --noEmit`: clean.
- Playwright `--project=mock` (after `npm run build`), `e2e/sidebar/task-reminders`: 27 passed, 4 of them new.
- Checked visually with a throwaway screenshot spec (popup box and list column).

## Open items
- The multi-reminder list in the popup shows no status. Pick a reminder to see and change it.
- The selected progress button uses the theme's tone colours, so the warning tone follows the brand palette.
