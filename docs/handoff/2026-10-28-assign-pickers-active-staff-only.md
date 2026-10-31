# Assign pickers list active staff only

2026-10-28

## Problem
The "assign to someone" dropdowns listed every member of the team, inactive users included:
- Activity log › Want to Assign › **Assigned To**
- Client › **Assign to**
- Lead › **Lead Owner**
- Partner › Status & Agent › **Agent**

Inactive staff could therefore be picked.

## Solution
- **The filter is server-side.** `POST common/get-all-users` takes two new optional fields (fch-api, same branch):
  - `active_only`: leave out inactive users.
  - `keep_ids`: users to keep even if inactive.
- **Each picker sends `active_only: true`**, with whoever is already assigned in `keep_ids`. A record whose assignee has since become inactive still shows that name instead of a blank field.
  - Task: the saved assignee (Edit) and the record's owner shown in the owner card.
  - Client: the saved `assign_id`. The list loads after the client does.
  - Lead: the saved `salesperson_id`.
  - Partner: the saved `assigned_user_id`. The list loads after the partner does.
- **List filters are unchanged.** The Clients, Leads and Partners list filters send neither field and still get everyone, so records owned by an inactive user can still be filtered.
- The server also refuses an inactive user as a new Task assignee. An Edit may keep a saved assignee who has since become inactive.

## Files changed
- `src/modules/partner/services.ts`: `allUsers` payload type gains `active_only` and `keep_ids`.
- `src/modules/activity-log/queries.ts`: `useTaskAssignees(partnerId, enabled, keepIds)` sends `active_only` and the sorted, de-duplicated `keep_ids`. The query key includes `keep_ids`.
- `src/components/Common/Modals/activity-create/useTaskAssignmentSetup.ts`: new `assignedTo` option. Keeps the owner and the saved assignee.
- `src/components/Common/Modals/ActivityEditModal.jsx`: passes `activity.task.assigned_to`.
- `src/pages/clients/components/ClientInfoSection.tsx`: Assign to asks for active staff, keeping the saved assignee.
- `src/pages/leads/LeadDetails.jsx`: Lead Owner, the same.
- `src/pages/partners/PartnerProfile.jsx`: Agent, the same.

## Testing
- **Vitest:** the new expectations were red first. Affected suites: `tests/modules`, `tests/components/Common`, `tests/pages/{leads,clients,partners}`: 877 passed, 2 expected-fail.
  - `tests/modules/activity-log/queries.test.tsx`: `active_only`, `keep_ids` (sorted, no duplicates), query key.
  - `ActivityCreateModal`, `ActivityEditModal` and `ActivitySidebar.taskAssign` tests: the request sent.
  - `tests/pages/leads/LeadDetails.leadOwner.test.tsx`: Lead Owner keeps the saved owner.
- **Typecheck:** `npm run typecheck` is clean.
- **Playwright:** 27/27 (`--workers=2`). The `activity-task-assign.spec.ts` specs (clients, leads, partners, funding application, funding request) and `lead-owner-team.spec.ts` were updated to the new request. New specs cover Client Assign to and Partner Agent.
  - `clients-list.spec.ts` has one failure, "partner filter sends the partner id". It is the pre-existing E2E-015 and unrelated.

## Open items
- Client **Assign to**, Lead Owner and Agent are still not validated server-side for an inactive user. Only the Task assignee is.
- **Leads list › convert dialog:** if it gains an owner picker, it should send `active_only` too.
