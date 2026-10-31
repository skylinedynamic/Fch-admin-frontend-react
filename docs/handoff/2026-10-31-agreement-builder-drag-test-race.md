# Agreement Builder: blocks swapped after opening (flaky drag test on CI)

**Date:** 2026-10-31
**Branch:** bugfix/all-bugfix

## Problem
- **CI failure.** `AgreementBuilder placing blocks > moves a block by dragging its handle onto another block` failed with `expected [ 'header', 'text' ] to deeply equal [ 'text', 'header' ]`. The order was unchanged, so the drop did nothing. The test passes locally.
- **Cause.** Opening the builder works in two steps:
  1. `handleEdit` renders the built-in `partnerBlocks` / `borrowerBlocks`.
  2. Once `useAgreement` resolves, an effect runs `loadSnapshot()`. For a new agreement that is `defaultTemplateFor()`, which gives every block a **new id** (`uid()`).
- **Why it flakes.** React Query notifies outside `act`, so the effect can run after "Save Template" is already visible. On a slow runner the test grabbed the step-1 blocks, the swap removed them from the page, and the drag and drop on those elements reached nothing.
- **Users are affected too.** Anything done to the blocks in that window is thrown away.
- **Related bug.** Reopening the same agreement showed the built-in starter, not the saved agreement. The load effect depended only on `[savedAgreement, editingType]`, and neither changes when the same type is reopened with cached data.

## Solution
`AgreementBuilder/index.tsx` now counts each open of the builder:
- `handleEdit` bumps `openCount`.
- `loadSnapshot()` records `loadedOpen = openCount`.
- The editor shows only when `!loadingAgreement && loadedOpen === openCount`. Until then the existing `AgreementBuilderLoader` shows, so the stale blocks are never on screen.
- The load effect also depends on `openCount`, so every open loads the saved agreement again.

## Files changed
- `src/pages/settings/components/AgreementBuilder/index.tsx`: `openCount` / `loadedOpen`, the loader guard, and the load effect running on every open.
- `tests/pages/settings/components/AgreementBuilder/AgreementBuilder.test.tsx`: new test "shows the saved agreement each time it is opened, not the built-in starter". It failed before the fix, on the reopen. The CI drag test is unchanged and now always sees the final blocks.

## Testing
- `tests/pages/settings/components/AgreementBuilder`: 139 passed, run 3 times in a row.
- Full `npx vitest run`: 324 files, 2346 passed (2 expected fail).
- `npm run typecheck`: clean.
- Playwright `--project=mock` (`agreement-builder.spec.ts`, `partner-configuration.spec.ts`): 13 passed.

## Open items
- The failing CI run had 239 test files and this branch has 324, so it came from another branch, probably `feature/activity-task-assign` or a PR off it. That branch needs this change too, by merging `bugfix/all-bugfix` into it or cherry-picking this fix.
