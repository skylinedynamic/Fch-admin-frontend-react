# Embed Form — Convert modal says clearly whether the client exists

**Date:** 2026-10-23
**Branch:** `hotfix` (uncommitted)

## Problem
Embed Form › Loan Applications › Convert to Free Plan Borrower opened a confirmation modal with two problems:
- It always showed the "new free-plan borrower" text first. Only after Confirm did the API return 409 and the modal flip to "Existing Borrower Found", so the first message could be wrong.
- The existing-borrower warning was a plain alert. The new-client case had no notice at all. Neither said that a **new funding application will be generated**.

## Solution
- When it opens, the modal asks the new `GET /common/embed-forms/submissions/{id}/conversion-preview` (fch-api). It shows "Checking if this client already exists…" until the answer arrives, and only then offers Confirm.
- **Client exists**:
  - Title "Existing Client Found".
  - A heavy yellow banner reading "This client already exists", stating that no new client account will be created.
  - The client's details below.
  - Button "Use Existing Client & Create Funding Application". It sends `confirm_existing_borrower: true`.
- **No client**:
  - Title "Create New Client".
  - A heavy blue banner reading "No existing client found", stating that a new client will be created on the free plan.
  - Button "Create Client & Funding Application".
- Both banners carry the line **"A new funding application will be generated for this client."**
- **Preview refused (422)**: the API message shows in a red alert and there is no Confirm.
- **The 409 path is kept**: if a client appears after the preview, the page passes the reported borrower in and the modal switches to the existing-client banner.
- The modal was converted from `.jsx` to `.tsx`, and the banners live in their own component. Modal corners stay 4px (`--ef-radius`).
- Mockup: https://claude.ai/artifact/DbTHfzykqa4FzFH8J7NaNU

## Files changed
- `src/modules/embed-form/types.ts`: new. `CONVERSION_MODE`, `ConversionPreview`, `ExistingBorrowerSummary`.
- `src/modules/embed-form/services.ts`: `fetchConversionPreview()`.
- `src/modules/embed-form/queries.ts`: new. `useConversionPreview()` (fresh each open, no retry).
- `src/modules/embed-form/index.ts`: new barrel.
- `src/lib/query/queryKeys.ts`: `embedForm.conversionPreview`.
- `src/pages/embed-form/components/EmbedFormConvertModal.tsx`: replaces `EmbedFormConvertModal.jsx`. Preview-driven states and new copy.
- `src/pages/embed-form/components/ConvertClientNotice.tsx`: new. The existing/new banners.
- `assets/css/custom.css`: `.ef-convert-notice*`, `.ef-convert-modal__details*`, and header icon colours per state.
- `tests/modules/embed-form/services.test.ts`: preview mapping tests.
- `tests/pages/embed-form/components/EmbedFormConvertModal.test.tsx`: new, 6 tests.
- `e2e/embed-form-convert-existing-borrower.spec.ts`, `e2e/sidebar/embedded-form/loan-applications/loan-applications.spec.ts`: preview-first flow, new copy, and the 409 race kept.

## Testing
- Vitest:
  - `tests/modules/embed-form` + `tests/pages/embed-form`: 37 passed
  - full suite: **207 files, 1518 passed** (+2 expected fail)
  - the new modal and service tests were red before the code existed
- `npm run typecheck`: clean.
- Playwright (`--project=mock`, after `npm run build`, with `E2E_BASE_URL=` so it serves the fresh build on :4174): the two specs above, **28 passed**.

## Open items
- Backend change: fch-api `docs/handoff/2026-10-23-embed-form-conversion-preview.md`. Deploy the API first, or the modal shows the preview error.
- Local E2E gotchas:
  - `.env.e2e` points at a dev server on :5174.
  - `webServer` runs `npm run preview` on whatever is in `dist/`, so build first.
- Not committed.
