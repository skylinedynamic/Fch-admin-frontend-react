# Partner commission table in the partner agreement (Agreement Builder)

**Date:** 2026-11-16
**Branch:** feature/agreement-builder-modification
**Author:** Awlad Hossain (with Claude Code)

## Problem
When the host builds the partner agreement, there was no way to show each partner's own commission tiers. Only fixed wording was possible.

## Solution
- **Server.** fch-api now offers a merge field, `{{signer.commission_table}}`, for the partner agreement through `POST /common/agreement-templates/merge-fields` (see the fch-api handoff of the same name). When a partner signs, the server fills in a table of their tiers: From / To / Commission, with "$1,500" for flat tiers and "27.5%" for percentage tiers.
- **Menu.** In the builder the field appears under **Signer** as "Partner's commission tiers" in Insert Dynamic Value. It goes in as a chip, like the other fields, and is saved as the bare token. The borrower agreement doesn't list it.
- **Title and description.** Picking the field adds, as ordinary editable text in the same text block:
  - a bold title, "Commission Structure";
  - a one-line description;
  - the chip alone in its own paragraph, so the server's table replaces that paragraph.
  
  The text lives in `AGREEMENT_COMMISSION_TABLE_INTRO` and `mergeFieldSnippet()` in `src/config/agreementMergeFields.ts`. `InsertFieldMenu` uses the snippet at the cursor, when appending, and in a new block.
- **Preview.** The field carries `html: true`, so `withMergeSamples` shows its example as a table. The table goes through `sanitizeHtml` (DOMPurify), with no dotted outline around it; every other field is still escaped text.
- **Signing.** The sign modal renders the server's HTML as it already did, so a partner sees their own table there.

## Files changed
- `src/config/agreementMergeFields.ts`: `html?: boolean` on `AgreementMergeField`; new `AGREEMENT_COMMISSION_TABLE_FIELD_KEY`.
- `src/modules/agreement/types.ts`: `html?: boolean` on `AgreementPlanField`.
- `src/config/agreementMergeFields.ts` also gets `AGREEMENT_COMMISSION_TABLE_INTRO` and `mergeFieldSnippet()`.
- `src/pages/settings/components/AgreementBuilder/InsertFieldMenu.tsx`: inserts a field's snippet (title, description, chip) where it has one.
- `src/pages/settings/components/AgreementBuilder/utils.ts`: `withMergeSamples` renders html fields sanitized, with no outline.

## Testing
- `tests/pages/settings/components/AgreementBuilder/utils.test.ts`: 3 new tests, red before green.
  - The table is shown as a table, not as markup text.
  - Script and `on*` attributes are stripped.
  - Ordinary values are still escaped.
- `utils.test.ts` also gets a "no dotted outline" test.
- `tests/pages/settings/components/AgreementBuilder/AgreementBuilder.test.tsx`: 2 new tests, the second red before green.
  - The partner agreement lists the field, inserting it adds the chip, and the preview shows the table.
  - The title and description go in as editable text (not part of the chip) above the token, and the token is saved as `<p>{{signer.commission_table}}</p>`.
- The AgreementBuilder test folder passes: **172 passed**.
- The E2E commission test also edits the title, checks it in the preview and in the saved HTML, and checks there is no outline.
- E2E `e2e/sidebar/settings/agreement-builder.spec.ts`: 2 new tests.
  - Insert, preview the table, then save the bare token.
  - The borrower agreement doesn't offer the field.
  - The whole spec passes: **13 passed**.
- E2E `e2e/agreement-required.spec.ts`: new test. A partner sees their tier table in the sign modal. The whole spec passes: **6 passed**.
- Typecheck and the full Vitest results are in the reply for this change.

## Open items
- The master partner template (`masterTemplates.ts`, section 5.1) is legal wording and was left unchanged. The host can insert the field there in the builder.
- A partner who already signed keeps the tiers from when they signed.
