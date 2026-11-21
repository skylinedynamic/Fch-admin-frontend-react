# Agreement preview as a partner or borrower

**Date:** 2026-11-19
**Branch:** feature/agreement-builder-modification

## Problem
- **Settings › Agreement Builder › Preview ("Live rendered output")** filled only the owner's company fields with real data. Every `{{signer.*}}` field, plan price, commission table and enrollment table showed example values, so nobody could see the agreement as a real partner or client would.
- **Partners / Clients › profile › Agreement:** before signing, the tab showed only the "Agreement signing" switch. The agreement the person would sign could not be seen from there.

## Solution
**Builder (Preview view)**
- The preview bar has a **Preview as Partner** button (partner agreement) or **Preview as Borrower** button (borrower agreement).
- The button opens `PreviewAsSignerDialog`, a searchable list (`GET /common/agreement-templates/preview-signers`, search debounced by 300 ms):
  - **Partner agreement:** partners only.
  - **Borrower agreement:** clients only.
  - There are no tabs; each agreement has one list.
- The API decides who is in a list: the host's admin and staff see every partner and every client of every partner; a non-host partner's team sees only its own clients (and no partners).
- Each row shows:
  - initials and name;
  - business name · "Client of <partner>" (clients) · email;
  - an **enrollment type** tag (`Installment` / `One Time Payment` / "No enrollment");
  - a **Signed / Not signed** badge;
  - a radio dot marking the person currently previewed.
- Picking someone re-renders the live (unsaved) preview with that person's values (`preview-values` with `signer_user_id` + `type`).
  - **A client's preview shows their own partner's company details** in the `{{owner.*}}` fields, not the host's; the API decides this.
  - A partner's preview shows the host's company details.
- The bar then shows a "Previewing as …" chip, and its × goes back to the example details.
- `withMergeSamples` now uses the signer's own HTML values (commission and enrollment tables) in place of the examples, still sanitized.
- Switching agreement type clears the chosen signer.
- From Partner profile › Configuration, the list and values are for that partner (`partner_id`).

**Partner / Client › Agreement tab**
- While unsigned, the tab fetches `GET /common/agreement-sign/preview/{userId}`. A 404 (no active agreement) hides the button.
- With an active agreement, **Preview Agreement** sits at the end of the "Awaiting signature" (or "No signature needed") row of the signing card. After design feedback it is no longer a separate box.
- For a viewer without the host's switch, the button stands alone in a small "Not signed yet" box.
- `AgreementPreviewDialog` shows the agreement in an iframe with `sandbox="allow-scripts"`. The agreement's pagination script runs, but it gets no same-origin access to the app (no token, cookies or storage).

**Data layer** (`src/modules/agreement`)
- Services: `fetchAgreementPreviewSigners`, `fetchAgreementSignerPreview`; `fetchAgreementPreviewValues(partnerId, signer?)`.
- Query hooks: `useAgreementPreviewSigners`, `useAgreementSignerPreview` (no retry on 404); `useAgreementPreviewValues(enabled, signer?)`.
- Types: `AGREEMENT_SLUG`, `AgreementPreviewSigner` (with `enrollment_type`, `has_sign`), `AgreementPreviewSignerRef`, `AgreementSignerPreview`.
- New `queryKeys.agreement` keys: `previewSigners`, `signerPreview`, and a signer-aware `previewValues`.

## Files changed
- `src/modules/agreement/{types,services,queries}.ts`: types, calls and hooks above.
- `src/lib/query/queryKeys.ts`: new agreement keys.
- `src/pages/settings/components/AgreementBuilder/PreviewAsSignerDialog.tsx`: new signer picker.
- `src/pages/settings/components/AgreementBuilder/index.tsx`: Preview as button, chip, signer state.
- `src/pages/settings/components/AgreementBuilder/utils.ts`: `withMergeSamples` takes real HTML values.
- `src/pages/partners/components/AgreementPreviewDialog.tsx`: new read-only preview dialog.
- `src/pages/partners/components/AgreementTab.tsx`: Preview Agreement in the status row / standalone box.
- `assets/css/agreement-builder.css`: signer list, tags, status badges, chip, preview dialog.
- `assets/css/custom.css`: `.agr-preview`, `.agr-preview__btn`, status row layout.
- `docs/e2e/ISSUES.md`: E2E-027 (a flaky builder test that predates this change).

## Testing
- Unit: `tests/modules/agreement/previewAsSigner.services.test.ts` (new, 7); `tests/pages/settings/components/AgreementBuilder/utils.test.ts` (+3, signer HTML values).
- Integration:
  - `AgreementBuilder.test.tsx`, "preview as a signer" (+10): partner and borrower flows, partners-only and clients-only lists (no tabs), client rows name their partner, a client previewed with their partner's company details, search, enrollment/sign tags, clear, empty, close, configured partner.
  - `AgreementTab.test.tsx` (+7): opens the preview, placed in the status row, shown for a client's own partner, close, not offered when off, signed or without a login.
  - Existing tab tests get a default 404 preview handler.
- CSS: `tests/assets/css/agreementPreviewAsSigner.test.ts` (new, 9).
- Affected Vitest files (`tests/modules/agreement`, `tests/pages/settings/components/AgreementBuilder`, `AgreementTab.test.tsx`, `tests/assets/css`): **364 passed** (32 files). Full suite: **467 files, 3,598 passed, 2 expected fail**. `npm run typecheck`: clean.
- E2E (after `npm run build`):
  - `agreement-builder.spec.ts` (+2 Preview as signer specs);
  - `e2e/sidebar/partners/partner-agreement-preview.spec.ts` (new, 2);
  - `e2e/sidebar/clients/client-agreement-preview.spec.ts` (new, 1);
  - `agreement-required.spec.ts`.
  - Final run: **37 passed**.
  - "adds a section between two blocks" is flaky: it failed in earlier runs, including 3 of 3 on the base commit. Logged as E2E-027.
- Backend: see the fch-api handoff of the same name (18 new tests, 163 agreement tests pass).

## Open items
- The client profile shows its Agreement tab before signing only to the host (`ClientDetails.tsx`: `has_sign || (isHost && id)`). A white-label partner viewing its own unsigned client therefore can't reach the preview yet, although the API allows it. Widening that tab rule is a product call.
- Each list shows the newest 50; search narrows it. There is no paging, which matters more now that the host's client list spans every partner.
- E2E-027 (pre-existing flaky test) is still open.
