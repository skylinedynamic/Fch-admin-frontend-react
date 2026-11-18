# Partner and employee pictures: the picker waits for the record to be saved

**Date:** 2026-11-14
**Author:** Awlad Hossain

## Problem

On `/employees/create` and `/partners/create`, the profile picture button opened the file manager on the **next** id: `employees/{next id}` (from `employees-next-id`) or `partners/{next id}` (from `partners/next-id`). On the employee page, it fell back to `employee_code`.

- The API's file manager now opens only folders on its list, and a record folder only when that record exists (fch-api, R3-BUG-002). On the employee create page, a partner's team got a 403 ("folder not yours") as soon as they clicked the camera.
- The next id is only a guess. Two people creating at once share that folder, and a picture put there can end up on someone else's record.

## Solution

- The camera button is disabled until the record exists, and the form says "Save the employee first, then add a picture." (or "Save the partner first…").
- Once saved, the picker opens the record's own folder: `employees/{id}` or `partners/{id}`. The `formData.id` / `entity_id` / `employee_code` fallbacks are gone.
- `EmployeeForm` passes `isEditMode` to `PersonalInfoSection`. Only the employee edit page passes a real id.

## Files changed

- `src/pages/employees/components/form-sections/PersonalInfoSection.jsx`: new `isEditMode` prop. With no saved employee, the picker is off and the note is shown. Otherwise it opens `employees/{employeeId}`.
- `src/pages/employees/components/EmployeeForm.jsx`: passes `isEditMode` through.
- `src/pages/partners/components/PartnerInformationSection.jsx`: with no `partnerId`, the picker is off and the note is shown. Otherwise it opens `partners/{partnerId}`.
- `tests/pages/employees/components/form-sections/PicturePicker.test.tsx` (new, 4 tests): for each of the employee and partner forms, the picker waits for the record to be saved, and a saved record opens its own folder.
- `e2e/sidebar/employees/employees.spec.ts`: +"Employee create › the picture waits for the employee to be saved".
- `e2e/sidebar/partners/partners.spec.ts`: +"Partner create › the picture waits for the partner to be saved".

## Testing

- **Seen failing first:**
  - The 2 unit "waits" tests.
  - The 2 E2E tests (run on a build of the old code).
  - The 2 "own folder" unit tests passed both before and after; they pin the edit page's behaviour.
- **After the change:**
  - `tests/pages/employees` and `tests/pages/partners`: 152 passed (33 files).
  - `npm run typecheck`: clean.
  - Mock E2E for `e2e/sidebar/employees` and `e2e/sidebar/partners` (live specs and `partner-profile.spec.ts` left out): 73 passed and 3 failed.
    - 2 are in `partner-configuration.spec.ts`. They fail the same way on the old code.
    - 1 is in `download-agreement.spec.ts`. It was flaky: on a re-run with `--repeat-each=3`, all 6 passed.

## Open items

- **Picture after saving:** a new partner or employee gets a picture after the first save, from the edit page.
- **Still `.jsx`:** the three components are still `.jsx`. They were changed in place, not converted to TypeScript.
- **`partner-profile.spec.ts` does not load locally:** `VITE_WEBSITE_URL` is not set. This was already the case before this change.
