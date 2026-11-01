# Manage Tier — Add Task on Tier 1 always asks for its vendor, and says when vendors are loading (BUG-095)

2026-10-25

## Problem
QA defect log **BUG-095** (OP-TIER-09): Tier 1 › Task Information › Add Task — the Related Vendor list was empty (and QA's tab froze on opening it).

Found on the local database: the task dialog decided "Related Vendor or Verified By Api", and whether a vendor is required, from a tier object `TierTasks` fetched with its **own** request — while the page (`TierForm`) had already loaded the tier and shows Add Task only for `T1`. On a slow API the dialog opened before that second request answered (24 renders with no tier, then Tier 1): it showed **Verified By Api**, skipped the vendor check and **saved a Tier 1 task without a vendor**. The vendor list, loaded separately, looked empty while loading. The freeze was not reproduced (Chromium, 11 or 0 vendors, before and after Save).

"No Add Task on Tier 4" is by design — Tier 1 only.

## Solution
- `TierForm` passes its `tierCode` to `TierTasks`; `TierTasks` uses it (its own request is only a fallback) everywhere it read the tier's code — the dialog, the selection column, the row actions.
- `TierTaskModal` takes `tierCode` (falls back to `tier.code`) for the vendor / API choice and the vendor check, so they are right from the first render.
- The vendor dropdown says **"Loading vendors…"** (disabled) while the list loads, and **"No active vendors on this tier. Add one in the Vendors tab."** when there are none.
- Both dropdowns in the dialog open inside it (`appendTo="self"`) instead of on the page body, outside the Bootstrap modal's focus trap — the likely cause of the freeze.
- The API now also refuses a Tier 1 task without a vendor — fch-api `docs/handoff/2026-10-25-tier-1-task-requires-its-vendor.md`.

## Files changed
- `src/pages/tiers/TierForm.jsx` — passes `tierCode`.
- `src/pages/tiers/components/TierTasks.jsx` — uses it; passes `tierCode` and `vendorsLoading` to the dialog.
- `src/pages/tiers/components/TierTaskModal.jsx` — `tierCode`, `vendorsLoading`, empty / loading messages, `appendTo="self"`.
- `tests/pages/tiers/TierTaskModal.vendor.test.tsx` — new, 5 tests.
- `e2e/sidebar/credit-builder/manage-tier/tier-tasks-vendors.spec.ts` — +2 tests.

## Testing
- New Vitest: vendor required from the tier code alone; "Loading vendors…"; "No active vendors…"; the list opens inside the dialog — failed first, pass after; another tier needs no vendor (passed throughout). Full suite: 247 files, 1732 passed. `npm run typecheck` clean.
- New E2E (mock): a hanging second tier request still gets Related Vendor and the vendor check; a hanging vendor list shows "Loading vendors…" — both **failed on the old code** (stashed and rebuilt), pass after. `e2e/sidebar/credit-builder/manage-tier`: 42 passed.
- Live, on the local database: Related Vendor shown at once, Save without a vendor blocked (no request sent), 11 vendors listed inside the dialog.

## Open items
- Mark BUG-095 in the QA defect log In Progress, then Fixed after the stage retest; note Tier 4 is by design.
