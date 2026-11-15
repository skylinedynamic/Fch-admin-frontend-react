# Payment Integration: switching to Sandbox says "test mode", and confirming saves it (BUG-207)

**Date:** 2026-11-11
**Branch:** round-1-run-2-fix

## Problem
QA Round 1 Run 2, BUG-207 (found 10-Nov during the BUG-180 retest), Host admin > Settings > Payment Integration > Cash Payment, Operating Environment Production → Sandbox:
1. The "Confirm Environment Change" window said "Switching to Sandbox will use live Cash Payment keys. Real transactions will be processed…". That is the Production warning: the text only swapped the environment name.
2. "Yes, Change to Sandbox" changed only the dropdown (`confirmModeChange` set local state). The API still returned `payment_mode: production` until Save Configuration was pressed a second time.

## Solution
- **`environmentChangeWarning(toProduction, providerName)`** in `src/config/paymentConfig.ts`:
  - Production keeps the live-keys / real-transactions warning.
  - Sandbox says the method is in test mode and moves no real money.
- **Saving:** `confirmModeChange` now saves straight away with the new mode. `handleSubmit`'s body moved into `saveConfiguration(modeOverride?)`, which Save Configuration also uses. `validate(modeOverride?)` checks the keys of the mode being saved.
- **Missing keys:** a gateway with keys (Stripe, Square, Authorize.Net, Ecrypt) switched to a mode it has no keys for is not saved. The fields show what is missing, as Save Configuration did. Cash Payment and Bank Transfer have no keys, so they save at once.

## Files changed
- `src/config/paymentConfig.ts`: `environmentChangeWarning()`
- `src/pages/settings/components/PaymentMethodConfig/PaymentMethodConfigForm.tsx`: confirm saves; `saveConfiguration()`; `validate(mode)`; warning from the config
- `tests/pages/settings/components/PaymentMethodConfig/PaymentMethodConfigForm.environment.test.tsx`: new (5 tests)
- `e2e/sidebar/settings/payment-integration-setup.spec.ts`: new mocked test

## Testing
- **Vitest**, new file, written first. 3 failed before the change: the Sandbox wording, saving on confirm, and missing keys asked for. The Production warning and Cancel tests already passed. All pass now. `tests/pages/settings/components/PaymentMethodConfig`: 5 files, 23 passed. Full run: see the session report.
- **Playwright mock** (after `npm run build`): `payment-integration-setup.spec.ts` + `invoices.spec.ts`, 21 passed. The new test covers the Cash Payment → Sandbox warning, and confirming sends `POST /common/partner-payment-providers` with `payment_mode: 'sandbox'`.
- `npm run typecheck` clean.

## Open items
- QA checked only Cash Payment. The fix is the same form for every gateway, and Stripe's missing-key case is covered by a test.
- The Production warning still talks about "keys" for Cash Payment and Bank Transfer, which have none. QA didn't report it; left as is.
- `MicroBiltConfigForm.tsx` has its own confirm window. It wasn't part of this bug and wasn't changed.
