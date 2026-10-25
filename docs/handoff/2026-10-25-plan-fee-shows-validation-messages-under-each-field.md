# Plan & Fee — the API's validation messages show under each field (BUG-096)

2026-10-25

## Problem
QA defect log **BUG-096** (OP-PF-04): Total Amount 0 was saved; -5 showed only "Failed to update plan"; empty also went through; no field ever showed a message. `PlanFee.tsx` sent `parseFloat(value) || 0` — an empty amount became 0 — and its catch toasted a generic failure whatever the API answered.

## Solution
The API now validates every value and answers a 422 with one message per field (fch-api `docs/handoff/2026-10-25-plan-fee-amount-validation.md`). The screen:
- sends what was typed: a number, or `''` when left empty — never turned into 0 — so the API decides (`asSent`). The platform fee is sent the same way (it must be above 0); seats still send 0 when empty, installments `null`, as before;
- on a 422, puts each message under its field — Total Amount, Monthly Platform Fee, Installment Upto, Free Seats — with the field outlined red (`is-invalid`); a message for a field the screen has no input for is toasted; anything else is still "Failed to update plan";
- clears a field's message as soon as it is edited.
- Layout: the message sits just under its input, out of the row's flow, so Total Amount, Platform Fee and Save stay on one line; the card makes room for it while there is one. On a phone (fields stacked) it simply follows its field.

## Files changed
- `src/pages/plan-fee/PlanFee.tsx` — `asSent`, `fieldErrorsFrom`, `fieldErrors` state, messages under the four inputs.
- `assets/css/custom.css` — `.plan-fee-field-error`, `.plan-fee-has-error` (message placement).
- `tests/pages/plan-fee/PlanFee.test.tsx` — +5 tests.
- `e2e/sidebar/plan-fee/plan-fee.spec.ts` — +2 tests.

## Testing
- New Vitest: the message under Total Amount and no generic toast; empty sent as `''`; the platform fee message under the fee; an empty platform fee sent as `''`; editing clears it — all failed first, pass after. Existing payload tests (numbers) unchanged and passing. Full suite: 247 files, 1736 passed. `npm run typecheck` clean.
- E2E (mock) `e2e/sidebar/plan-fee`: 20 passed. Layout checked in Chromium: with the message shown, the inputs and Save do not move on desktop (1366px); on a phone (400px) the message follows its field.
- Live, against the real local API: 0 → "The total amount must be greater than 0.", empty → "Enter the total amount."; platform fee 0 → "The platform fee must be greater than 0.", empty → "Enter the platform fee."; no generic toast; the plan kept $4,997.00 / $299.00.

## Open items
- The confirm dialog still opens before the API checks the value; the message shows right after Confirm & Save. A check in the screen before the dialog would duplicate the API's rules — not added.
- Mark BUG-096 in the QA defect log In Progress (it was marked Fixed), then Fixed after the stage retest.
