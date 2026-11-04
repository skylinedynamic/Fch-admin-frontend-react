# Partner Documents: the file manager works in the private folder

**Date:** 2026-11-05
**Branch:** bugfix/round-2

## Problem
On the Partner profile, the Documents tab's file manager opened on `partners/{id}`, which is public. Uploads went to the public disk. Attaching a document moved it to the private `partner-documents/{id}`, and after that the file manager no longer showed it.

## Solution
- **The folder:** the Documents tab's file manager now opens on `partner-documents/{id}`, which is private. The name comes from `FILE_MANAGER_FOLDERS.PARTNER_DOCUMENTS` in `src/modules/filemanager/config.ts`.
- **Attaching:** the attach request now sends `entity_type: 'partner-documents'`, so the API files the document where it is and does not move it. The file manager still shows the file afterwards.
- **API side:** see fch-api's `2026-11-05-partner-documents-file-manager-private.md`.

## Files changed
- `src/modules/filemanager/config.ts`: `FILE_MANAGER_FOLDERS`.
- `src/pages/partners/components/DocumentsSection.jsx`: the file manager's folder, and `entity_type` on attach.
- `tests/pages/partners/components/DocumentsSection.test.tsx`: new, 2 tests.
- `e2e/sidebar/partners/partner-profile.spec.ts`: the file manager calls now expect `partner-documents`, and the attach call expects `entity_type`.

## Testing
- **New Vitest:** both tests failed first and pass now. `tests/pages/partners` and `tests/modules/filemanager`: 78 passed.
- **`npm run typecheck`:** clean.
- **Playwright mock, `partner-profile.spec.ts`:** 39 passed.

## Open items
- **Module pattern:** `DocumentsSection.jsx` still calls the partner services directly, not through query hooks. It is also still `.jsx`.
- **Not committed.**
