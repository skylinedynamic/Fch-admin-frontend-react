# 2026-10-27 — Activity log: assign a Task to a staff member

**Branch:** feature/activity-task-assign
**Author:** Awlad Hossain

## At a glance

| Problem | Solution | Changed |
|---|---|---|
| The New Activity modal (Partners, Leads, Clients, and Intake & Review › Funding Application › Activity log › New Event) had no way to hand a Task to someone on the team, with its own deadline, priority and progress. | When **Reference = Task**, a **Want to Assign** switch appears below Set Reminder. Turning it on opens a section with **Assigned To**, **Due Date / Time**, **Priority** and **Status**, which are sent with the activity. | `ActivityCreateModal.jsx`, `modules/activity-log/{constants,types}.ts`, `modules/client/queries.ts` (+ fch-api, same date) |

## 2026-10-27 — Want to Assign on a Task

### Problem
A Task logged in an activity timeline couldn't be given to a staff member. There was also no due date separate from the activity date, and no priority or status.

### Solution
- **Switch.** "Want to Assign" shows only while Reference is **Task**. If Reference changes to something else, the switch and section hide and no task fields are sent (`buildTaskAssignmentFields`).
- **Section** (bordered box below the reminder row):
  - **Assigned To**: the caller's own team, from `common/get-all-users` via `useAllUsers({ enabled })`. It's only fetched once the switch is on, so other screens that mount the modal make no extra request.
  - **Due Date / Time**: a separate date picker. It can't be in the past and is sent as wall-clock time in the viewer's timezone (`task_due_at`).
  - **Priority**: Low / **Medium** (default) / High.
  - **Status**: **Open** (default) / In Progress / Complete.
- **Request fields:** `assign_task=1`, `assigned_to`, `task_due_at`, `task_priority` (`low|medium|high`), `task_status` (`open|in_progress|complete`).
- **Validation:** all rules are in the API (required once assigning, eligible assignee, due date in the future, Task only). Its messages show under each field (fields added to `ACTIVITY_CREATE_ERROR_FIELDS`).
- **Response:** a `task` object (`assigned_user`, `due_at`, `priority(_label)`, `status(_label)`), typed as `ActivityTask`. The timeline doesn't display it yet (see pending).

### Files
- `src/components/Common/Modals/ActivityCreateModal.jsx`: switch and section; one `getEmptyForm()` in place of three copies of the empty form; task fields added to the request
- `src/modules/activity-log/constants.ts`: `ACTIVITY_TASK_REFERENCE`, `TASK_PRIORITY_OPTIONS`, `TASK_STATUS_OPTIONS`, `DEFAULT_TASK_ASSIGNMENT`, `buildTaskAssignmentFields()`; task fields in `ACTIVITY_CREATE_ERROR_FIELDS`
- `src/modules/activity-log/types.ts`: `ActivityTask`, `ActivityLog.task`
- `src/modules/client/queries.ts`: `useAllUsers({ enabled })` (optional, defaults to on)
- `e2e/support/activityTaskAssign.ts`: shared helpers for the New Event modal
- `docs/e2e/ISSUES.md`: E2E-014 (modal mounted twice)

### Tests added or updated
- Unit: `tests/modules/activity-log/constants.test.ts` (+7) for the options, defaults, the payload builder (sent only for an assigned Task) and the inline error fields. `tests/modules/client/queries.test.tsx` (+1): `useAllUsers` stays idle while disabled.
- Integration: `tests/components/Common/Modals/ActivityCreateModal.test.tsx` (+5):
  - switch only for a Task
  - section below the reminder, listing staff, priorities and statuses
  - the request carries the assignee, typed due date, priority and status
  - nothing is sent once Reference leaves Task
  - API errors show under the fields
- E2E (mocked):
  - `e2e/sidebar/clients/activity-task-assign.spec.ts` (4): full flow, including position, request body and 422 messages
  - `e2e/sidebar/{partners,leads}/activity-task-assign.spec.ts` and `e2e/sidebar/intake-review/funding-application/activity-task-assign.spec.ts` (1 each): the switch is offered only for a Task on that page

### Verified
- All new tests failed before the change.
- `npm run typecheck` is clean.
- The new Vitest files pass: 54 unit, 9 modal.
- The 7 new E2E specs pass against the preview build.
- The existing `activity-visibility.spec.ts` still passes (4/4).
- Screenshot check: the fields are 37.5px tall with 4px corners and match the rest of the modal.

### Issues met
- Partner, Lead and Client pages render two New Activity modals with the same id (E2E-014). Specs target `#activityCreateModal.show`.
- The first parallel E2E run timed out against a cold preview server; a rerun with 2 workers passed.

### Status
Done for **create**.

## Still pending
- **Edit modal** (`ActivityEditModal.jsx`): the task fields can't be changed after creation yet, and the API's update endpoint ignores them.
- **Timeline display** (`ActivitySidebar.jsx`): show the assignee, due date, priority and status on the activity card.
- Notifying the assignee, and a "my tasks" list or filter, were not requested yet.
- E2E-014: remove the duplicate modal mount.
