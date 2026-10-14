# One lead delete API

**Date:** 2026-10-13
**Branch:** bugfix-awlad
**Author:** Awlad Hossain

## Problem
On the Leads screen, "Delete Selected" sent one `DELETE /common/leads/{id}` for each selected lead, one after another. If one request failed, the leads before it were already deleted, but the toast only said "Failed to delete leads". The user could not tell which leads were gone.

## Solution
- **One call for one lead or many.** The page now sends the whole selection in a single `POST /common/leads/multiple-delete` with `{ ids }`. One selected lead goes as `ids: [id]`.
- **New service, old one removed.** `deleteLeads(ids)` was added to `modules/leads/services.ts`. `deleteLead(id)` was removed; nothing else used it.

This depends on fch-api F108 (`fch-api/docs/handoff/2026-10-13-f108-one-lead-delete-api.md`). There the bulk endpoint is the only lead delete, scoped to the caller's partner, and each lead is logged. `DELETE /common/leads/{id}` no longer exists.

## Files changed
- `src/modules/leads/services.ts`: `deleteLeads(ids)` added, `deleteLead` removed.
- `src/pages/leads/Leads.jsx`: `handleDeleteConfirm` makes one `deleteLeads` call instead of a loop.

## Tests
- **Updated:** `tests/modules/leads/services.test.ts`
  - `deleteLeads` posts `{ ids }` to the bulk route;
  - `deleteLead` no longer exists;
  - one lead also goes through `deleteLeads`.
- **Added:** `tests/pages/leads/Leads.bulkDelete.test.tsx`. It renders the real page with MSW and checks that:
  - selecting two rows sends one bulk call with both ids and no single DELETE;
  - selecting one row sends `ids: [id]`.
  - It uses the same synchronous Bootstrap modal fake as `EditConfirmationModal.test.tsx`.
- Both tests failed first: the page made no bulk call, and `deleteLead` was still exported.
- **E2E:** not added. There is no Leads Playwright spec, and the flow is covered at the page level.
- **Run:** `npm test` passed (111 files, 661 tests). `npm run typecheck` is clean.

## Open / follow-up
Deploy together with fch-api. This build calls the bulk route, and older builds call the removed single route.
