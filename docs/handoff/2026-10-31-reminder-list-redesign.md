# Task & Reminders list redesign, status confirmation, 4px radius

2026-10-31

## Problem
- The Task & Reminder Events list (`/reminders`) looked dated: an Actions dropdown, a crowded filter row, a plain table and a bare "No reminders found".
- It loaded its rows with a service call inside the page, not a module query hook.
- A task's status changed with a single click, with nothing to confirm.
- The Task box needed a 4px radius.
- Later feedback:
  - Don't show task status in the list table.
  - Clicking a row must not tick its checkbox; only the checkbox selects.
  - The table header slid under the filters (overlapping); ticking a row should not show "1 selected"; add an Actions button beside Dismiss all; give the status confirmation the flip animation.
  - The Actions button must look like the Partners list's. Filters/Clear must use the same colours as the other lists. Task & Reminder Details needed a redesign.

## Solution
- **List redesign** (`src/pages/reminders/`, split into `components/`):
  - **Status tabs**: All / Pending / Sent / Missed / Dismissed (`ReminderStatusTabs`). They replace the status dropdown.
  - **Toolbar**: search, reference type, date range, Filters and Clear (`ReminderToolbar`).
  - **Header buttons**: Dismiss all, and beside it an **Actions** split button styled like the Partners list (`bg-success`, a "Toggle Dropdown" caret; `ReminderActionsMenu`, reactstrap Dropdown) with **Dismiss Selected**. Like on Partners, it appears only while rows are ticked. There's no "n selected" bar. Both dismiss actions are confirmed in a modal as before.
  - **Filters / Clear** use `btn-warning` / `btn-default`, like the other list pages.
  - **Overlap fix**: the theme's `.table-card` has `margin: -1rem`, which pulled the table 1rem up under the filters. `.reminder-list__body > .table-card` resets the top margin.
  - **Rows** (`ReminderCells`):
    - a coloured type tile;
    - the summary, with who has the task;
    - client initials and a link to their file;
    - When: the API's date plus a relative time ("in 2 days", red once missed);
    - a status badge with a dot;
    - a chevron.
  - **Task status is not in the table**. It is changed in Task & Reminder Details and the popup.
  - **Empty state** with a hint and Clear filters (`ReminderEmptyState`).
  - 4px corners throughout (`reminderList.css`). It's responsive: tabs scroll and the toolbar stacks on phones.
  - **Selection**: by checkbox only (`selectionMode="checkbox"`). A row click opens Task & Reminder Details.
- **Module standard**: the rows come from `useReminderList(filters)` (previous page kept while the next loads) and Dismiss all's state from `useHasDismissableReminders()`, in `modules/reminders/queries.ts`. Dismiss, dismiss-all, bulk-dismiss and snooze refresh the list queries. `REMINDER_STATUS_DISMISSABLE` was added to `config/reminders.ts`.
- **Status confirmation**: `TaskStatusConfirmModal` asks "Change task status?", naming the task and showing old → new status, with a note that the other person will be notified.
  - It's its own portal with no Bootstrap JS, so it stacks safely over the reminder popup and the details modal.
  - It keeps its clicks to itself, closes on Escape, and is blocked while saving.
  - It opens with the theme's flip (rotateY -70deg → 0, 0.3s), like the Bootstrap `.modal.flip` confirmations.
- **4px radius** on the Task box, its buttons and badges (`reminderTaskStatus.css`).
- **Task & Reminder Details redesign** (`ReminderViewModal.tsx`, new `reminderViewModal.css`):
  - Header: the type's coloured tile, the title, and the type plus the effective status pill (Missed in red).
  - Subject, then one **Schedule** card (Activity | Reminder, each "date · time", stacked on phones), replacing the six icon tiles.
  - Then the client card, the description, the Task box, attachments, snooze history, and the actions.
  - Behaviour is unchanged.
  - **Task box** (shared with the popup): a header bar, a 4-column meta list (Assigned To / By, Due, Priority; 2 columns on phones), and Progress as one segmented control.
  - **Code standard**: Edit now loads the activity through `useFetchActivityLog()` (new, `modules/activity-log/queries.ts`, key `activityLogKeys.detail`), not `getActivityLog` from the component.
- `formatRelativeToNow()` was added to `utils/reminders.ts` (`Intl.RelativeTimeFormat`, rounded to the largest unit).

## Files changed
- `src/pages/reminders/ReminderList.tsx`: rebuilt on the components and query hooks.
- `src/pages/reminders/components/ReminderStatusTabs.tsx`, `ReminderToolbar.tsx`, `ReminderActionsMenu.tsx`, `ReminderEmptyState.tsx`, `ReminderCells.tsx`: new.
- `src/pages/reminders/reminderList.css`: new.
- `src/components/Common/TaskStatusConfirmModal.tsx`, `src/components/Common/reminderTaskStatus.css`: new.
- `src/components/Common/Modals/ReminderViewModal.tsx`, `reminderViewModal.css`: redesign; `src/modules/activity-log/queries.ts`: `useFetchActivityLog`, `activityLogKeys.detail`.
- `src/components/Common/ReminderTaskStatus.tsx`: confirmation, `summary` prop, 4px radius; the list cell (`TaskStatusCell`) removed.
- `src/components/Common/ReminderModal.tsx`, `Modals/ReminderViewModal.tsx`: pass the summary to the confirmation.
- `src/modules/reminders/queries.ts`: list and dismissable queries, list refresh after mutations.
- `src/config/reminders.ts`: `REMINDER_STATUS_DISMISSABLE`.
- `src/utils/reminders.ts`: `formatRelativeToNow()`.
- Tests:
  - New: `tests/components/Common/TaskStatusConfirmModal.test.tsx` (incl. the flip class), `tests/utils/reminders.test.ts`, `tests/pages/reminders/Reminders.redesign.test.tsx` (tabs, rows, Actions menu disabled → Dismiss selected with no "n selected", a row click not selecting, dismiss all, empty state).
  - New: `tests/components/Common/Modals/ReminderViewModal.test.tsx` (header status, Schedule card, Edit through the module).
  - Updated: `ReminderTaskStatus.test.tsx`, `Reminders.taskStatus.test.tsx`, `ReminderModal.realtime.test.tsx`.
  - E2E: `e2e/sidebar/task-reminders/reminders.spec.ts` and `reminder-popup.spec.ts` (Actions menu, confirmation, no Task column, checkbox-only selection).

## Testing
- `npx vitest run`: 231 files, 1715 passed (2 expected fail, unchanged).
- `tsc --noEmit`: clean.
- Playwright `--project=mock` (after `npm run build`): `e2e/sidebar/task-reminders` 32 passed; `e2e/sidebar/clients` passed. `clients-list.spec.ts` timed out once in a combined run and passed 30/30 on its own.
- Checked visually at 1440px and 420px with throwaway screenshot specs.
- After the Partners-style Actions, the filter colours and the details redesign: full `npx vitest run` 232 files, 1720 passed (2 expected fail); typecheck clean; `e2e/sidebar/task-reminders` 32 passed; screenshots of the modal at 1440px and 420px.
- After the Actions/overlap/flip round: `tests/components/Common` + `tests/pages/reminders` 140 passed, typecheck clean, `e2e/sidebar/task-reminders` 32 passed; a 1440px screenshot shows the header flush below the filters.

## Open items
- The status tabs show no counts; the API has no per-status count endpoint.
- On phones, the page header's large gaps come from the shared `page-content-fit` layout, not this page.
