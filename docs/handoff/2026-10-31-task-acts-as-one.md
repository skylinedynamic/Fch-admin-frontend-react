# Assigned Task: creator and assignee act as one (admin side)

2026-10-31

## Problem
When a task's creator rescheduled their reminder, the assignee's side didn't move. The assignee could also reschedule, which only the creator should be able to do. The reminder screens called `apiClient` directly and compared against hard-coded status strings, against the module standard.

## Solution
- **The assignee sees no Reschedule** on an assigned Task's reminder. The API sends `can_reschedule: false` for them. This applies to the popup's single view, the popup's list of several and Task & Reminder Details. Snooze and Dismiss stay, filling the row as two half-width buttons.
- The creator's Reschedule moves the task for both people. That is done by the API; see `fch-api/docs/handoff/2026-10-31-task-acts-as-one.md`. A reschedule also refreshes activity-log queries.
- **Module standard**: new `src/modules/reminders/queries.ts` with `reminderKeys`, `useDueReminders`, `useDismissReminder`, `useDismissAllReminders`, `useBulkDismissReminders` and `useSnoozeReminder`, plus the matching `services.ts` functions and a `SnoozeReminderPayload` type.
  - `ReminderModal`, `ReminderViewModal` and `ReminderList` now use these hooks and no longer import `apiClient`.
  - The popup's one request on load is `useDueReminders(token)`: never refetched or polled, with later changes still arriving over Reverb.
- **No hard-coded statuses**: `'pending'`, `'sent'` and `'cancelled'` in those files are now `REMINDER_STATUS_*` from `src/config/reminders.ts`.
- **CLAUDE.md** (here and in `client-fch`): an explicit "always follow these standards" rule. Every API call goes through module `services.ts` → `queries.ts` → `types.ts` → `index.ts`, any component touched has its `apiClient` calls moved, and constants are used instead of literals.

## Files changed
- `src/modules/reminders/services.ts`, `types.ts`, `queries.ts` (new), `index.ts`.
- `src/config/reminders.ts`: `can_reschedule` on `Reminder`.
- `src/components/Common/ReminderModal.tsx`, `src/components/Common/Modals/ReminderViewModal.tsx`, `src/pages/reminders/ReminderList.tsx`: module hooks, status constants, Reschedule hidden when not allowed.
- `CLAUDE.md`: coding standards.
- Tests: `tests/modules/reminders/actions.test.ts` (new), `tests/components/Common/ReminderModal.realtime.test.tsx` (no Reschedule for the assignee, single and list views), `tests/pages/reminders/Reminders.taskStatus.test.tsx` (no Reschedule in Details), `e2e/sidebar/task-reminders/reminder-popup.spec.ts` (the assignee's popup).

## Testing
- `npx vitest run`: 228 files, 1698 passed (2 expected fail, unchanged).
- `tsc --noEmit`: clean.
- Playwright `--project=mock` (after `npm run build`): task-reminders and clients activity-task-assign, 41 passed.

## Open items
- `ReminderList` still loads its rows with the `fetchReminders` service inside the page rather than a `useQuery` hook. The paging/filter state would need reworking; it's a follow-up.
- The reminder modals load the activity for Edit with `getActivityLog` (the service) on click, not through a query hook.
