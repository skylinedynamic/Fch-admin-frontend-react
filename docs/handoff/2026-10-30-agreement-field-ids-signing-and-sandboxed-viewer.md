# Agreements — field ids, signing sends version and values, signed copy shown without scripts

2026-10-30

## Problem
- **The browser built the signed record.** Partners sign the host's partner agreement in `AgreementSignModal`, which posted the whole filled-in page (`content_html`), and the API stored it as the signed record. fch-api now builds the record from the version signed and the values entered (fch-api `docs/handoff/2026-10-30-agreement-versions-and-server-built-signatures.md`).
- **Fields had no names.** The Agreement Builder gave its fields nothing to identify them, so values could only be matched by their order on the page.
- **Scripts could run as the host user.** `pages/partners/DownloadAgreement.jsx` is where the host's team opens other users' signed agreements, signed in as themselves. It wrote the stored HTML into a same-origin iframe without a sandbox. An older signed copy is HTML the signer's browser sent, so a script in it would run as the host user. This was stored XSS, and the token sits in `localStorage`.
- **Errors were never shown.** The sign modal's error message ("Mandatory fields missing…", API errors) was stored in state but never rendered.

## Solution
- **Builder field ids:** `gen()` writes `data-field-id` on every field: the block id, plus `{id}:date` for a signature's date.
- **Signing sends three things.** `AgreementSignModal` now sends:
  - `agreement_template_version_id`;
  - `fields`, collected by `src/utils/agreementFields.ts` (the same rules as the server, and the same util as client-fch);
  - `content_html`/`field_values`, still sent only so an API not yet updated keeps working.
- **409 (wording changed while open):** the modal shows the message, unticks the consent and reloads the agreement.
- **Error shown:** the error now appears above the consent row.
- **Viewer sandbox:** the iframe is `sandbox="allow-same-origin allow-modals"`, so no script runs; it can still be sized and printed.

## Files changed
- `src/pages/settings/components/AgreementBuilder/utils.ts`: `data-field-id` on fields.
- `src/utils/agreementFields.ts`: new.
- `src/components/Common/Modals/AgreementSignModal.tsx`: version, `fields`, 409 reload, error shown.
- `src/modules/agreement/services.ts`, `src/modules/agreement/types.ts`: version and `fields` types.
- `src/pages/partners/DownloadAgreement.jsx`: sandboxed iframe.

## Testing
- Unit: `tests/pages/settings/components/AgreementBuilder/utils.test.ts` (7, field ids).
- Unit: `tests/utils/agreementFields.test.ts` (5).
- Integration: `tests/components/Common/Modals/AgreementSignModal.test.tsx`, +3 (version sent, fields sent, 409 reload with the message shown).
- Integration: `tests/pages/partners/DownloadAgreement.test.tsx` (new, sandbox).
- `npm run typecheck` clean. `npx vitest run`: 219 files, 1624 passed (+2 expected fail).
- E2E: no Playwright spec covers the partner sign modal or this viewer. The same flow passed E2E in client-fch.

## Open items
- **Template scripts:** a template saved by a partner admin can still contain script, which runs in its borrowers' signing page. The fix is the shared renderer planned in step 2 (agreement builder rework).
- Stop sending `content_html`/`field_values` once fch-api's legacy path is removed.
- Add an E2E spec for the partner sign modal.
