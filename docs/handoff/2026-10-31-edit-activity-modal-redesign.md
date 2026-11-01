# Edit Activity / Edit Reminder modal: same design as New Activity

2026-10-31

## Problem
On the Reminders page (`/reminders`), opening a reminder and clicking **Edit Reminder** opened `ActivityEditModal`. That modal still used the old layout: a native `<select>` for Reference and the reminder preset, plain radios for Visibility, a bare switch for Set Reminder, an inline PrimeReact calendar and a plain attachment list. New Activity (`ActivityCreateModal`) had already moved to the card design. The same Edit modal also opens from the activity log sidebar and from the reminder popup.

## Solution
`ActivityEditModal` is rebuilt on the parts New Activity already uses. The submit logic, payload and validation are unchanged.
- Header `acm-header` with an icon; the title is "Edit Reminder" or "Edit Activity" as before.
- Reference uses `ActivitySelect`; Date uses `DateTimeField`; the Summary counter uses `acm-counter`; the Message editor sits in `acm-editor`. The label is now "Summary", matching New Activity (it was "Subject").
- Visibility uses `VisibilityPicker` (cards).
- Want to Assign, then Set Reminder, both as `ToggleCard`s. Set Reminder holds `ReminderFields` and "Who gets the reminder".
- Attachments uses `AttachmentPicker`, which can now list the activity's saved files ("Saved") next to new ones. Adding a file still replaces the saved files.
- To keep element ids unique when both modals are on one page, `VisibilityPicker` and `ReminderFields` take an `idPrefix` (default `activity`). Edit uses `activityEdit`. Visibility radios keep `name="visibility"`, because each modal has its own `<form>`.

## Files changed
- `src/components/Common/Modals/ActivityEditModal.jsx`: markup rebuilt on the shared parts; old Calendar/TimeInputs/select code removed.
- `src/components/Common/Modals/activity-create/VisibilityPicker.tsx`: `idPrefix`.
- `src/components/Common/Modals/activity-create/ReminderFields.tsx`: `idPrefix`.
- `src/components/Common/Modals/activity-create/AttachmentPicker.tsx`: `savedFiles` / `onRemoveSaved`.
- `tests/components/Common/Modals/ActivityEditModal.test.tsx`: Reference picked through the custom select; new tests for the design, the Edit Reminder title, setting a reminder from the card, and removing or replacing saved attachments.
- `e2e/sidebar/clients/activity-task-assign.spec.ts`: Edit opens with the new header, picker and cards.

## Testing
- `npx vitest run`: 224 files, 1680 passed (2 expected fail, unchanged).
- `tsc --noEmit`: clean.
- Playwright `--project=mock` (after `npm run build`): clients activity-task-assign, activity-visibility and task-reminders specs, 39 passed.
- Checked visually at 1280px and 420px with a throwaway screenshot spec, side by side with New Activity.

## Open items
- Edit keeps its own portal-based modal shell (not Bootstrap's JS modal), so it can sit over the reminder popup and the Reminders page view modal.
- The live "reminder lands in the past" warning that New Activity shows under Reminder Time is not on Edit. Edit still checks this when Update is clicked, as before.
