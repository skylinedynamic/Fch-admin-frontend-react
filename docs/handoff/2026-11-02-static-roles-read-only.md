# 2026-11-02 — Roles & Permissions: a static (system) role is read-only (BUG-011, round 2)

## At a glance

| | |
|---|---|
| **Problem** | R2-OP-ROLE-02: Roles & Permissions › Admin › Edit Role opened with every control enabled (name, all permissions, Administrator Access, Update). The API did not block it either, so a save could strip the only admin's access. |
| **Solution** | Product decision: a role with `is_static = 1` is read-only. Its card says **View Role**. The page is titled "View Role", shows "This is a system role. Its name and permissions cannot be changed.", every control is disabled, and there is no Update button. The API refuses the update with 403 (fch-api handoff, same date). |
| **Changed** | `src/modules/role/{types,services}.ts`, `src/pages/roles/{EditRole,RolesPermissions}.tsx`, tests (below), `docs/e2e/ISSUES.md` (E2E-021). |

## 2026-11-02 — Static roles read-only

### Problem
- `fetchRoleDetail` dropped every field it did not map, so the editor could not tell a static role apart.
- `EditRole` had no read-only state.
- The list showed the same "Edit Role" button on every card (only Delete was hidden for static roles).

### Solution
- **`RoleDetail.is_static`:** `fetchRoleDetail` passes it on (false when the API leaves it out).
- **`EditRole`**, when `is_static`:
  - the title is "View Role" (breadcrumb "View");
  - a lock notice;
  - the form sits in a `<fieldset disabled>`, which disables the name, description, Administrator Access, every Select All and every permission;
  - no Update button.
- **`RolesPermissions`:** a static role's card says "View Role" with an eye icon, and opens the same page.

### Files
- `src/modules/role/types.ts`: `RoleDetail.is_static`.
- `src/modules/role/services.ts`: `fetchRoleDetail` maps `is_static`.
- `src/pages/roles/EditRole.tsx`: read-only state.
- `src/pages/roles/RolesPermissions.tsx`: View Role on static cards.
- `tests/modules/role/services.test.ts`: exact shape now includes `is_static: false`; +1 (passes `is_static: true` on).
- `tests/pages/roles/Roles.test.tsx`: +5 tests.
  - list: View Role on a static card;
  - edit: the notice; disabled controls and no Update; the "View Role" heading; an editable role keeps its controls.
- `e2e/sidebar/roles-permissions/roles.spec.ts`: +1 mocked spec (View Role → read-only page, 4 ticked and none enabled, no Update).
- `e2e/sidebar/roles-permissions/roles-permissions.live.spec.ts`: +1 live spec (the real Admin role opens read-only with no Update).

### Tests added or updated
The new Vitest tests failed first (6 red; "an editable role keeps its controls" passed from the start and stays as a guard).

### Verified
- Vitest `tests/modules/role` + `tests/pages/roles`: 48 passed. `npm run typecheck`: clean.
- E2E mocked `roles.spec.ts` (dev server :5174, `--workers=2`): the new spec passes. **5 other specs fail, the same with this change stashed**, so they predate it; logged as **E2E-021** (empty-name specs not updated for BUG-038; the delete confirmation locator).
- E2E live `roles-permissions.live.spec.ts` (local `fch-api` with the 403 change): 5 passed.

### Notice design (follow-up)
- **The banner:** the plain `alert-info` notice is now a "System role" banner (`assets/css/roles.css`, imported by `EditRole`). It has a shield icon tile, the title "System role" with a **Read-only** pill, and the sentence underneath.
- **Styling:** the theme's warning colours (`--vz-warning-bg-subtle`, `--vz-warning-border-subtle`, `--vz-warning`, `--vz-warning-text-emphasis`; reviewer's choice) with a 3px accent on the left, at the portal's 4px radius.
- **Test:** +1 Vitest test in `Roles.test.tsx` (the banner, its title and the badge). Role tests: 29 passed.
- **Looked at in Chromium** at 1440px and 400px. The radius is 4px, and the text wraps under the title on a phone.

### Status
Done. QA sheet BUG-011 → Fixed in build, pending stage retest.

## Still pending
- E2E-021 (5 pre-existing failures in `roles.spec.ts`).
- `EditRole` still calls the `fetchRoleDetail` service directly rather than a query hook. That predates this change.
