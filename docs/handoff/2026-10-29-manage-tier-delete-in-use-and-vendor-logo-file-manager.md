# Manage Tier: single task delete, in-use refusals shown, vendor logo from the File Manager (BUG-095, reopened)

Date: 2026-10-29

## Problem
Owner › Credit Builder › Manage Tier (`/tiers/:id`). QA's 28-Oct retest left BUG-095 open:
- **No Add Task on Tier 0 and Tier 4.** This is by design: tasks are added on Tier 1 only. Nothing changed.
- **Deleting one task from its row** called `DELETE tier-tasks/{id}`, which the API does not have, so it failed with a 405 (seen 27-Oct).
- **"Delete Selected" on vendors** posted to `vendors-multiple-delete`, which the API did not have.
- **Deleting a task or vendor clients already use broke their screens.** The API now refuses it (fch-api handoff of the same date), so the portal has to show why.
- **The vendor logo** should be chosen in the File Manager, not uploaded.

## Solution
- `deleteTierTask(id)` posts `{ ids: [id] }` to `tier-tasks-multiple-delete`, so the row delete no longer 405s.
- **A refused delete** (422 with `errors.in_use`) closes the confirmation and opens `DeleteBlockedModal` ("Task Cannot Be Deleted" / "Vendors Cannot Be Deleted"). One item is named in the message; several are listed under it. Other failures still toast the API's message.
- **Vendor dialog:** the logo box opens the File Manager on the `vendors` folder, at z-index 1065, above the dialog's Bootstrap modal (1055). It used to open behind it. While it is open, the dialog's focus trap is paused so the File Manager's inputs keep focus. Picking an image (jpg, jpeg, png, gif, svg, webp) sets `logo` to its path, and any other file is refused with a toast. An edit shows the logo on file and sends `logo` only when a new one is picked.
- The vendor save is plain JSON now (create POST, edit PUT). The `FormData` / `_method=PUT` branch for uploads is gone.

## Files changed
- `src/modules/tiers/services.ts`: `deleteTierTask` uses the bulk route.
- `src/pages/tiers/components/TierTasks.jsx`, `TierVendors.jsx`: a refused delete closes the confirmation and shows `DeleteBlockedModal`; vendor save as JSON.
- `src/pages/tiers/components/TierVendorModal.jsx`: logo from `FileManagerModal` (above the dialog, focus trap paused), image check, preview of the chosen or stored logo.

## Testing
New, each red first:
- `tests/pages/tiers/TierVendorModal.logo.test.tsx` (3): opens the File Manager on `vendors`, above the dialog's z-index, and sends the path; refuses a pdf; an edit shows the stored logo and sends none.
- `tests/pages/tiers/TierDeleteInUse.test.tsx` (1): one task is deleted through the bulk route; a refusal closes the confirmation and shows the dialog, with no toast.
- `tests/modules/tiers/services.test.ts` (+2): `deleteTierTask` posts `{ ids: [id] }`; a refused delete carries the API's message.

E2E `e2e/sidebar/credit-builder/manage-tier/tier-tasks-vendors.spec.ts`:
- "deleting one task from its row" now expects the bulk route with `{ ids: [11] }` and no DELETE. It used to pin the 405-ing call.
- New: a task clients use is refused: the confirmation closes and the dialog names it, with no toast.
- New: vendors tasks use are refused: the dialog lists both.
- New: the logo File Manager is the top element over the vendor dialog, checked in a real browser. This is the overlap from the 29-Oct screenshot.

E2E fixtures:
- Both manage-tier specs failed on every test before this, with a 403 on the page. BUG-125 put `/tiers` behind `view tier` and the fixtures only had `update tier`.
- They now seed `view tier`. The "without the update permission" cases keep `view tier` only, so they still test the missing update permission.
- Logged as E2E-018.

Runs:
- Manage-tier E2E: 47/47.
- `tests/pages/tiers` + `tests/modules/tiers`: 41/41.
- `npm run typecheck`: clean.
- Full Vitest suite: see the session report.

## Open items
- **E2E-018:** the credit-accounts and verification-center mock specs still seed no view permission and fail with a 403 (40 failing in `e2e/sidebar/credit-builder`). This predates this work.
- **The logo cannot be removed** from the dialog, only replaced; the API accepts `logo: null`.
- **No E2E for picking a logo in the File Manager.** It is covered by Vitest with the File Manager mocked.
