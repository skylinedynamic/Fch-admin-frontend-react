# AgreementBuilder tests: CI timeouts

**Date:** 2026-11-01
**Branch:** bugfix/all-bugfix (working tree, not committed)

## Problem
On CI, tests in `tests/pages/settings/components/AgreementBuilder/AgreementBuilder.test.tsx` failed with `Test timed out in 20000ms`. One run failed *placing blocks* › "keeps adding palette blocks one below the other"; the next failed *safety nets* › "undoes and redoes changes". Locally they pass in about 3 s. The CI runner is several times slower (setup 230 s, environment 650 s per run), so whichever test was slowest that run went past 20 s. The tests were slow, not stuck.

Timing each step locally showed where the time went. Every `screen.getByRole(...)` / `findByRole(...)` took about 500 ms, because a role query on the whole document works out the role and accessible name of every element of the full-screen editor. `openBuilder()` alone took 1.5 s, because it waited with `findByRole('button', { name: 'Save Template' })`, which repeats that scan on every poll.

## Solution
Only the test queries changed; no assertion did.
- `openBuilder()` waits for the editor with `findByText('Save Template')`.
- A `toolbar()` helper (`within('.ab4-toolbar')`) is used for the toolbar controls everywhere in the file: Close editor, Undo, Redo, Preview, Templates, Clear All and Save Template (27 queries).
- `inPalette()` (`within('.ab4-palette')`) is used for the palette items (Divider, Spacer, Text Block) in *placing blocks*.

A first attempt that skipped the visibility check (`configure({ defaultHidden: true })`) made no difference and was dropped.

## Files changed
- `tests/pages/settings/components/AgreementBuilder/AgreementBuilder.test.tsx`: `openBuilder()` waits with `findByText`; new `toolbar()` and `inPalette()` helpers, used by the toolbar and palette queries.

## Testing
Local run of `AgreementBuilder.test.tsx`: 31 passed.

| | Before | After |
|---|---|---|
| Whole file | 57 s | 22 s |
| "undoes and redoes changes" | 3.1 s | 0.8 s |
| "keeps adding palette blocks one below the other" | 3.5 s | 1.0 s |
| Slowest test | 3.5 s | 1.4 s |

`npm run typecheck`: clean.

## Open items
- 24 role queries on the whole document remain: dialogs, alert dialogs, "Add your logo", and the mocked dashboard's Edit buttons. With the slowest test now at 1.4 s locally they are well inside the timeout. If one times out on CI again, scope it the same way.
- The 20 s `testTimeout` and `maxWorkers: 4` in `vitest.config.ts` are unchanged.
- Not yet run on CI.
