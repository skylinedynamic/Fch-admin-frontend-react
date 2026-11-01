# Commission payout: choose the environment (Sandbox / Production)

**Date:** 2026-11-01
**Branch:** bugfix/all-bugfix (working tree, not committed)

## Problem
A commission payout records a payment, but it goes through no gateway, so nothing said which environment that payment was in. fch-api guessed from the partner's Stripe mode, and real payouts could be filed under Sandbox. The API change that makes every payment carry its environment is in `fch-api/docs/handoff/2026-11-01-payment-environment-from-method-used.md`.

## Solution
The Process Payout dialog (Commission Details › Make Payment) has a required **Environment** dropdown (Sandbox / Production). It starts on `payout.default_environment` from the API: Production only on the production app (`APP_ENV=production`), Sandbox everywhere else. The frontend cannot tell stage from production itself, because both run `vite build`. The choice is sent as `environment` with the payout.

## Files changed
- `src/config/paymentEnvironment.ts` (new): `PAYMENT_ENVIRONMENT`, `PaymentEnvironment`, `PAYMENT_ENVIRONMENT_OPTIONS`.
- `src/modules/commission/types.ts`: `CommissionPayout.default_environment`, `ProcessPayoutPayload.environment`.
- `src/pages/commissions/PayoutModal.tsx`: Environment dropdown; `onConfirm(method, note, environment)`.
- `src/pages/commissions/components/PayoutSection.tsx`: sends `environment`.
- `tests/pages/commissions/PayoutSection.environment.test.tsx` (new): starts on the suggested environment, sends it unchanged, and sends a changed one.
- `tests/modules/commission/services.test.ts`: payload includes `environment`.
- `e2e/sidebar/commissions/commission-details.spec.ts`: the existing payout test expects `environment: 'sandbox'`; a new test starts on Production, picks Sandbox and checks the request.

## Testing
- The new Vitest tests failed before the change (no dropdown, no `environment` sent), then passed.
- Vitest `tests/pages/commissions` and `tests/modules/commission`: 34 passed.
- `npm run typecheck`: clean.
- Playwright (mock, after `npm run build`), `e2e/sidebar/commissions` and `e2e/sidebar/payments` with `--workers=1`: 43 passed. With several workers the machine ran out of memory, so the run was not a test failure.

## Open items
- Not committed. Deploy together with the fch-api change, because the API now requires `environment`, so an old frontend gets a 422 on payout.
