# Agreement Builder: edit a saved template

2026-11-17

## Problem
In the Agreement Builder, a saved template (Save as Template) couldn't be changed. To update one, you loaded it, saved a copy under a new name and deleted the old one. It couldn't be renamed either.

## Solution
- **Save as Template dialog:** a choice between **Save as a new template** (as before, with a name) and **Replace an existing template**.
  - Replace shows **Template to replace** (your saved templates for this agreement type), a PrimeReact `Dropdown` styled like the builder's fields (37.5px, 4px corners, themed highlight) with `appendTo="self"` so its list opens inside the dialog, not the browser's native select list. **Replace Template** puts the agreement on the page into it, and it keeps its name (`PUT saved/{id}` with `template_json` only).
  - Replace is disabled, with "No saved templates to replace yet.", when there are none.
- **Templates dialog:** each saved template has a **Rename** (pencil) button beside Delete. It turns the card into a name field with Save / Cancel.
  - Enter saves; Escape cancels the rename without closing the dialog.
  - A refused name ("You already have a template with this name.") shows under the field, never as a toast.
- **Data layer:** `updateSavedAgreementTemplate()` and `useUpdateSavedAgreementTemplate()` (refreshes the type's list), plus the type `UpdateSavedAgreementTemplatePayload`.

## Files changed
- `src/modules/agreement/services.ts`, `queries.ts`, `types.ts`: update call, hook, payload type.
- `src/pages/settings/components/AgreementBuilder/SaveAsTemplateDialog.tsx`: new / replace choice. `fieldErrorFrom()` exported for reuse.
- `src/pages/settings/components/AgreementBuilder/StarterTemplatesDialog.tsx`: Rename button and inline rename form.
- `assets/css/agreement-builder.css`: rename button, rename form (37.5px field), mode choice, the replace dropdown and its panel. The saved card's right padding goes from 44px to 76px for two corner buttons.

## Testing
- Unit: `savedTemplates.services.test.ts` (+1 PUT), `savedTemplates.queries.test.tsx` (+1 invalidation), `agreementBuilderSavedTemplates.test.ts` (+3; the padding expectation updated to 76px).
- Integration: `AgreementBuilder.test.tsx`, new "editing a saved template" block (4): replace keeps the name and sends only the agreement; no replace with nothing saved; rename; refused name inline, Escape cancels.
- E2E: `agreement-builder.spec.ts` new test "renames a saved template in Templates and replaces it from Save as Template".
- Results: all new tests failed first. Vitest `tests/modules/agreement`, `tests/assets/css`, `tests/pages/settings`, `tests/pages/partners`: 59 files / 487 passed. `npm run typecheck` clean. Playwright `agreement-builder.spec.ts`: 17/17 (`--workers=1`, fresh build on :4174).

## Open items
- Needs the fch-api `PUT saved/{id}` route from the same date (`fch-api/docs/handoff/2026-11-17-agreement-saved-template-edit.md`).
