# BUG-180: show the environment before approving or rejecting a manual payment

**Date:** 2026-11-06

## Problem
On staging, a manual Cash payment (payment 356, INV-20261029005) was recorded as **PRODUCTION**, while the Bank Transfer for the same invoice minutes earlier was recorded as Sandbox. A payment's environment comes from the mode of the method used (fch-api handoff `2026-11-01-payment-environment-from-method-used.md`). Staging's host Cash method is most likely set to Production.

The approver on Payment Details (`/payments/:id`) could not see this before deciding, so a test payment could be approved as live money without anyone noticing.

## Solution
- New `PaymentEnvironmentNotice` shows "Recorded in **SANDBOX** / **PRODUCTION**" with a short hint ("Test payment: not counted as live money." / "Live money: counted in production reports."). It uses the existing `PAYMENT_ENVIRONMENT_LABELS` / `PAYMENT_ENVIRONMENT_COLORS`.
- The notice shows the payment's `is_environment` in three places:
  - the Payment Approval & Decision panel
  - the Confirm Payment Approval modal
  - the Confirm Payment Rejection modal
- Display only. Approve and reject do not change the environment, and no API change was needed.
- Approve and reject are only offered on Payment Details. The list's `onApprove` prop is passed but `PaymentTable` never uses it, so the list has no approve button.

## Files changed
- `src/pages/payments/components/PaymentEnvironmentNotice.tsx` (new): the notice.
- `src/pages/payments/PaymentDetails.jsx`: renders the notice in the panel and both modals.
- `tests/pages/payments/PaymentDetails.test.tsx`: 2 new tests.
- `e2e/support/live/backend.ts` (new): `runSeeder()` / `seedProcessingManualPayment()`, which run fch-api's local-only seeder. Set `E2E_PHP` for a different php binary and `E2E_BACKEND_PATH` for the API path (default `../fch-api`).
- `e2e/sidebar/payments/payment-approval-environment.live.spec.ts` (new).
- fch-api: `database/seeders/E2EProcessingManualPaymentSeeder.php` (new). A reusable Processing Cash payment on a host client. `E2E_PAYMENT_ENVIRONMENT` sets its environment on each run.

## Testing
- `PaymentDetails.test.tsx`, red first: both new tests failed because no notice was found. Green after the change.
- `tests/pages/payments`: 20 passed. `npm run typecheck` is clean.
- Live E2E (`E2E_PHP=<php 8.3> E2E_BASE_URL=http://localhost:5174 npx playwright test --project=live e2e/sidebar/payments/payment-approval-environment.live.spec.ts`): 3/3 passed, covering setup, Sandbox and Production. Every dialog is cancelled, so the seeded payment stays Processing.
- Mocked E2E `e2e/sidebar/payments/payments.spec.ts`: 16/16 passed, including the existing approve and reject flows.

## Open items
- This only makes the environment visible. A payment recorded with the wrong environment still has to be caught by the approver, or prevented at the source:
  - Fix staging's host Cash mode to Sandbox.
  - Or take manual methods' environment from the app environment (`PaymentProvider::defaultModeForApp()`).
- The approver cannot change the environment here. A dropdown was discussed but not built.
- Not committed.
