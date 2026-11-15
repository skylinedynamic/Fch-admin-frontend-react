# Apply Page Form Code: help text matches what an empty field does

**Date:** 2026-11-09

## Problem
SCRUM-435 S435-BUG-03, CMS > Site Settings: the "Apply Page Form Code" help ended "Leave empty for the default." There is no default form. With the field empty, `/apply` shows "The application is not available right now. Please try again later." with no form and no new-tab link. The same happens after a key regeneration, until the new code is pasted.

## Solution
Awlad's decision was to change the help text rather than add a default form. The text now ends:

> If this is empty, the Apply page shows no application form, only a "not available" message. Regenerating the form's key has the same effect until the new code is pasted here.

Behaviour did not change. Two code comments that also promised a default were corrected.

## Files changed
- `src/pages/cms/components/ApplyFormCodeField.tsx`: the help text and the component's comment.
- `tests/pages/cms/components/ApplyFormCodeField.test.tsx`: new.
- `tests/pages/cms/SiteSettings.applyFormCode.test.tsx`: new case for the help text.
- `e2e/sidebar/cms/site-settings/site-settings.spec.ts`: new case for the help text.
- `fch-api/app/Rules/EmbedFormSnippet.php`: comment only.
- `fch-website-react/tests/app/apply/page.test.tsx`: pins the notice shown when there is no code.

## Testing
- **Test-first:** the 2 new Vitest cases and the new E2E case failed before the text changed.
- **Vitest:** `tests/pages/cms`, 32 passed. `npm run typecheck` is clean.
- **Playwright (mock):** `site-settings.spec.ts`, 8 passed with `--workers=1`. An earlier run at the default parallelism had 3 failures in other cases of this file (layout gap, validation errors, reCAPTCHA secret). They passed when rerun serially, so they look load-related, but the cause was not confirmed.
- **Website:** Vitest, 18 passed, and typecheck clean. The new case passed from the start because it pins existing behaviour.
- **fch-api:** `tests/Feature/Website/ApplyFormEmbedCodeTest.php` passed; only a comment changed there.
- The whole suites of these repos were not run.

## Open items
- **AC 2 and 4 are still at risk:** SCRUM-435 expects a working application on the page. An emptied field or a regenerated key still leaves `/apply` with no form, and the help text only warns about it. QA may reopen the bug on those grounds, so this should be confirmed with Craig.
- Not committed.
