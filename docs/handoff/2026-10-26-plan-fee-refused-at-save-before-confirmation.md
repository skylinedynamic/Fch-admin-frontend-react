# Plan & Fee — a bad value is refused at Save, before the confirmation dialog (BUG-096 retest)

**Date:** 2026-10-26
**Branch:** bugfix/all-bugfix
**Author:** awlad

## Problem
QA defect log **BUG-096**, retest on 26 Oct: Fail. Total Amount 0, -5 or empty → Save opened "Confirm Rate Changes" ($4997.00 → $0.00) first. The field message (2026-10-25) appeared only after Confirm & Save, and QA cancelled the dialog. The 25 Oct admin commit (58c84261) was also not on stage.

## Solution
Save now asks the API to **check** the values first (`validatePlanFeeSubscription` → `PUT …/validate-subscription-plan/{id}`, which saves nothing; fch-api handoff, same date):
- **refused:** the message shows under its field, the typed value stays in the box, and **the dialog does not open**;
- **accepted:** the dialog opens, and Confirm & Save saves as before;
- **the check cannot be made** (e.g. a 500): "Failed to update plan", and no dialog.

The check and the save send the same payload (`buildPayload`) and show a refusal the same way (`showRefusal`). The Save button is disabled while the check runs.

## Files changed
- `src/modules/subscription-plan/services.ts`: `validatePlanFeeSubscription()`.
- `src/pages/plan-fee/PlanFee.tsx`: check before the dialog; `buildPayload` and `showRefusal` shared by the check and the save.
- `tests/pages/plan-fee/PlanFee.test.tsx`: the validation tests now refuse at the check with no dialog; +3 (the refused value stays in the box; good values pass the check, then save what was checked; a failed check opens no dialog).
- `tests/modules/subscription-plan/services.test.ts`: +1.
- `e2e/sidebar/plan-fee/plan-fee.spec.ts`: the BUG-096 tests refuse at Save with no dialog; +1 (check then save); "nothing saved" asserts now look at the save route only.

## Testing
- Vitest `tests/pages/plan-fee` + `tests/modules/subscription-plan`: 19 passed (the new and rewritten ones failed first). Full suite: see the session report. `npm run typecheck` clean.
- E2E (mock) `e2e/sidebar/plan-fee`: 21 passed.
- **Live against the local API** (host admin, Certified Partner One-Time $4,997.00):
  - 0, -5 and empty → Save → "The total amount must be greater than 0." / "Enter the total amount." under the field, the value kept, **no dialog**;
  - 5000 → Save → the dialog opens (cancelled);
  - after a reload the plan is still $4,997.00.

## Open items
- QA sheet: BUG-096 → Fixed after the stage retest (this branch on stage).
