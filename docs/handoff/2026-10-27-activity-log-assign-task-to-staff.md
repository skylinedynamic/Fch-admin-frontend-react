# 2026-10-27 — Activity log: assign a Task to a staff member

**Branch:** feature/activity-task-assign (react-fch and fch-api)
**Author:** Awlad Hossain
**Last updated:** 2026-10-28 (feature complete)

## At a glance

| Problem | Solution | Changed |
|---|---|---|
| The activity log on Partners, Leads, Clients and Intake & Review › Funding Application / Funding Request had no way to hand a Task to a staff member, with its own due day, priority and status. Nobody was told, and the assignment couldn't be changed. | **Reference = Task** shows a **Want to Assign** switch on New Event and Edit. It opens **Assigned To** (the record's partner's staff), **Due Date** (day only), **Priority** and **Status**, with the record's own responsible person shown above. The assignee gets an email, a bell notification and a reminder of their own. New Event and New Email were redesigned, with a primary-colour header. | react-fch: modals, `activity-create/*`, `modules/activity-log`, `config/activityTask.ts`, pages' `ActivitySidebar` props, sticky hook. fch-api: requests, `ActivityLogService`, `TaskAssignmentNotifier`, `TaskAssignedMail`, `ReminderService`, notification config. |

## Problem
- A Task logged in an activity timeline couldn't be given to anyone. It had no due date separate from the activity date, and no priority or status.
- The New Event and New Email modals used plain native selects and radios that didn't match the theme.
- On scroll, the activity card slid under the page's breadcrumb bar. It used a fixed `top` that ignored the 60px page footer, and Funding Application overrode it with `133px`.

## Solution

### Want to Assign (New Event and Edit)
- **When it shows:** only while Reference is **Task**.
  - Leaving Task or turning the switch off sends no task fields on create.
  - On edit, it sends `assign_task=0` (`buildTaskEditFields`), which un-assigns the task.
- **Assigned To:** the staff of the partner that owns the record, loaded from the existing `common/get-all-users` with `partner_id` (`useTaskAssignees`).
  - On the Partner page nothing is sent, so the API returns the host's own staff.
  - It's only fetched while the switch is on.
- **Owner card above Assigned To:** the record's responsible person (`useTaskAssignmentSetup`). Labels come from `config/activityTask.ts`:

  | Page | Label | Source |
  |---|---|---|
  | Partner | Partner Agent | `assigned_user_id` |
  | Client | Client Assigned To | `assign_id` |
  | Lead | Lead Owner | `salesperson_id` |
  | Funding Application / Request | Borrower Assign to | `borrower.assign_id` |

  When nobody is set, it shows "No one has been assigned yet".
- **Due Date:** a day only (`task_due_date`, `Y-m-d`), stored as picked. Today counts. On edit, an already-saved past day may stay; only a newly picked day is checked.
- **Priority and Status:** values, labels and colours come from `config/activityTask.ts`, with no inline strings. The defaults are Medium and Open.
- **Where the record context comes from:** pages pass `partnerId` and `taskOwner` to `ActivitySidebar`. The sidebar hands them to New Event through `window._activityEntityContext`, and to `ActivityEditModal` as props.

### What the API does (fch-api)
- **Validation:** `Concerns/ValidatesTaskAssignment` is shared by the Store and Update requests.
  - The four fields are required once `assign_task=1`.
  - Only a Task can be assigned.
  - The assignee must be in `User::teamOf(<record's partner>)`. For the host that is the record's partner, or the host itself on a Partner page. For anyone else it is their own team.
- **Stored** as `properties.task = {assigned_to, due_date, priority, status}`, and returned as `task` with `assigned_user` and the labels.
- **Assignee notified** by `TaskAssignmentNotifier`, after the save commits:
  - When it fires: on create, and on edit only when the task goes to someone new.
  - What they get: an email (`TaskAssignedMail`) and a bell notification. The notification type is `activity_log.task_assigned.{partner|client|lead|funding_application|funding_request}`, in category `reminder`; it is split by record because the link differs.
  - It fires whether or not a reminder is set.
  - Nobody is told about a task assigned to themselves.
  - A failure is logged and never fails the save.
- **The assignee's own reminder** is a separate `reminders` row (`properties.task_reminder_id`), so each person snoozes or dismisses their own.
  - When it fires: at the activity's reminder time if one is set. Otherwise 09:00 on the due day, in the assigner's timezone (`ActivityLog::TASK_DUE_REMINDER_TIME`).
  - It is rescheduled only when that time changes. A wording edit keeps a snoozed or dismissed state.
  - It moves to a new assignee, and is removed on un-assign, when the activity is no longer a Task, or when the activity is deleted.

### Modal redesign (no feature changes)
- **Shared field components** in `src/components/Common/Modals/activity-create/`:
  - `ActivitySelect`: a custom dropdown with search, keyboard support, and Escape that closes only the list.
  - `DateTimeField`, `VisibilityPicker`, `ToggleCard`, `ReminderFields`, `TaskAssignmentFields`, `TaskOwnerCard`, `AttachmentPicker`.
- **Shared styles:** `activityCreateModal.css`, scoped under `.acm`. Fields have a 4px radius, option blocks have no border, and the header uses the primary colour.
- **New Email** uses the same look, with recipient cards and the shared attachment picker. Its behaviour is unchanged.
- **Edit modal:** only the Want to Assign block was added, inside a `.acm` wrapper, using `idPrefix="activityEdit"` so its ids never clash with New Event's.

### Activity card position
`useStickyBelowSubheader` measures `.page-subheader-sticky` and sets the card's `top` to where that bar ends. The card's height also accounts for the page footer.

## Files changed

### react-fch
- `src/config/activityTask.ts` (new): priorities, statuses, tones and icons, owner labels, unassigned text
- `src/config/reminders.ts`, `src/config/appConfig.ts`: reference tones, reminder time units
- `src/modules/activity-log/constants.ts`:
  - task fields in both error-field lists
  - `buildTaskAssignmentFields`, `buildTaskEditFields`, `taskAssignmentFromActivity`
- `src/modules/activity-log/types.ts`: `ActivityTask`
- `src/modules/activity-log/queries.ts` (new): `useTaskAssignees`
- `src/components/Common/Modals/ActivityCreateModal.jsx`:
  - redesigned markup
  - Want to Assign
  - `modalRef` instead of `getElementById`, so the right copy reads its context
- `src/components/Common/Modals/ActivityEditModal.jsx` and `.d.ts`: Want to Assign; new props `entityType`, `partnerId`, `taskOwner`
- `src/components/Common/Modals/EmailComposeModal.jsx`: redesigned markup only
- `src/components/Common/Modals/activity-create/*` (new): the shared field components, `useTaskAssignmentSetup.ts` and the CSS
- `src/components/Common/Activity/ActivitySidebar.jsx`: `taskOwner` prop, passed to both modals; sticky `top` from the hook
- `src/hooks/useStickyBelowSubheader.ts` (new)
- Pages: `ClientDetails.tsx`, `LeadDetails.jsx`, `PartnerProfile.jsx`, `FundingApplicationDetails.tsx` (fixed offset removed), `FundingRequestDetail.tsx`. Each passes `partnerId` and `taskOwner`.

### fch-api
See `fch-api/docs/handoff/2026-10-27-activity-log-assign-task-to-staff.md`.

## Testing

### Vitest
All 223 files pass (1658 tests, plus 2 expected-fail). `npm run typecheck` is clean.
- `tests/components/Common/Modals/ActivityCreateModal.test.tsx` (14): visibility, plus 10 for Want to Assign:
  - shown only for a Task
  - defaults, and position below the reminder
  - partner staff request; Partner page sends none
  - owner card, its empty state, and "Borrower Assign to"
  - request body; nothing sent once the Reference leaves Task
  - API errors under the fields
- `tests/components/Common/Modals/ActivityEditModal.test.tsx` (9, new):
  - opens with the saved values; staff list and owner card
  - change the assignee; un-assign with the switch or by leaving Task
  - assign from Edit
  - no switch on a non-Task activity
  - Partner page lists the host's staff
  - API errors under the fields
- `tests/components/Common/Modals/EmailComposeModal.test.tsx` (4, new): the shared look, recipient cards, sending unchanged
- `tests/components/Common/Modals/activity-create/`:
  - `ActivitySelect.test.tsx` (9)
  - `TaskAssignmentParts.test.tsx` (13): ToggleCard, owner card, fields and `idPrefix`, options, date helpers, VisibilityPicker
  - `AttachmentPicker.test.tsx` (4)
- `tests/modules/activity-log/constants.test.ts` (23, +6 for the edit helpers)
- `tests/modules/activity-log/queries.test.tsx` (10, new): `useTaskAssignees`, `useTaskAssignmentSetup`
- `tests/hooks/useStickyBelowSubheader.test.tsx` (4, new)
- `tests/components/Common/Activity/ActivitySidebar.taskAssign.test.tsx` (2, new)
- Page wiring (`partnerId`/`taskOwner`):
  - `FundingApplicationDetails.test.tsx` (+3)
  - `FundingRequestDetail.test.tsx` (+2)
  - `LeadDetails.leadOwner.test.tsx` (+2)

### Playwright (mocked)
18 specs pass, run with `--workers=2`:
- `e2e/sidebar/clients/activity-task-assign.spec.ts` (9):
  - New Event: the full flow and its 422 errors
  - Edit: open with the saved values, reassign, un-assign, 422
- One file each for `partners` (3), `leads` (2), `intake-review/funding-application` (2) and `intake-review/funding-request` (2, new): the switch is offered only for a Task, the staff request, and the owner card
- Helpers in `e2e/support/activityTaskAssign.ts` are rewritten for the custom dropdowns
- `e2e/sidebar/clients/activity-visibility.spec.ts` (4) is updated for the redesign. It scopes to the open modal (E2E-014) and finds each level's radio by value, since the Partner card's label also contains "Internal".
- Every mocked spec under clients, leads, partners and intake-review › funding-application / funding-request: 226 of 228 pass. The 2 failures also fail on the branch's base commit, and are logged as E2E-015 and E2E-016.

## Open items
- **E2E-014:** Partner, Lead and Client pages still mount the New Activity modal twice. The specs scope to `#activityCreateModal.show`.
- **E2E concurrency:** with the default `50%` workers on a busy machine, clicks on the activity buttons time out. With 2 workers (as in CI) everything passes.
- **Escape in a date field** closes the whole Bootstrap modal. This was already the case before this work. The custom dropdowns don't, but the PrimeReact calendar does.
- **`EmailComposeModal`** still finds itself with `document.getElementById`, the same pattern that `modalRef` fixed in New Event.
- **`bugfix/all-bugfix`** also changes `ActivityCreateModal.jsx` (BUG-057 default date, `mergePickedDateTime`) and will conflict with this redesign when merged.
- **Not built:** the timeline card doesn't show the task strip, and there is no "my tasks" list.
