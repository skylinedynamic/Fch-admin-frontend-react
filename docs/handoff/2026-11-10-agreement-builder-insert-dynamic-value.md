# Agreement Builder: "Insert Dynamic Value" in its own section at the top

**Date:** 2026-11-10

## Problem
Settings → Agreement Builder has dynamic values (merge fields such as `{{signer.name}}`, filled in with the signer's or the partner's details when the agreement is signed). The "Insert field" button for them appeared in the right panel only while a Text or Header block was selected, near the bottom of that block's settings. On an empty page ("Start from an empty page" / Clear All) there is no block to select, so the button never showed and there was no way to add a dynamic value. The explanation box ("Blue fields fill in by themselves") also shows only once the agreement already has one.

## Solution
- Renamed to **"Insert Dynamic Value"**. It now sits in its own boxed section, "Dynamic Values", at the top of the right panel and is always shown, with or without a selection.
- Where the value goes:
  1. At the cursor in the text being edited.
  2. Otherwise at the end of the selected Text, Heading or Header block. Heading and lists are text blocks underneath.
  3. Otherwise (empty page, or a selected block without text such as a divider, logo or signature) in a **new Text Block** holding the value. It is placed where the palette would place one (below the selected block, or at the end) and is selected.
- Design: neutral and boxy, per the UI preferences. White box with grey borders and 4px corners; a 37.5px button; the dropdown attached below as square, bordered rows with grey group headers. The theme navy (`--brand-primary`) appears only on focus and on the row under the pointer.
- The merge-field explanation box now points to "Insert Dynamic Value at the top of the right panel".

## Files changed
- `src/pages/settings/components/AgreementBuilder/InsertFieldMenu.tsx`: new label; `onAppend` optional; new `onAddNew` for when there is no text to take the value.
- `src/pages/settings/components/AgreementBuilder/PropertyPanel.tsx`: the "Dynamic Values" section at the top; removed from the block settings; new `onAddDynamicValue` prop.
- `src/pages/settings/components/AgreementBuilder/index.tsx`: `onAddDynamicValue` adds a Text Block holding the value.
- `src/pages/settings/components/AgreementBuilder/MergeFieldsHint.tsx`: wording.
- `assets/css/agreement-builder.css`: `.ab4-dynamic-values` section; boxy `.ab4-insert-field*` button and dropdown.
- `tests/pages/settings/components/AgreementBuilder/PropertyPanel.mergeFields.test.tsx`: renamed; 4 new tests (top section with and without a selection; new block when nothing or a non-text block is selected); the logo test now expects only the top section.
- `tests/pages/settings/components/AgreementBuilder/AgreementBuilder.test.tsx`: new test, a dynamic value on an empty page gives a new text block with the chip.
- `e2e/sidebar/settings/agreement-builder.spec.ts`: renamed; new test, empty page → Insert Dynamic Value → saved as `{{signer.business_name}}` in a text block.

## Testing
- Vitest: the new and renamed tests failed before the change (8 in the panel test) and pass now. `tests/pages/settings/components/AgreementBuilder`: 11 files, 146 passed.
- Playwright (mock project, after `npm run build`, `--workers=1`): `e2e/sidebar/settings/agreement-builder.spec.ts`, 7 passed.
- Screenshots of the panel (closed and open) checked by eye after the design changes.
- `npm run typecheck` clean.

## Open items
- None known.
