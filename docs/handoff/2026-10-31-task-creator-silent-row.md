# Task creator always sees an assigned task in Task & Reminders

2026-10-31

## Problem
When a Task was assigned with "Who gets the reminder" set to **Assignee**, or with no reminder, the creator had no row in Task & Reminders. They couldn't see the task there or change its status.

## Solution
The API now keeps a **silent** row for the creator (`is_reminder: false`). It is listed in Task & Reminders but never pops up; see `fch-api/docs/handoff/2026-10-31-task-creator-silent-row.md`. On the admin side:
- `src/config/reminders.ts`: `isSilentReminder()` and `REMINDER_SILENT_LABEL` ("No Popup"). The effective status label and badge show **No Popup** (grey) for a pending silent row, never "Missed", because nobody is being alerted.
- The list's Status column and Task & Reminder Details use those helpers. The Task Status dropdown works on the row as usual.
- Task & Reminder Details shows a short note on a silent row: "You won't get a popup for this task — only the assignee is reminded. It is listed here so you can follow it."

## Files changed
- `src/config/reminders.ts`: `is_reminder` on reminders, `isSilentReminder()`, label and badge handling.
- `src/components/Common/Modals/ReminderViewModal.tsx`: the note.
- Tests: `tests/config/reminders.silent.test.ts` (new), `tests/pages/reminders/Reminders.taskStatus.test.tsx` (silent row case), `e2e/sidebar/task-reminders/reminders.spec.ts` (silent row listed with No Popup and the note).

## Testing
- `npx vitest run`: 227 files, 1692 passed (2 expected fail, unchanged).
- `tsc --noEmit`: clean.
- Playwright `--project=mock` (after `npm run build`), `e2e/sidebar/task-reminders`: 28 passed.

## Open items
- Snoozing or rescheduling a silent row from Task & Reminder Details makes it a real reminder that pops up. That is intended: asking to be reminded later means being reminded.
