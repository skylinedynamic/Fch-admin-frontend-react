# R3-BUG-015: the SEO title counts its characters and stops at 120

Date: 2026-11-14

## Problem

CMS › SEO Settings (Add and Edit, both `SeoSettingEdit.tsx`). The SEO Title field had no counter and no `maxLength`. Any length could be typed and saved (the API allowed 255); only the preview grew.

## Solution

- **Counter and limit.** Under the field, a counter shows "used / 120". The input has `maxLength` 120. The limit is 120 as the product owner chose (QA's sheet suggested 60).
- **An older long title** (saved before the limit) is shown with a red counter and the note "This title is over the 120-character limit. Shorten it to change it." It still saves unchanged, because the API keeps it while it is not changed.
- **The API's 422** for the title shows under the field.
- **Suggested title.** Picking a page suggested `<page> | Four Corner Funding`, which can go past the limit for a very long blog title. `suggestSeoTitle()` drops the brand when it doesn't fit and cuts at 120.
- **Constants** live in `src/config/seo.ts`: `SEO_META_TITLE_MAX_LENGTH`, `SEO_TITLE_BRAND_SUFFIX`, `suggestSeoTitle`. 120 matches `SeoSetting::META_TITLE_MAX_LENGTH` in fch-api.

## Files changed

- `src/config/seo.ts` (new): the limit, the brand suffix, `suggestSeoTitle`.
- `src/pages/cms/SeoSettingEdit.tsx`: the counter, `maxLength`, the over-limit note, the suggestion.
- `tests/config/seo.test.ts` (new, 3): the suggestion with the brand, without it, and cut at 120.
- `tests/pages/cms/SeoSettingEdit.titleLength.test.tsx` (new, 6):
  - the limit is 120
  - the counter and `maxLength`
  - an older long title is flagged and saves unchanged
  - the API's refusal is shown
  - the suggestion for a long and a short page name
- `e2e/sidebar/cms/seo-settings/seo-settings.spec.ts`: a 125-character title is stopped at 120, the counter reads 120 / 120, and 120 characters are posted.

## Testing

- **Seen failing first:** 3 page tests (counter, older title, long suggestion) and 1 config test; again 4 after the limit moved from 60 to 120.
- **Full Vitest suite:** 434 files, 3,229 passed (2 expected fail).
- **`npm run typecheck`:** clean.
- **Mock E2E `seo-settings.spec.ts`:** 24 passed, 2 failed. The 2 failures ("Blog categories/tags › deletes after accepting the browser confirm") fail the same way without this change.

## Open items

- **The 2 blog delete E2E failures** are older and not part of this bug.
- **Blog SEO title** has no limit yet (`BlogEdit`), and neither does the meta description.
