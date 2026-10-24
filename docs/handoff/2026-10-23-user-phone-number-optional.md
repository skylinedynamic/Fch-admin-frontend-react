# Users — phone number is optional

**Date:** 2026-10-23
**Branch:** `hotfix` (uncommitted)

## Problem
On Users › Add User (`/users/create`) and User Details (`/user-details/:id`), Phone Number was marked `*` and saving was blocked with "Phone number is required". On edit, the API refused a missing phone as well (`UpdateUserRequest`: `required`). The API's add rule already allowed it to be empty.

## Solution
Phone number is optional on add and edit, in the UI and the API:
- `src/pages/users/UserDetails.jsx`: removed the `*` from the label and the "Phone number is required" check.
- `src/pages/users/components/UserModal.jsx` (the older modal on the Users list): the same.
- fch-api `UpdateUserRequest`: `phone_number` changed from `required` to `nullable`. It stays unique among users when given.

## Files changed
- `src/pages/users/UserDetails.jsx`, `src/pages/users/components/UserModal.jsx`: as above.
- `tests/pages/users/UserDetails.create.test.tsx`: new test that the label has no `*` and a user saves with the phone cleared.
- `e2e/sidebar/users/users.spec.ts`: the two "required fields" tests now assert there is **no** phone error.
- `e2e/sidebar/employees/employees.spec.ts`: the mocked "what the API requires" answer follows the employee rule change from the same day (only country missing). See fch-api `docs/handoff/2026-10-23-employee-required-fields.md`.
- fch-api `app/Http/Requests/Api/V1/FCH/Common/User/UpdateUserRequest.php` and `tests/Feature/User/UserManagementApiTest.php` (new `a_phone_number_is_optional_on_add_and_edit`).

## Testing
- New Vitest and PHPUnit tests: red before the change, green after.
- Vitest: `tests/pages/users` + `tests/modules/user`: **21 passed**. `npm run typecheck`: clean.
- PHPUnit: `tests/Feature/User`: **42 passed**.
- Playwright (`--project=mock --workers=2`, after `npm run build`, with `E2E_BASE_URL=`): users + employees, **47 passed**. With the default worker count the machine ran out of memory.

## Open items
- An unrelated, pre-existing broken comment in `assets/css/responsive.css` (around line 2139, from commit `854aa8ea`) makes `npm run build` print two CSS warnings, and the rules after it may be ignored. Not changed.
- Follow-up, done the same day: the employee form's `*` were removed from Position, Department, Phone Number, Address, State and City (`PersonalInfoSection.jsx`, `AddressSection.jsx`), leaving Name, Email and Country. New test `tests/pages/employees/components/form-sections/RequiredMarkers.test.tsx` (red before, green after). Employee Vitest 7 passed, employees E2E 22 passed, typecheck clean. "Other City" keeps its `*` and HTML `required`: it only appears when "Others" is picked as the city.
- Not committed.
