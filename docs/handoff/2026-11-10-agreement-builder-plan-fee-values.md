# Agreement Builder: Plan & Fee dynamic values and search

**Date:** 2026-11-10

## Problem
"Insert Dynamic Value" offered only the signer's and the company's details and today's date. Plan & Fee prices could not be added to an agreement, and the list had no search.

## Solution
- The builder asks the API for the Plan & Fee values of the agreement being edited (`useAgreementMergeFields`, `POST /common/agreement-templates/merge-fields`):
  - **Partner agreement:** every active plan, in four groups: "Plan & Fee: Partner enrollment", "User seats", "Client activation fee", "Borrower enrollment".
  - **Borrower agreement:** only "Plan & Fee: Borrower enrollment".
  The fixed signer / company / date fields stay for both.
- `MergeFieldsContext` holds the full list (fixed + Plan & Fee). The Insert Dynamic Value menu, the chip menu (click a blue chip to change it) and the preview read it. The preview shows the real price.
- **Search**: a search box at the top of the dropdown. It gets the cursor on open and starts empty each time. It matches a value's name, group or key, ignoring case, hides groups with nothing left, and says `No dynamic values match "…"` when empty. The cursor position in the agreement text is remembered while searching, so the value still goes where you were typing.
- **Chips**: Plan & Fee keys may hold digits (`11_month`), so the chip and preview patterns now accept them. Chip labels come from the loaded list (`registerMergeFieldLabels`). A Plan & Fee key not loaded yet, or whose plan was switched off, still shows as a chip labelled "Plan & Fee value". Text blocks relabel their chips when the list arrives.
- Design follows the neutral, boxy style of the section: 32px search input with 4px corners and the theme navy on focus; long keys are cut off with "…"; one help line under the section ("Filled in automatically when the agreement is signed.").

## Design of the list (after review)
- The list opens as a **drawer the full height of the right panel** (toolbar to the bottom of the screen), 360px wide, flush with the panel's right edge, over the page. It is portalled to `<body>` so the panel's scrolling cannot clip it.
- **Header:** icon, "Insert dynamic value", "Filled in automatically when the agreement is signed.", and a close (×) button.
- **Search:** 37.5px, with a match count.
- **Groups:** pinned headings with an icon (signer, company, date, price tag for Plan & Fee) and a count.
- **Plan & Fee rows:** the plan's name ("Certified Partner · One Time Payment") is a small heading, and each row is the short field name ("Total amount") with the price in a grey tag. Long names never wrap into the price. The full name stays as the row's accessible name.
- **Behaviour:** matches are highlighted; ↑/↓ and Enter pick from the search box; an Enter hint shows on the active row. It closes on a click outside, Esc, the × or after picking.
- Neutral palette with 4px corners; the theme navy only on focus, the active row and matches.

## Files changed
- `src/modules/agreement/{types,services,queries}.ts`: `AgreementPlanField`, `fetchAgreementMergeFields`, `useAgreementMergeFields`.
- `src/lib/query/queryKeys.ts`: `agreement.mergeFields(type)`.
- `src/config/agreementMergeFields.ts`: `group` is any string (Plan & Fee groups come from the API).
- `src/pages/settings/components/AgreementBuilder/mergeFieldsContext.ts`: new.
- `src/pages/settings/components/AgreementBuilder/index.tsx`: loads the list for the agreement type, provides it, uses it in the preview.
- `src/pages/settings/components/AgreementBuilder/InsertFieldMenu.tsx`: full-height drawer (portal); header and close; search with count, highlight and keyboard picking; group icons and counts; plan name headings with short rows and price tags; closes on click outside / Esc; keeps the text cursor.
- `src/pages/settings/components/AgreementBuilder/MergeChipMenu.tsx`: list from the context.
- `src/pages/settings/components/AgreementBuilder/mergeChips.ts`: digits in keys; label registry; generic Plan & Fee chip.
- `src/pages/settings/components/AgreementBuilder/utils.ts`: `withMergeSamples` takes the list; digits in keys.
- `src/pages/settings/components/AgreementBuilder/BlockComponents.tsx`: text blocks relabel chips when the list arrives.
- `src/pages/settings/components/AgreementBuilder/PropertyPanel.tsx`: help line wording.
- `assets/css/agreement-builder.css`: `.ab4-insert-popover*` drawer styles (replaces the old in-panel dropdown styles).
- Tests: `tests/modules/agreement/services.test.ts`, `tests/pages/settings/components/AgreementBuilder/{PropertyPanel.mergeFields,mergeChips,utils,AgreementBuilder}.test.tsx`, `e2e/sidebar/settings/agreement-builder.spec.ts`.

## Testing
- Vitest: new tests written first and failing before the change. Service; Plan & Fee group listed and inserted; search (filter, group match, case, nothing matches, resets on open); chip label for a key with digits, and the generic label; preview price; the borrower and partner builders ask for their own type. `tests/modules/agreement` + `AgreementBuilder`: 13 files, 199 passed (includes click outside, Esc, ×, keyboard picking, prices, highlight, plan headings, group counts).
- Playwright (mock project, after `npm run build`, `--workers=1`): `e2e/sidebar/settings/agreement-builder.spec.ts`, 11 passed (adds: the drawer is wider than the panel, fills its full height, and closes on a click outside). New: search "seat", pick the monthly seat fee and save the field; no match; the borrower agreement shows Borrower Enrollment only.
- Screenshots of the open menu with a search typed checked by eye.
- `npm run typecheck` clean.
- API side: `fch-api/docs/handoff/2026-11-10-agreement-plan-fee-dynamic-values.md` (186 agreement + billing tests passed).

## Open items
- Deploy together with the fch-api change. Without it the merge-fields call fails and the builder shows only the fixed fields.
- The chip menu has no search; it lists the same values.
