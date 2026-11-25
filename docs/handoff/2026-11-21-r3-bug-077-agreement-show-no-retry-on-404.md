# R3-BUG-077: agreement editor asks twice for a template that doesn't exist yet

2026-11-21

## Problem
Opening Partner › Configuration › Agreement › Edit Agreement (or Settings › Agreement Builder) for a partner with no template yet sent `POST common/agreement-templates/show` **twice**. The backend answered with an error. The app's default query option `retry: 1` retried it as if it were a failure. (QA Round 3, R3-BUG-077; the backend side, a 500 that is now a 404, is in fch-api's handoff of the same date.)

## Solution
`useAgreement` (`src/modules/agreement/queries.ts`) doesn't retry a 404, which here means "no template yet". Any other failure is still retried once, like the app default. The builder already opens on the default (master) layout when the query has no data, so nothing else changed.

## Files changed
- `src/modules/agreement/queries.ts`: `retry` on `useAgreement` skips 404.
- `tests/modules/agreement/queries.test.tsx`: with the app's own `retry: 1`, a 404 is asked once and a 500 is asked twice.
- `tests/pages/settings/components/AgreementBuilder/AgreementBuilder.test.tsx`: `openBuilder` takes an optional show response. New test: a 404 opens the master partner agreement. This is a characterization test, because that already worked.

## Testing
- The 404-asked-once test failed first (2 calls), then passed.
- Agreement module, AgreementBuilder and PartnerConfigurationSection tests: 17 files, 288 tests passed. `npm run typecheck` is clean.

## Open items
- Deploy with the fch-api change. With the old API (500), the call is still retried once, but the editor still opens.
