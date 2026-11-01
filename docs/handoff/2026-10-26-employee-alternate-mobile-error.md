# Employee Alternate Mobile and Zip Code show their validation messages

Date: 2026-10-26

## Problem
On Employees › Add/Edit Employee, an invalid **Alternate Mobile** (e.g. `1`) or **Zip Code** made the save fail with no message under the field. The API already refuses both and returns the message:
- `phone_number_2` is checked by `UsPhoneNumber` in `StoreEmployeeRequest` and `UpdateEmployeeRequest`.
- `postal_code` is validated too.

`AddressSection.jsx` never bound `errors` to these two inputs: no `is-invalid` class and no `invalid-feedback`. The page maps every backend error key into `errors`, so only the display was missing.

These were the only fields like this. Comparing the employee form's inputs with the error display found just these two; `create_account` is a checkbox. The partner Secondary Contact phone/email and the client Business Phone were also checked in a real browser against the local API, and both already show their messages.

## Solution
Both inputs now get `is-invalid` and an `invalid-feedback` with the API message, as the other address fields do. The Zip Code input exists twice (when City is "Others" and when it is not), and both are bound. Validation stays server-side only.

## Files changed
- `src/pages/employees/components/form-sections/AddressSection.jsx`: errors shown for `phone_number_2` and both `postal_code` inputs.
- `tests/pages/employees/components/form-sections/AddressSection.errors.test.tsx`: new.
- `e2e/sidebar/employees/employee-field-errors.spec.ts`: new mock spec.

## Testing
- New Vitest test failed first (2 failed), then passed. `tests/pages/employees`: 17/17. Full suite: 262 files, 1822 passed (2 expected fail).
- `npm run typecheck`: clean.
- Mock E2E `e2e/sidebar/employees`: 26/26.
- Checked once in a real browser against the local API with a temporary live spec, since deleted. Alternate Mobile `1` shows "Enter a valid 10-digit US phone number, e.g. (555) 234-5678."

## Open items
- None.
