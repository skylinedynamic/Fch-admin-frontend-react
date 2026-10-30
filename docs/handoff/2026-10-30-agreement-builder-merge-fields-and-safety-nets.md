# Agreement Builder — merge fields, full-screen editing, undo/redo, drag-and-drop, new blocks and starter templates

2026-10-30

## Problem
- **No way to pull in real details.** The builder had no way to insert the signer's or the company's details. The starter template used literal placeholders (`[Customer Full Name]`, a made-up lender), which every borrower retyped or which stayed in signed agreements.
- **The page was cut off under Settings.** Under Settings › Agreement Builder the editor sat beside the settings menu, so the A4 page was cut off on the right (the same problem the partner profile had; see `2026-10-30-partner-agreement-builder-full-screen.md`).
- **No safety nets.** There was no undo. "Clear All" emptied the agreement at once. Closing the editor dropped unsaved work without asking, and nothing showed whether there were unsaved changes.
- **Flash on open.** Opening an agreement briefly showed the builder with the wrong blocks before the loader, because `isLoading` is false before the fetch starts.
- **Placing blocks was slow.** Palette items always went to the very end of the agreement, and blocks moved only one step at a time with the arrow buttons.
- **Few block types.** There were no heading, list or table blocks; headings were text blocks styled by hand.
- **No starting points.** The only starting point was the built-in loan template.

## Solution
- **Insert field** (text blocks): a menu of merge fields (`src/config/agreementMergeFields.ts`, the same list as fch-api `AgreementMergeFields::KEYS`).
  - The field goes in at the cursor; with no cursor, it goes at the end of the selected text block.
  - In the canvas a field shows as a labelled chip ("Signer's name") that can't be half-deleted (`mergeChips.ts`). The saved content keeps the bare `{{signer.name}}`.
  - A field typed by hand becomes a chip when the text is left.
  - The text block now also shows content changed from outside the editor (the menu, undo).
- **Preview** shows fields with example details, marked with a dashed underline (`withMergeSamples`). This is only the preview; the saved HTML keeps the fields.
- **The starter template** uses merge fields for both parties.
- **Full screen everywhere:** the editor opens full screen under Settings as well (dialog named "Partner agreement" / "Borrower agreement"; the partner profile keeps "Acme's borrower agreement").
- **Undo/redo** (`useBuilderHistory`):
  - toolbar buttons, Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y;
  - inside text the browser's own undo applies instead;
  - quick successive changes count as one step, up to 100 steps;
  - history starts when the agreement loads.
- **Save state:** an "Unsaved changes" or "All changes saved" pill next to the title. The save button shows a spinner while saving.
- **Confirm dialog** (`ConfirmDialog`, the builder's own and not `window.confirm`) for Clear All and for closing with unsaved changes. Escape or the backdrop cancels.
- **No flash on open:** loading uses `isPending`.
- **Placing blocks:**
  - Clicking a palette item adds it below the selected block (or at the end when none is selected).
  - Palette items can be dragged onto the page, and every block has a drag handle (⠿).
  - Dropping on the upper or lower half of a block places it before or after that block. Dropping on the gap between blocks places it there; while dragging, those 0px gaps get a 20px hit area (`.ab4-root--dragging`).
  - One blue marker shows where the drop will land. It is kept in one shared place (`DropTargetContext`) and cleared only when the drag ends, because Chrome gives `dragleave` no `relatedTarget`.
  - Drag and drop is for top-level blocks; blocks inside a Parties row keep their arrows. `moveBlock()` in `utils.ts` does the reorder.
  - The block action buttons now have accessible names (Drag to move, Move up, Move down, Delete block).
- **Palette selection fix:** clicking a palette item no longer reaches the palette's "clear selection" handler. The added block stays selected, so the next one goes below it; before, only the first click went below the selection.
- **New blocks:**
  - Heading, Bulleted List, Numbered List and Table are text-block presets (`TEXT_PRESETS` in `utils.ts`), so they edit, paginate, take merge fields and sign like any text block. The server needs no change.
  - A table's cells are edited in the canvas. "Table" controls (`TableControls.tsx`: Rows +/−, Columns +/−) appear for a text block holding a table, using `addTableRow`/`removeTableRow`/`addTableColumn`/`removeTableColumn`; at least one row and one column are always kept.
  - List and table styles are in `PREVIEW_CSS`, so the preview, the signed record and the PDF match the canvas.
  - Palette icons are `aria-hidden`, so button names no longer start with an icon-font glyph.
- **Starter templates:** a "Templates" button opens "Start from a template" (`StarterTemplatesDialog`, `starterTemplates.ts`) with four choices: Business funding agreement (a complete multi-page agreement: logo, a parties row and client/company detail tables built from merge fields, 13 numbered sections with lists, a page break, two required consent boxes, a signed-by table and a required signature), Master loan agreement, Terms acknowledgement (merge fields, list, required consent box, signature) and Blank page. A template replaces the page and can be undone.
- **Typing right after opening (found by the new E2E):** the "Page limit reached" guard refused typing during the first ~0.5–1.2 s, before pagination had run and while every block still sat on page one. The guard now lets typing in when the other blocks alone already overfill the page (the page has not been paginated yet). It still refuses typing that itself pushes a page past A4.
- **Design:** new styles in `assets/css/agreement-builder.css` (Insert field menu, chips, pill, history buttons, dialog). Checked with screenshots at 1600×900.

## Files changed
- `src/config/agreementMergeFields.ts`: new; fields, labels, preview samples.
- `src/pages/settings/components/AgreementBuilder/InsertFieldMenu.tsx`, `mergeChips.ts`, `useBuilderHistory.ts`, `ConfirmDialog.tsx`: new.
- `src/pages/settings/components/AgreementBuilder/index.tsx`: full screen everywhere; history; dirty tracking; toolbar; confirm dialogs; `isPending`.
- `src/pages/settings/components/AgreementBuilder/BlockComponents.tsx`: chips in text blocks; external content sync; drag handle, drop targets on blocks and gaps (`DropTargetContext`); page-limit guard fix.
- `src/pages/settings/components/AgreementBuilder/PropertyPanel.tsx`: Insert field menu on text blocks.
- `src/pages/settings/components/AgreementBuilder/utils.ts`: `withMergeSamples`, `moveBlock`; starter template uses merge fields.
- `src/pages/settings/components/AgreementBuilder/TableControls.tsx`, `StarterTemplatesDialog.tsx`, `starterTemplates.ts`: new.
- `utils.ts` also: palette items for the new blocks, `TEXT_PRESETS`, table row/column helpers, list/table CSS in `PREVIEW_CSS`.
- `e2e/sidebar/settings/agreement-builder.spec.ts`: new real-browser spec.
- `assets/css/agreement-builder.css`: styles above.
- `docs/e2e/ISSUES.md`: E2E-019 (pre-existing settings spec failures; see Testing). Logged as E2E-014 on its branch, renumbered at the merge into `bugfix/all-bugfix`, where E2E-014 was already taken.

## Testing
- Unit: `tests/pages/settings/components/AgreementBuilder/mergeChips.test.tsx` (5: chips, unknown fields, round trip, editor shows chips and saves bare fields, outside changes shown).
- Integration: `tests/pages/settings/components/AgreementBuilder/PropertyPanel.mergeFields.test.tsx` (3: the field list, at cursor, at end).
- Integration: `tests/pages/settings/components/AgreementBuilder/AgreementBuilder.test.tsx`. Updated: Settings now opens full screen. Added: starter template uses merge fields; preview samples; Clear All asks; undo/redo; save state; close asks only with unsaved changes.
- Unit: `tests/pages/settings/components/AgreementBuilder/utils.test.ts`, +4 (`moveBlock`).
- Unit: `tests/pages/settings/components/AgreementBuilder/TextBlock.pageLimit.test.tsx` (2: typing allowed on an unpaginated page; still refused when it overfills the page). The first test failed before the fix.
- Integration: `AgreementBuilder.test.tsx`, +7 (palette adds below the selection or at the end; drag by handle; drag from the palette; drop on a gap; one marker until the drag moves on or ends; dragging state). The marker test failed without the fix.
- Unit: `utils.test.ts`, +8 (presets, palette, table row/column helpers). Integration: `PropertyPanel.mergeFields.test.tsx`, +2 (table controls); `AgreementBuilder.test.tsx`, +5 (consecutive palette inserts, starter templates incl. undo and blank, the business funding agreement's logo, every merge field, table, lists, page break, consent box and signature; red before the template existed). The consecutive-insert test failed before the fix.
- E2E: `e2e/sidebar/settings/agreement-builder.spec.ts` (new, 5; real pointer drags): starts from the terms template; opens full screen; Insert field adds a chip and saves the bare field; drag by handle and from the palette; undo and the close guard.
- `npm run typecheck` clean. `npx vitest run`: 222 files, 1666 passed (+2 expected fail).
- E2E: `e2e/sidebar/partners/partner-configuration.spec.ts` and `agreement-builder.spec.ts` passed (11/11). In `e2e/sidebar/settings/settings.spec.ts`, 14 email / test mail / OpenAI tests fail. They fail the same on the base commit without these changes, so they predate them; logged as E2E-014.

## Open items
- **Next in the builder rework (step 2):** the shared renderer that lets `template_html` drop its scripts (closes the template-script risk noted in the signing handoff).
- **Table cells:** cells can't be merged, and only the last row or column is removed.
- **Drag inside a Parties row:** not supported; those blocks keep the arrow buttons.
- **Draft:** an autosaved local draft is not done; the unsaved-changes guard covers closing.
- **Preview date:** the preview's "Today's date" sample is the date the builder module loaded.
- **Local demo data:** in the local `fch-migration` DB, the host's (partner 1) borrower agreement (template id 1) was replaced through the builder with the Business funding agreement, using the old template's logo uploaded to the file manager. The previous rows were backed up first with mysqldump (`agreement_templates`, `agreement_template_versions`); the backup is outside the repo.
