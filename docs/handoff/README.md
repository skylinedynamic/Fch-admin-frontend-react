# Handoffs

One file per finished piece of work — a feature, a change or a bug fix — so whoever picks it up next knows what was wrong, what was done and what is left.

**File name:** `YYYY-MM-DD-short-title.md` (date the work was finished, kebab-case title), e.g. `2026-10-12-payment-form-validation.md`.

## Template

```markdown
# <Title>

**Date:** YYYY-MM-DD
**Branch:** <branch>
**Author:** <name>

## Problem
What was wrong or missing, and how it showed up (which screen, who was affected, what they saw).

## Solution
What was changed and why this approach. Note any behaviour change a user will notice, and any API change in fch-api it depends on.

## Files changed
- `src/path/to/file.tsx` — one line on what changed

## Tests
- Added: `tests/.../thing.test.tsx` — what it pins
- Updated: `tests/.../other.test.tsx` — what changed in the expectation
- E2E: `e2e/...spec.ts` — added/updated, or why not needed
- Run: `npm test` / `npm run test:e2e` / `npm run typecheck` — result

## Open / follow-up
Anything not done, decisions waiting, and actions for someone outside the code.
```
