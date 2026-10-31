# Agreement Builder: flaky starting-template test on CI

**Date:** 2026-10-31
**Branch:** bugfix/all-bugfix

## Problem
CI failed on `AgreementBuilder starting templates > starts a new borrower agreement from the client enrollment agreement` with "Unable to find an element with the text: BUSINESS CREDIT BUILDER & FUNDING PROGRAM". The same test passed locally.

A block's text is not in its markup. `BlockComponents.tsx` writes it into the element in a `useEffect` (`ref.current.innerHTML = ...`), which runs after the blocks render. The test waited only for the "Save Template" button, then checked the text once with `getByText`. The client enrollment agreement has hundreds of blocks, and on a slow runner the check came before those effects had run. The CI snapshot shows "Clear All" enabled, so the blocks were loaded but their text was not written yet. Users are not affected. It is a timing gap in the test.

## Solution
The three assertions that read template text right after opening the builder now wait for it with `await screen.findByText(...)`. The expected text is unchanged.

## Files changed
- `tests/pages/settings/components/AgreementBuilder/AgreementBuilder.test.tsx`: the partner and borrower starting-template tests and the Clear All "Cancel keeps it" test use `findByText` for the first template heading.

## Testing
- `AgreementBuilder.test.tsx` was run 3 times in a row: 30/30 passed each time.
- `npm run typecheck` passes.
- Full Vitest suite before this change: 310 files, 2258 passed (2 expected fail).

## Open items
- The failing CI run had 232 test files, so it was not this branch (310). If it came from `agreement-in-config` or a PR off it, that branch needs the same test change.
