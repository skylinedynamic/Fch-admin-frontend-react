# R3-BUG-071: clearing an employee's Email "saves" and keeps the old email

2026-11-22

## Problem
Employees › Employee Details (edit), employee 102. Clearing Email and pressing Update sent `POST common/employees/102` (`_method: PUT`) with **no email field at all**. The response was 200, "Employee updated successfully", and the old email came back in the field. There was no "Email is required." (QA Round 3, R3-BUG-071, Reopened after the 18-Nov retest.) The API itself refuses `email=""` with 422 "Email is required.".

Cause: `EmployeeDetails.jsx` built the update by skipping every empty value (`value !== ''`), so a cleared field was never sent. The API (`sometimes|required`) took it as unchanged and kept the old value. The page's own validation is commented out ("rely on backend validation"), but the backend never saw the empty value. The same applied to any cleared optional field: clearing it didn't save.

## Solution
On **edit**, a cleared field is now sent as `""`:
- The required fields (first name, email, country) are refused by the API (422). The existing error handling shows the message under the field, and no success toast appears.
- The optional fields are all `nullable` in `UpdateEmployeeRequest`, so clearing one now saves it cleared.
- The API only takes its own field list (`$request->only($fields)`), so other keys in the form state are ignored.

**Create** is unchanged: it only sends what was filled in.

## Files changed
- `src/pages/employees/EmployeeDetails.jsx`: on edit, empty values are sent as `""` instead of being left out.
- `tests/pages/employees/EmployeeDetails.clearedField.test.tsx` (new, MSW against the real `apiClient`), 2 tests:
  - a cleared Email is sent as `""`, the API's "Email is required." shows, and there is no success toast;
  - a cleared Address is sent as `""` while Email is sent unchanged.
- `e2e/sidebar/employees/employee-cleared-email.spec.ts` (new, mock project): clear Email › Update shows "Email is required.", no success message, and the request carries an empty `email`.

## Testing
- Vitest: both new tests failed first (email not in the request; address `null`), then passed. `tests/pages/employees` + `tests/modules/employee`: 19 files, 78 passed plus 1 failure that was already expected. `npm run typecheck` is clean.
- E2E: `npm run build`, then `npx playwright test e2e/sidebar/employees --project=mock` with `E2E_BASE_URL=`: 33 passed. I didn't run the new spec against the pre-fix build.

## Open items
- Other edit forms may have the same "skip empty values" pattern (clients, partners, users). Not checked here.
