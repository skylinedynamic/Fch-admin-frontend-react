# Business Insights › Export PDF: a menu of the summary and details reports

Date: 2026-11-15

## Problem

On Business Insights (`/owner-summary`), "Export PDF" called `window.print()`. That printed the page as the browser drew it, so there was no real report. The owner wanted:
- a dropdown with a **summary report** (one page) and a **details report**
- both well designed and professional

## Solution

- **`ExportPdfMenu`** replaces the print button. It is an accessible menu button (`aria-haspopup="menu"`), listing:
  - **Summary report:** "One page: the headline figures and net earnings by stream."
  - **Details report:** "Every section in full: money, pipeline, lead sources, partners and every stalled deal."
- **Menu behaviour:**
  - closes on Escape or a click outside
  - arrow keys move between the items
  - fits a phone
- **Choosing a report:**
  - It calls `GET /common/owner-summary/export` (fch-api, same date) with the period and payments on screen.
  - It saves the PDF under the name the API gives (`downloadBlob`).
  - While it is made, the button shows a spinner and is disabled.
  - On failure, it toasts "The report could not be made. Please try again."
- **Data layer:**
  - `modules/owner-summary`: `exportOwnerSummaryPdf()` (blob plus file name from `Content-Disposition`), `useExportOwnerSummaryPdf()`, and the types.
  - `config/ownerSummary.ts`: `OWNER_SUMMARY_EXPORT_TYPE`, `OWNER_SUMMARY_EXPORT_OPTIONS`, `OWNER_SUMMARY_EXPORT_FAILED`.

## Files changed

- `src/pages/owner-summary/components/ExportPdfMenu.tsx` (new).
- `src/pages/owner-summary/OwnerSummary.tsx`: uses the menu instead of `window.print()`.
- `src/pages/owner-summary/ownerSummary.css`: the menu styles and the disabled button.
- `src/modules/owner-summary/services.ts`, `queries.ts`, `types.ts`: the export.
- `src/config/ownerSummary.ts`: the export types, options and message.
- **Tests:**
  - `tests/modules/owner-summary/services.test.ts`: +2 (the request and its file name; a name of its own when none is sent)
  - `tests/pages/owner-summary/OwnerSummary.export.test.tsx` (new, 5): both reports offered and never printed; summary download with the screen's params; details with the period and payments chosen; the error toast; Escape
  - `tests/pages/owner-summary/OwnerSummary.test.tsx`: the old "exports by printing the page" test was removed (the behaviour is gone) and points to the new file
  - `e2e/sidebar/owner-summary/owner-summary.spec.ts`: +2 (a real download with the right name and params; the menu fits a phone)

## Testing

- **Seen failing first:** the 2 service tests and the 5 page tests.
- **`tests/pages/owner-summary`, `tests/modules/owner-summary`:** 73 passed, 1 failed. The failure ("says which period is showing and what it is compared with") fails the same way without this change; it predates this work.
- **Full Vitest suite:** 3,279 passed, 1 failed (the same older test).
- **`npm run typecheck`:** clean.
- **Mock E2E `owner-summary.spec.ts`:** 17 passed.

## Open items

- **The older failing test** "says which period is showing…" needs a look of its own.
