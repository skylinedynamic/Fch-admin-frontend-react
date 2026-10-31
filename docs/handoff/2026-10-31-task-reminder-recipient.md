# Task reminder: who gets it

2026-10-31

## Problem
A Task that was assigned to someone else and set a reminder always reminded both the creator and the assignee. Nobody could choose who should get it.

## Solution
- New "Who gets the reminder" choice: **Me**, **Assignee**, **Both** (the default). Each is a selectable card that reuses the Visibility card styles (`acm-visibility__*`), with an icon and a one-line note ("Only you" / "Assigned staff only" / "You and the assignee"). The cards sit under Reminder Time, above a dashed divider (`.acm-recipient`). They stack in one column below 768px. They appear inside Set Reminder on the New Activity and Edit modals, only when the Reference is Task, Want to Assign is on and Set Reminder is on. When there is no assignee, the only possible recipient is the creator, so no choice is shown.
- The choice is sent as `reminder_recipient` (`creator` / `assignee` / `both`). Nothing is sent when the radios are not shown.
- Values and labels live in `src/config/activityTask.ts` (`REMINDER_RECIPIENT*`). They mirror `ActivityLog::REMINDER_RECIPIENT_*` in fch-api.
- Edit opens with the saved choice. For an activity that was not assigned before, it opens with the default.
- API side: `fch-api/docs/handoff/2026-10-31-task-reminder-recipient.md`.

## Files changed
- `src/config/activityTask.ts`: recipient values, options, default.
- `src/components/Common/Modals/activity-create/ReminderRecipientPicker.tsx`: new card radio group.
- `src/components/Common/Modals/activity-create/options.ts`: icon and note for each choice (`REMINDER_RECIPIENT_SELECT_OPTIONS`).
- `src/components/Common/Modals/activity-create/activityCreateModal.css`: `.acm-recipient` divider; stacked on small screens.
- `src/modules/activity-log/constants.ts`: `asksReminderRecipient()`, `buildReminderRecipientField()`; `reminder_recipient` added to both error-field lists.
- `src/modules/activity-log/types.ts`: `reminder_recipient` on the activity; `due_date` doc comment updated.
- `src/components/Common/Modals/ActivityCreateModal.jsx`, `ActivityEditModal.jsx`: show the picker and send the field.
- Tests: `tests/components/Common/Modals/activity-create/ReminderRecipientPicker.test.tsx` (new), `ActivityCreateModal.test.tsx`, `ActivityEditModal.test.tsx`, `tests/modules/activity-log/constants.test.ts`, and `e2e/sidebar/clients/activity-task-assign.spec.ts` (new create-flow test).

## Testing
- `npx vitest run`: 224 files, 1675 passed (2 expected fail, unchanged).
- Checked visually at 1280px and 420px with a throwaway Playwright screenshot against the mock API.
- `npm run typecheck`: clean.
- Playwright `--project=mock` (after `npm run build`), the clients/partners/leads task specs: 78 passed.

## Open items
- None known. When the reminder is off, the assignee is still reminded on the due day whatever was picked. The picker only affects the reminder the activity itself sets.
