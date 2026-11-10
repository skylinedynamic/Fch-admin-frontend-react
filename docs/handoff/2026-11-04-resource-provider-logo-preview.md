# Resource provider logo preview with private resources (BUG-016)

**Date:** 2026-11-04
**Branch:** bugfix/round-2
**Author:** Awlad Hossain

## Problem
fch-api moved `resources/` to the private disk (BUG-016; fch-api handoff `2026-11-04-private-files-foundation-and-audit.md`). In Resources › Add/Edit, a provider's logo is picked from the file manager's `resources/` folder, and the form previewed it with `buildStorageUrl(p.logo)`, a hand-built `/storage/resources/...` URL. That URL now gives 404, so a logo just picked showed as broken until the resource was saved.

## Solution
- **On save,** the API keeps a picked logo as a public copy in `resource-providers/`, so saved logos keep their `/storage` URL.
- **Before save,** the form shows a just-picked logo by the URL the file manager gave for it, which is signed for a private file.
- **`providerLogoSrc(provider)`** in `src/utils/imageHelpers.ts` returns `logo_preview` (set from the file manager item's `url` when a logo is picked), else `buildStorageUrl(logo)`.
- **`ResourceForm.tsx`** uses it for the provider logo image and sets `logo_preview` on pick. The API ignores the extra key.

## Files changed
- `src/utils/imageHelpers.ts`: `ProviderLogo` type and `providerLogoSrc`.
- `src/pages/resources/ResourceForm.tsx`: logo preview from `providerLogoSrc`; `logo_preview` set on pick.

## Testing
- **New:** `tests/utils/imageHelpers.test.ts` (6): `buildStorageUrl` for a URL, a path and nothing; `providerLogoSrc` for a just-picked logo (the file manager URL), a saved one (its storage URL) and none. The `providerLogoSrc` cases failed first.
- **Results:**
  - `npm run typecheck` is clean.
  - `tests/utils/imageHelpers.test.ts` and `tests/pages/resources`: 15 passed.
  - `npm run build`, then `e2e/sidebar/resources` (mock and live, against the local API): 47 passed.

- **Browser check (live, local API):**
  - New `e2e/sidebar/clients/client-private-files.live.spec.ts` (2): a client's document and credit report open by their signed `/private-files` URL (200); `/storage/...` gives 404, unsigned gives 403.
  - Clients, Partners, Funding Application, Embedded Form, Task & Reminders and Resources live specs: 24 passed.

## Open items
- Document links elsewhere (client documents, the file manager) already use the URLs the API returns, now signed for private files, and needed no change.
- A signed URL works for 60 minutes (fch-api `FILES_SIGNED_URL_MINUTES`). A page left open longer gets 403 on a private link until it reloads.
