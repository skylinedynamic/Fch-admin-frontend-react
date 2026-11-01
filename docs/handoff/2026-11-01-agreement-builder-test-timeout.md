# AgreementBuilder placing-blocks tests: CI timeout

**Date:** 2026-11-01
**Branch:** bugfix/all-bugfix (working tree, not committed)

## Problem
On CI, `tests/pages/settings/components/AgreementBuilder/AgreementBuilder.test.tsx` › *placing blocks* › "keeps adding palette blocks one below the other" failed with `Test timed out in 20000ms`. It passes locally in about 3 s. On the CI runner the whole Vitest run is several times slower (setup 227 s, environment 534 s), and this test went past the 20 s limit. It was slow, not stuck.

Timing the test locally showed where the time went. Each `screen.getByRole('button', { name: ... })` took about 500 ms, because a role query computes the accessible name of every element in the full-screen editor. The test makes three of them: Divider, Spacer and Save Template.

## Solution
The test-only helpers in the *placing blocks* group were changed; the assertions were not.
- `inPalette()` runs the palette queries (Divider, Spacer, Text Block) inside `.ab4-palette` instead of across the whole document.
- `savedTypes()` clicks Save Template with `getByText` instead of `getByRole`.

The test went from about 3.5 s to 1.6 s locally, and the other tests in the group got faster by about the same share.

## Files changed
- `tests/pages/settings/components/AgreementBuilder/AgreementBuilder.test.tsx`: `inPalette()` helper; palette queries in *placing blocks* use it; `savedTypes()` uses `getByText('Save Template')`.

## Testing
- `AgreementBuilder.test.tsx`: 31 passed (46 s, down from 57 s).
- `npm run typecheck`: clean.

## Open items
- The other groups in this file still use `screen.getByRole` across the whole editor. They did not time out on this CI run but take 1–2.5 s each locally; if one times out, scope its queries the same way.
- The 20 s `testTimeout` and `maxWorkers: 4` in `vitest.config.ts` are unchanged.
