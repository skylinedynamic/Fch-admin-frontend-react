# Credit score server errors — E2E

**Date:** 2026-10-15 · **Branch:** `bugfix/all-bugfix` (uncommitted)

## Problem
`fch-backend-api` now validates typed-in credit scores (FICO: whole number 300–850; business credit score: whole number of 0 or more) — see its `docs/handoff/2026-10-15-credit-score-validation.md`. Validation is server-side only, so the admin portal needs proof that the real API's refusal reaches the field the user typed in.

## Solution
No portal source changed: the Client › Business Financials section and the Credit Account form already put a 422's field errors under each field. Two live specs added, each sending an invalid score to the real API and checking nothing is saved.

## Files changed
- `e2e/sidebar/clients/client-credit-scores.live.spec.ts` (new) — first client › Business Financials: FICO 900 and business score 12.5 are refused, both messages shown on `#fico_score` / `#paydex_score`, values unchanged after reload.
- `e2e/sidebar/credit-builder/credit-accounts/credit-account-fico-error.live.spec.ts` (new) — first credit account: typical FICO minimum 0 is refused, message shown on the field, value unchanged after reload.

## Testing
Not run — the user will run all suites together. Run with `npm run build` first (the config only previews), then `npx playwright test <the two specs> --project=setup --project=live`.

## Open items
- Both specs use the first row of their list; if that client/account already holds other invalid data, the 422 lists more fields — the specs only assert their own.
