# Client › Documents tab: one table grouped by category

2026-10-29

## Problem
The client's Documents tab (Clients › a client › Documents) was a flat table of every file, with the category as one column. It didn't show which required categories were missing, rejected or still in review, and adding a file always went through the "Select Document Type" dialog.

## Solution
After two design passes, the user chose **one table grouped by category**. A card layout was tried first and dropped.

**Header**
- Title and Add Document sit on one line.
- Under them, a summary: "x of N required categories complete" with a bar, and Accepted / In review / Rejected counts.

**Table**
- Columns: File Name, Doc No., Size, Uploaded, Status, and an unlabelled actions column. Fixed layout, so it fits the tab's width without a sideways scroll above ~640px.
- **Each category is a `tbody` with a light header row.** The row shows a coloured state dot, the name (a fold toggle), a Required / Optional tag and the file count. Its state ("Accepted", "In review", "Re-upload needed", "Missing") sits under Status, and an Upload icon button sits under actions. Upload opens the file manager straight into that category.
- **Then one row per file:** name (download link) with the rejection reason under it, doc number, size, date, the file's review badge, and the existing actions menu (Download, Delete, status changes).

**Order**
- Every required category comes first, even when empty ("No file uploaded yet for this required category.").
- Then optional categories that have files.
- Then files whose category is unknown, under "Other documents".
- Empty optional categories are not shown (third pass, below).

**Rules**
- The category state uses the same rule as the client portal (BUG-135): any accepted file means accepted; a file that isn't rejected means in review; only rejected files means re-upload.
- Required categories come from the API's new `is_required` on `common/borrower-document-types` (fch-api, same date), so there is no second list here.

**Third pass ("still not good", seen with a client who has no documents).**
- **Empty categories:** a missing category is its header row alone. There is no "No file uploaded yet" filler row and no "0 files".
- **Summary:** only the non-zero Accepted / In review / Rejected counts show.
- **Optional chips:** the "Other categories, no files yet" chips are gone. Add Document already offers every category.
- **No documents at all:** one empty state ("No documents uploaded yet") replaces the table, with the required documents as tiles that upload straight into their category.

**Fourth pass ("border design looks not good").** The table had a line round every row, plus boxed tags and boxed Upload buttons.
- **No lines between cells.** Each category is its own block: a 10px gap above it, a light band, and a 3px edge on the left in its state's colour (green, amber, red, grey). The edge replaces the small dot.
- **File rows** are white, with a hairline only between two files of the same category, and a light hover.
- **No boxes:** the Required tag is a soft brand-tinted label, Optional is plain muted text, and Upload is a borderless icon that fills with the brand colour on hover. Missing is plain muted text.
- **Column headings** are small uppercase muted text over a single line.
- **Summary counts** are a coloured dot plus text, not boxed chips.

**Fifth pass: the empty state, the Add Document button and its modal.**
- **Theme colour:** Add Document was a `btn-secondary` with a fixed `#405189` inline style. It is now a plain `btn btn-primary`, which follows the partner's branding (`--vz-primary`).
  - Every fixed `rgba(64, 81, 137, …)` in `ClientDocuments.css` now reads `--cdoc-brand-rgb`, which is `--vz-primary-rgb`.
- **Empty state:** a dashed panel lightly tinted with the primary colour. The required documents are white tiles in two columns (one on phones), each with an upload icon, the name, "Required · Not uploaded" and an arrow. On hover the border and icon take the primary colour.
- **Add Document modal:**
  - A header with an icon, the title and one line of help.
  - **"Document type" is the app's own `CustomDropdown` (searchable)**, not a native `<select>`.
  - A "Choose files" area in the primary colour opens the file manager.
  - A Cancel button in the footer.
  - The dialog is labelled "Add Document" (`labelledBy`).

**Fix: a dotted line through the column titles.** The card body has no padding (`p-0`), so Velzon's `.table-card` (`margin: -1rem`) pulled the table 16px up, under the card header's dashed border. The wrapper no longer has `table-card`; `ClientDocuments.css` gives the first and last columns the 16px edge it used to add. E2E: "the table starts under the card header, not over its dashed line" (red first: the thead started 3.5px above the header's bottom).

## Files changed
- `src/utils/documentCategories.ts` (new): `groupDocumentsByCategory`, `categoryState`, `isCategoryDone`, and the `ClientDocument` / `ClientDocumentType` types. Category names are matched loosely (case, curly apostrophe).
- `src/pages/clients/components/documents/DocumentCategoryTable.tsx` (new): the grouped table, with folding. The state dot was dropped in the fourth pass.
- `src/pages/clients/components/documents/ClientDocuments.css` (new): its styles.
- `src/pages/clients/components/ClientDocumentsSection.tsx`: header and summary, the grouped table instead of the flat one, per-category upload (`uploadInto`), and the actions menu moved into `renderActions`. Modals and permissions are unchanged.

## Testing
- `tests/utils/documentCategories.test.ts` (new, 6 tests). Red first: the module didn't exist.
- `tests/pages/clients/components/ClientDocumentsSection.test.tsx` (new, 8 tests), with MSW and the file manager stubbed.
  - Files under their own category.
  - Required / Optional and each state.
  - The summary.
  - Per-category upload posts `document_type_id`.
  - Only non-zero counts in the summary.
  - Empty optional categories are left out.
  - The empty state, whose tiles upload into their category.
  - Folding a category.

  Red first against the flat table.
- E2E:
  - `e2e/sidebar/clients/client-documents.spec.ts` (new, 5 tests): groups, states and order; summary, with empty optional categories left out; the empty state and its upload tiles; Upload opens the file manager; status actions still post.
  - `e2e/sidebar/clients/client-profile-tabs.spec.ts`: the list test now expects the file under its category's group (it read the old Document Type column), and the empty-state test reads "No documents uploaded yet". Its other document tests are unchanged.
  - Fourth pass: `client-documents.spec.ts` "sets each category apart as its own block, without boxes inside it" checks the 10px gap, the state-coloured edge, and no border on the Upload button, the tag or the file rows. It was red against the boxed table.
  - Fifth pass, red first:
    - Vitest: "is a primary button in the theme's colour, not a fixed one", and "picks the category from the custom select, then uploads into it" (posts `document_type_id: 4`).
    - E2E: "Add Document picks the category from the custom select and opens the file manager".
    - The empty-state test now reads each tile's name from `.cdoc-empty-item-name`, since the tile also says "Required · Not uploaded".
  - Both specs: 38 passed. `ClientDocumentsSection.test.tsx`: 10 passed. `npm run typecheck`: clean.
- Run:
  - `tests/pages/clients`, `tests/utils`, `tests/modules/client`: 242 passed before the table pass; the two files above pass after it.
  - `npm run typecheck`: clean.
  - Checked visually at the tab's width.

## Open items
- The full `e2e/sidebar/clients` run still has the pre-existing E2E-015 (clients-list partner filter) failing.
