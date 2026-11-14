# BUG-181: Add Resource opens Unpublished; missing link / document refused by the API

**Date:** 2026-11-06

## Problem
On Resources → Manage Resources → + Add Resource:
- **Publish Status was on by default.** A half-filled resource went live for partners and clients as soon as it was saved.
- **Required fields were not enforced.** A Training Academy item saved without its Resource Link. An empty form showed only the title error.

## Solution
- `ResourceForm.tsx`: a new resource starts with `status: false` (Unpublished). This applies both when the form opens and when the type is changed, which resets the form. Edit still shows the saved status.
- **Validation is server-side** (fch-api, `2026-11-06-bug-181-resource-link-or-document-required.md`):
  - Training Academy needs a link.
  - Legal & Registration, Download Assets and Education & Help need a document.
  - The form already shows the API's field errors under Resource Link / Resource Document, all at once.

## Files changed
- `src/pages/resources/ResourceForm.tsx`: Unpublished default in two places.
- `tests/pages/resources/ResourceForm.test.tsx` (new), 2 tests:
  - opens Unpublished and posts `status: 0`
  - shows the title and link errors together
- `e2e/sidebar/resources/resource-form-validation.live.spec.ts` (new): real API check for Training Academy. It starts Unpublished, an empty save marks title and link, and a title alone is refused for the link. Nothing is created.

## Testing
- `ResourceForm.test.tsx`: the Unpublished test failed first (the form showed Published), then passed. The error-display test passed before the change; it is a characterisation test, because the form already rendered API field errors.
- `tests/pages/resources` + `tests/modules/resource`: 23 passed. `npm run typecheck` is clean.
- Mocked E2E `e2e/sidebar/resources/`: 47 passed.
- Live E2E (`E2E_BASE_URL=http://localhost:5174 npx playwright test --project=live e2e/sidebar/resources/`): 4/4 passed.

## Open items
- No client-side pre-check. Errors come from the API on Save; the server is the single source, as requested.
- `src/utils/resourceConfig.ts` duplicates fch-api's type lists. `TYPES_REQUIRING_LINK` there still includes `business_services` for the form layout, but that form hides the link field for that type.
- Not committed.
