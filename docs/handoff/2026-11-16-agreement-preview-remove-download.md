# Agreement Builder preview: Download PDF removed

**Date:** 2026-11-16
**Branch:** feature/agreement-builder-modification
**Author:** Awlad Hossain (with Claude Code)

## Problem
The partner and borrower Agreement Builder preview had a **Download PDF** button. It printed the live preview iframe (`contentWindow.print()`), so the PDF came out badly:
- editing marks were included: merge-field highlights, the "YOUR LOGO" placeholder, the "Sign here" tag, "Select date", and the required `*` marks;
- the preview's fixed-height pages left gaps in the middle of pages;
- there were no page numbers.

## Solution
The button was removed instead of redesigned, as asked. The preview bar now shows only the title, the live indicator and the block count.

The `@media print` rules in `PREVIEW_CSS` stay. They are saved into every template's HTML and may still apply when a signed agreement is printed elsewhere.

## Files changed
- `src/pages/settings/components/AgreementBuilder/index.tsx`: removed the button, `previewRef` and the unused `useRef` import.

## Testing
- `tests/pages/settings/components/AgreementBuilder/AgreementBuilder.test.tsx`: new test, "the preview has no Download PDF button", red before green. The AgreementBuilder folder passes: **173 passed**.
- `e2e/sidebar/settings/agreement-builder.spec.ts`: new test, same check. The spec passes: **14 passed**.
- `npm run typecheck`: clean.
- Full Vitest: 3313 passed and 1 failed. The failure was `FundingRequestStep.paths.test.tsx`, which timed out under load; run alone it passes (48 passed). It's unrelated to this change.

## Open items
- None. The signed-agreement download (Partner › Agreement tab) is a separate, server-built PDF and is unchanged.
