# BUG-106: View Agreement without a signed copy

2026-10-29

## Problem
`/partners/download-agreement/:userId` and `/borrowers/download-agreement/:userId` went to the 404 page ("404 PAGE NOT FOUND") whenever the API returned no signed copy. QA hit this with Wanda (221), who never signed, by opening the URL directly. The 28-Oct retest still failed: the sheet said "Fixed", but nothing had been changed.

## Solution
The page now tells two "no copy" cases apart, using the new `has_sign` in the API reply (fch-api, same branch):

| Case | What the page shows |
|---|---|
| Signed copy present | The agreement, as before |
| `has_sign` false, no copy | A "No signed agreement" notice, with no Print button and no Re-sign |
| `has_sign` true, no copy (file missing) | A popup, "Signed agreement not found", with **Re-sign**. The same notice stays on the page with a Re-sign button to reopen the popup. |
| Not allowed (API 404, someone else's agreement) | Still the 404 page, unchanged as agreed |

**Re-sign** calls the existing `POST common/agreement-sign/cancel/{userId}`. It now clears `has_sign` even when no signed copy is left. The page then says "Re-sign requested": they will be asked to sign again the next time they sign in.

The texts live in `src/config/agreementView.ts`. The popup is the shared `ConfirmationModal`, kept mounted so Bootstrap's hide transition isn't cut off.

UI links are unchanged. The Agreement tab (`has_sign`) and the header's My Agreement (`is_agreement_signed`) only appear when signed, so "no link in the UI" for an unsigned record is by design.

## Files changed
- `src/pages/partners/DownloadAgreement.jsx`: no-copy states, Re-sign popup.
- `src/config/agreementView.ts` (new): the page's notice texts.
- `src/modules/agreement/services.ts`: `fetchSignedAgreementHtml` reply type gains `has_sign`.

## Testing
- `tests/pages/partners/DownloadAgreement.test.tsx` (new, 4 tests). Not signed and missing were red first; signed and someone else's pin existing behaviour.
- `e2e/sidebar/partners/download-agreement.spec.ts` (new, 2 tests). Both fail on the old page and pass now.
- Vitest across `tests/pages/partners`, `tests/modules/agreement` and `tests/components/Common/Modals`: 159/159. `npm run typecheck` is clean.

## Open items
- **"Documents tab is empty":** a signed agreement is not stored as a document. Listing it there would be a new feature.
- **Signed-copy branch on staging:** QA could not test it, because there is no active borrower agreement template on staging. That is a data setup issue.
- **BUG-106 in the QA sheet:** move it back to retest once this is merged and deployed.
