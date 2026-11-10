# CI typecheck: DepartmentModal test props typed as `never`

**Date:** 2026-11-10

## Problem
CI's `npm run typecheck` failed with exit code 2 on `tests/pages/employees/DepartmentModal.test.tsx`:

```
(19,87): Type '{ id: number; name: string; }[]' is not assignable to type 'never[]'.
(75,83): Type '{ id: number; name: string; employees_count: number; }' is not assignable to type 'never'.
(93,83): same as line 75
```

`DepartmentModal` is still a `.jsx` file. With `allowJs`, TypeScript infers its props from the destructuring, and the default `departments = []` becomes `never[]`. So no `.tsx` caller or test can pass a real list of departments.

## Solution
- `src/modules/employee/types.ts`: new `Department` type (`id`, `name`, optional `employees_count`), matching what `POST /common/departments/fetch-departments` returns (`DepartmentService` in fch-api).
- `src/pages/employees/components/DepartmentModal.jsx`: a JSDoc `@param` on the component types its props (`visible`, `onHide`, `onSuccess`, `departments?: Department[]`). Comment only; no runtime change.

Converting the modal to `.tsx` would also fix this, but it is a larger change to a working screen. That can come with the next real change to the modal.

## Files changed
- `src/modules/employee/types.ts`: `Department` type added.
- `src/pages/employees/components/DepartmentModal.jsx`: JSDoc prop types.

## Testing
- `npm run typecheck`: 0 errors (3 before).
- `tests/pages/employees` (Vitest): 12 files, 39 tests passed.
- Full Vitest suite: see the PR / CI run.

## Open items
- Other `.jsx` components with an empty-array default prop would hit the same `never[]` problem as soon as a `.tsx` test passes them a list.
