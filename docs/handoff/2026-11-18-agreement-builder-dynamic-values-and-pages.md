# Agreement Builder: dynamic value groups, enrollment values, page fixes

2026-11-18

## Problem
1. **Insert Dynamic Value** showed every value of every group in one long list.
2. The signer's own enrollment amounts (new in fch-api, `{{signer.enrollment.*}}`) needed to show in the builder, under the Signer icon.
3. **Editor, page padding:** a page's text ran into its bottom padding and was clipped (page 1 had 11px clear instead of 80px).
4. **Editor, block toolbar:** a block running over several pages showed its toolbar as a sliver.
5. **Editor, + menu:** near the bottom of a page the + menu opened downward and was cut off by the page, so Page Break and most blocks couldn't be picked.

## Solution
1. **Groups, then a modal:** the drawer lists the groups (icon, name, count, chevron). Clicking one (or arrow keys + Enter) opens a modal over the page with that group's values: plan headings, prices, the field key on hover, arrow keys between values. Picking a value inserts it and closes both. Escape or the backdrop closes only the modal. Typing a search still lists the matching values directly.
2. **Enrollment table:** one value, **Enrollment details** (`{{signer.enrollment_table}}`, fch-api `AgreementEnrollmentFields`), replaces the first version's separate amounts. It inserts like the commission table: the title "Enrollment Details", a description the host can edit, then the token alone in its paragraph (`mergeFieldSnippet`, `AGREEMENT_ENROLLMENT_TABLE_INTRO`). The Signer: Enrollment modal has an amber warning box (`.ab4-insert-group__warning .ab4-insert-group__variants`) explaining how it works and listing each enrollment type's rows, from the field's `variants`. Below it, the value is an **Add Enrollment Details** button (`.ab4-insert-group__add`, "Use …" from a field's own menu), not a list row; any field with `variants` gets this layout. The preview shows the API's example: a captioned table for each type. Any "Signer…" group gets the person icon.
3. **Page padding:** the editor now draws pages as the shared planner (`pagination.ts`, also used by Preview and signing) plans them. Insert zones are `display: block`, so the margins either side of a gap merge (they were flex, which stopped that), and each page's first block (`.ab4-page-first`) has no top margin, as in Preview. The planner reads that block's own top margin from `--mt`.
4. **Toolbar:** split slices clip with `clip-path` instead of `overflow: hidden` (inline style removed). The first slice (`--head`) leaves 32px above for the toolbar, and is lifted to `z-index: 30` while its block is hovered or selected.
5. **+ menu:** once open, it measures itself and opens toward the side with room, inside both the page and the window.

## Also: Plan & Fee warning in a group
A Plan & Fee group's modal opens with an amber warning box (`role="note"`, `.ab4-insert-group__warning`): "These values come from your current Plan & Fee. They update automatically when you change them there, until the agreement is signed. A signed agreement keeps the values it was signed with." The wording is `PLAN_AND_FEE_WARNING` in `InsertFieldMenu.tsx`. It's accurate: fch-api fills the values when the agreement is shown and keeps the signed copy with them. Other groups show no warning. Tests: `PropertyPanel.mergeFields.test.tsx` (+2), `agreementBuilderDynamicValueGroups.test.ts` (+1), and the e2e groups test checks it. Vitest builder + CSS: 25 files / 237 passed; Playwright `agreement-builder.spec.ts`: 23/23.

## Also: a field's own menu (click a blue field)
Clicking a field in the text (`MergeChipMenu`) listed every value. It now works like Insert Dynamic Value:
- The menu shows the field's current value, the groups (the current value's group ticked) and **Remove field**.
- A group opens the same group modal (Plan & Fee warning included), with the field's value checked (`menuitemradio`). Picking one swaps the field.
- Escape closes the group, then the menu. A click in the modal doesn't close the menu behind it.

The group modal, value rows, group icons and warning moved to a new shared `DynamicValueGroups.tsx` (`GroupModal`, `ValueRows`, `groupIcon`), used by both menus.

**Defect found by the e2e and fixed test-first:** the modal takes focus, so the text block blurs and rewrites its HTML. The chip element the menu held was then off the page, so the swap did nothing. `remapChip` now falls back to the chip at the same position (index saved when the menu opened).

Tests: `mergeChips.test.tsx` (chip menu block rewritten, +1 redrawn-text regression); `agreementBuilderDynamicValueGroups.test.ts` (+2); e2e "a field's own menu lists the groups, swaps its value from a group, and removes it". Vitest builder + CSS: 25 files / 242 passed; Playwright `agreement-builder.spec.ts`: 24/24.

## Files changed
- `src/pages/settings/components/AgreementBuilder/InsertFieldMenu.tsx`: group list, group modal, shared `ValueRows`, Signer icon for "Signer:" groups.
- `src/pages/settings/components/AgreementBuilder/BlockComponents.tsx`: `ab4-page-first` and `ab4-block-clip-window--head` classes, planner reads `--mt`, inline overflow removed, + menu placement (`useLayoutEffect`).
- `assets/css/agreement-builder.css`: group rows and modal; `.ab4-iz { display: block }`; first-block margin; clip-path slices.

## Testing
- **Vitest:**
  - `PropertyPanel.mergeFields.test.tsx`: rewritten for the group-then-modal flow (+5 new tests; the enrollment group test).
  - `AgreementBuilder.test.tsx`: value picks open their group first.
  - New tests: `InsertZone.test.tsx` (4), `agreementBuilderPagePadding.test.ts`, `agreementBuilderClipWindow.test.ts`, `agreementBuilderDynamicValueGroups.test.ts`.
  - `tests/pages/settings/components/AgreementBuilder` + `tests/assets/css`: 25 files / 234 passed. `npm run typecheck` clean.
- **Playwright `agreement-builder.spec.ts`** (`--workers=1`, fresh build on :4174): all pass. New tests: page bottom padding, split-block toolbar, + menu near the page bottom adds a Page Break, partner and borrower enrollment values, groups and modal. `partner-configuration.spec.ts`: 2 failures already tracked as E2E-024.
- New tests failed first; screenshots checked for the group list and modal.

## Open items
- Needs fch-api `AgreementEnrollmentFields` (same date) for the enrollment values.
