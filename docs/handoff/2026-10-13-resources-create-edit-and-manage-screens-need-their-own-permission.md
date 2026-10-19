# 2026-10-13 — Resources — create, edit and manage screens need their own permission

**Date:** 2026-10-13  
**Title:** Resources — create, edit and manage screens need their own permission  
**Repositories:** API — `fch-backend-api`, Admin — `Fch-admin-frontend-react`, both on branch `e2e-missing-tests`. **Nothing is committed.**  
**Summary, pending items and test data for this date:** [2026-10-13-summary-pending-and-test-data.md](2026-10-13-summary-pending-and-test-data.md)

Each entry: date and title, then the problem, the solution, the files touched, how it was verified and a status.

## At a glance — issue, solution and what was changed

| # | Issue faced | Solution | What was changed (files) | Status |
|---|---|---|---|---|
| 1 | The routes `/resources/create`, `/resources/edit/:id` and `/manage-resources` were guarded only by "view resources". | Each route now needs the permission for what it does: `create resources` for the create form, `update resources` for the edit form, and any one of create / update / delete for the manage screen. | `src/App.jsx`, `e2e-live/routes.ts`, `e2e/resources.spec.ts` | Fixed and verified |

## 2026-10-13 — 1. Partners could open the resource forms the API refuses

- **Problem:** The routes `/resources/create`, `/resources/edit/:id` and `/manage-resources` were guarded only by "view resources". White-label and certified accounts hold that permission, so they could open the forms by address, fill them in and then be refused by the API with "Access denied. Admin privileges required". (Carried over from 2026-10-12, pending item P4.) The "create / update / delete resources" permissions are host-only in `config/permissions.php`, and the page already hides its "Add New", edit and delete controls without them — only the routes were loose.
- **Solution:** Each route now needs the permission for what it does: `create resources` for the create form, `update resources` for the edit form, and any one of create / update / delete for the manage screen. The resources list itself still needs only "view resources". The live route table was updated to match. Four tests were added: the three screens are blocked with only the view permission, and the list stays open.
- **Files:** `src/App.jsx`, `e2e-live/routes.ts`, `e2e/resources.spec.ts`
- **Verified:** `e2e/resources.spec.ts`, `e2e/resources-page.spec.ts`, `e2e/persona-access.spec.ts` and `e2e/navigation.spec.ts` on `http://localhost:5174`, headed — 472 passed. Typecheck clean for app and specs.
- **Status:** Fixed and verified
