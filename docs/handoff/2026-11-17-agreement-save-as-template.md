# Agreement Builder: Save as Template

2026-11-17

## Problem
Settings › Agreement Builder (and Partner profile › Configuration › Agreement). The toolbar had one **Save Template** button, which actually saved the agreement itself. A partner had no way to keep an agreement under a name to reuse later, and **Templates** only listed the built-in starters.

## Solution
- Toolbar: **Save Template** is now **Save Agreement** (same behaviour). A new **Save as Template** button opens a dialog with a **Template name** field, and **Save Template** stays disabled until a name is typed. The current `{ blocks, pagePad, docBg }` is posted to fch-api `POST /common/agreement-templates/saved` with the agreement's slug. A 422 reason (name taken, partner type not allowed) shows under the field, never as a toast; other failures toast.
- **Templates** dialog: a **Your templates** section (the owner's saved templates for this agreement type, newest first, with an empty state) above **Default templates** (the built-in ones). Picking a saved template fetches its blocks (`GET saved/{id}`) and replaces the page, including page padding and background. It can be undone. Each saved card has a delete button that asks first.
- Who can use it comes from fch-api: a partner saves its borrower agreement, the host both agreements. Inside Partner profile › Configuration, `partner_id` is sent (via `useConfigPartnerId`), as for the agreement itself.
- `fetchSavedAgreementTemplates` returns `[]` for any non-list answer, so a bad response can't crash the editor.

## Files changed
- `src/modules/agreement/types.ts`: `SavedAgreementTemplate`, `SaveAgreementAsTemplatePayload`, `SAVED_AGREEMENT_TEMPLATE_NAME_MAX`.
- `src/modules/agreement/services.ts`: fetch list / fetch one / save / delete.
- `src/modules/agreement/queries.ts`: `useSavedAgreementTemplates`, `useLoadSavedAgreementTemplate`, `useSaveAgreementAsTemplate`, `useDeleteSavedAgreementTemplate`.
- `src/lib/query/queryKeys.ts`: `agreement.savedTemplates(slug)`.
- `src/pages/settings/components/AgreementBuilder/SaveAsTemplateDialog.tsx` (new): the name dialog.
- `src/pages/settings/components/AgreementBuilder/StarterTemplatesDialog.tsx`: Your templates / Default templates sections, load, delete.
- `src/pages/settings/components/AgreementBuilder/index.tsx`: Save as Template button, Save Agreement rename, `onPickSaved`.
- `assets/css/agreement-builder.css`: dialog (4px corners, 37.5px field), section headings, empty state, saved card delete button.

## Testing
- Unit: `tests/modules/agreement/savedTemplates.services.test.ts` (6), `savedTemplates.queries.test.tsx` (5), `tests/assets/css/agreementBuilderSavedTemplates.test.ts` (7).
- Integration: `AgreementBuilder.test.tsx`, new "save as template" block (8): buttons, save with trimmed name, 422 inline, Cancel, listing beside defaults, empty state, pick + undo, delete after confirm. The "Save Template" → "Save Agreement" rename was applied across `AgreementBuilder.test.tsx` and `PartnerConfigurationSection.test.tsx`.
- E2E: `agreement-builder.spec.ts` new test "saves the agreement as a named template and starts from it later in Templates". Renamed buttons in it and in `partner-configuration.spec.ts`. The spec's save mock was narrowed (its `save**` glob also caught `/saved`).
- Results: Vitest `tests/assets/css`, `tests/modules/agreement`, `tests/pages/settings`, `tests/pages/partners`: 59 files / 478 passed. `npm run typecheck` clean. Playwright (`--workers=1`, fresh build on :4174): `agreement-builder.spec.ts` 16/16. `partner-configuration.spec.ts` has 2 failures already tracked as E2E-025 (two elements named "Agreement"), unrelated to this change.

## Open items
- Needs the fch-api migration `2026_11_17_000001_create_agreement_saved_templates_table` (`php artisan migrate`).
- No rename or overwrite of a saved template (save under a new name, delete the old one).
- Save as Template is disabled on an empty page.
