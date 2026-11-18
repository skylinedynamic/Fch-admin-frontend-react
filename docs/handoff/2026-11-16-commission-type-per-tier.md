# Partner commission type per tier, and a read-only split at close

**Date:** 2026-11-16
**Branch:** feature/agreement-builder-modification
**Author:** Awlad Hossain (with Claude Code)

## Problem
- **Partner profile › Commissions:** every tier could only be a % of the success fee. Each tier needs its own **Type**, Percentage or Flat Amount, picked in a custom dropdown in its row.
- **Funding application › Closed (Completed) modal:**
  - the Admin / Partner Commission Rate stayed editable even when the partner's tier sets them;
  - a flat tier was shown as a rounded % split: $500 of a $30,000 fee showed as 1.67%, which is **$501**.

## Solution
**Tier table** (`CommissionTierTable`):
- a new **Type** column, using the shared `CustomDropdown` with options from `PARTNER_COMMISSION_TYPE_OPTIONS`;
- the Commission input switches between `%` and `$` per row;
- each row keeps both values, so switching a type and back restores what was typed. Only the row's own value is sent;
- the table now fits its card: fixed column shares from 768px up, and the dropdown's menu is no longer clipped. The selected option has no filled background.

**Commissions tab** (`PartnerCommissionTab`):
- sends `{ tiers: [{ min_count, max_count, commission_type, percentage | amount }] }`;
- "changed" compares each row's type and its value;
- a single 0+ tier reads "Current: $500" or "Current: 25%";
- the donut / legend previews a flat tier as its share of the $10,000 example fee.

**Closed (Completed) modal** (`FundedAmountModal`):
- The admin / partner split is **always read-only**. The fch-api enforces this too, ignoring any split that is sent. When the deal falls in a tier, the split comes from it.
  - Percentage tier: both rates are shown disabled, with "Set by the partner's commission tier for this deal."
  - Flat tier: no % rate fields and no "% of success fee" chips. The summary shows the Admin Commission and the Partner Commission ("Flat amount") in $. The partner amount is exactly the flat $ (capped at 99% of the fee) and follows the funded amount and fee as they change.
- The rate fields are `disabled` and `readOnly` (`tabIndex -1`) with the `fam-rate--readonly` look: grey fill, muted text, the ordinary arrow cursor, a transparent caret and `pointer-events: none` (a click passes through; no text caret). Disabled alone, they still looked like white, typeable fields.
- With no tier for the deal it is Admin 100% / Partner 0%, also read-only. The panel reads "No commission is set for this partner, so the admin keeps the whole success fee."
- A split saved before is not reused: the rates always show the partner's commission. The typed-split checks (required, adds up to 100%, admin ≥ 1%) and their tests are removed, because the split can no longer be typed.
- `PartnerCommissionPanel` shows a flat tier as "$500 / flat per deal".

**Closed (Completed) summary card** (`ClosedApplicationSummary`): a commission whose `partner_commission_type` is `flat` shows Admin Commission and Partner Commission ("Flat amount") in $, with no "% of success fee". The partner's view reads "A flat amount on this funded application."

**Confirm & Update while saving:** Bootstrap's `.btn:disabled` made the variant-less button transparent, so only "Processing..." text showed. `funded-amount-modal.css` now keeps the disabled Confirm button green with white text and the Cancel button white with its border, both slightly faded.

**Update Status button while closing:** the card's button showed "Updating..." while the Closed (Completed) modal saved, as well as the modal's own "Processing...". Every status change is saved from a modal (Closed (Completed) or the confirmation modal), and each shows its own loading state. The card's button now always reads **Update Status** and only opens the modal.

**Activity: status note on its own line:** fch-api writes "Status changed to ...\nNote: ...". The sidebar renders descriptions as HTML, where `\n` collapsed into a space. The new `textLineBreaks()` turns line breaks in plain-text descriptions into `<br>` before sanitizing. HTML descriptions (e.g. emails) are left as they are.

**Commission details page** (`CommissionDetails`): with `partner_commission_type` = `flat`:
- the partner's "Your Commission" card reads "Flat amount" instead of "x% Rate";
- the Commission Breakdown's Rate column shows "Flat amount" for the partner and "—" for the admin, who keeps the rest. The Success Fee stays a %;
- the payout section shows "Flat Amount", because the API now sends `payout_type: 'Flat Amount'`.

**Shared:**
- `CustomDropdown` gains an optional `ariaLabel` (a dropdown in a table cell has no `<label>`).
- `flatCommissionRate()` in `modules/partner/tiers.ts`.
- Type constants in `config/partnerCommission.ts`.

## Files changed
- `src/config/partnerCommission.ts`: `PARTNER_COMMISSION_TYPE`, options, amount range.
- `src/modules/partner/types.ts`: tier `commission_type`, `amount`.
- `src/modules/partner/tiers.ts`: `flatCommissionRate()`.
- `src/components/Common/CustomDropdown.tsx`: `ariaLabel` prop.
- `src/pages/partners/components/CommissionTierTable.tsx`: Type column, $ / % per row, `tierRowType` / `tierValueField`.
- `src/pages/partners/components/PartnerCommissionTab.tsx`: per-row payload, dirty check, summary, preview.
- `assets/css/commission-tiers.css`: Type column, dropdown look, fit-to-card layout.
- `src/components/Common/Modals/PartnerCommissionPanel.tsx`: flat tier in $.
- `src/components/Common/Modals/FundedAmountModal.tsx`: split from the tier, read-only; flat tier in $ only.
- `src/pages/applications/funding/components/ClosedApplicationSummary.tsx`: flat commission without a %.
- `src/modules/application/types.ts`: `partner_commission_type` on the details.
- `src/modules/commission/types.ts`: `partner_commission_type`. `src/pages/commissions/CommissionDetails.tsx`: flat share without a %.
- `assets/css/funded-amount-modal.css`: disabled Confirm / Cancel keep their look.
- `src/pages/applications/funding/FundingApplicationDetails.tsx`: Update Status shows no loading state (the modals do).
- `src/utils/textLineBreaks.ts`: new. `src/components/Common/Activity/ActivitySidebar.jsx`: uses it for descriptions.

## Testing
- **Full regression (end of day):**
  - typecheck clean;
  - Vitest **440 files, 3308 passed** (2 expected-fail, as before);
  - Playwright mocked partner commissions, funding application, commission details and commissions: **40 passed**;
  - Playwright live against the local API (commissions, funding application, partner commission save): **9 passed**.
- `e2e/sidebar/partners/partner-commissions-save.live.spec.ts` now finds tier 1's field whether its Type is % or $.
- Unit:
  - `tests/modules/partner/tiers.test.ts`: `flatCommissionRate`;
  - `tests/components/Common/CustomDropdown.test.tsx`: new;
  - `tests/modules/partner/services.test.ts` / `queries.test.tsx`: payload shape.
- Integration:
  - `tests/pages/partners/components/CommissionTierTable.test.tsx`: Type per row;
  - `tests/pages/partners/PartnerProfile.commissionsTab.test.tsx`: mixed tiers, switch and save, flat preview, switch back not dirty, error under the amount, read-only;
  - `tests/components/Common/Modals/PartnerCommissionPanel.test.tsx`;
  - `tests/components/Common/Modals/FundedAmountModal.test.tsx`: read-only percentage tier, flat in $ only and exactly $500, follows the funded amount, 99% cap, tier wins over a saved split, no tier still typed.
- E2E:
  - `e2e/sidebar/partners/partner-commissions.spec.ts`: a tier switched to Flat Amount and saved; type dropdown read-only;
  - `e2e/sidebar/intake-review/funding-application/funding-application-partner-commission.spec.ts`: percentage rates disabled; flat tier in $ only.
- `tests/pages/applications/funding/ClosedApplicationSummary.test.tsx`: flat commission for host and partner; plus an E2E case in the partner-commission spec.
- Read-only rates: `tests/assets/css/fundedAmountModalReadonlyRates.test.ts` (new), the modal's read-only test (readonly, tabindex, class), and an E2E check of the computed cursor (`default`), `pointer-events: none`, transparent caret and background, and that a click doesn't focus the field.
- Processing button: `tests/assets/css/fundedAmountModalProcessingButton.test.ts` (new); the "closes on Cancel, but not while saving" test checks it is still the styled button with its spinner; an E2E case checks the computed colour while the save is pending.
- Update Status shows no loading state while either save runs: `FundingApplicationDetails.test.tsx`. Status note line: `tests/utils/textLineBreaks.test.ts`, `tests/components/Common/Activity/ActivitySidebar.descriptionLines.test.tsx`. E2E for both in the partner-commission spec.
- Playwright (against the dev server on :5174, `--workers=1`): partner-commissions **5 passed**; funding-application-partner-commission **6 passed** (includes the read-only check with no tier). With the default parallel workers, the first run timed out on `page.goto` while Vite compiled.
- Commission details: `tests/pages/commissions/CommissionDetails.flat.test.tsx` (new, 3 tests); `e2e/sidebar/commissions/commission-details.spec.ts` gets 2 flat cases (**16 passed**).
- `npm run typecheck`: clean.

## Open items
- On screens under 768px the tier table scrolls sideways, and an open Type menu scrolls inside it.
- A commission saved before this change keeps its typed split until it is saved again. It has no `partner_commission_type`, so the Closed summary still shows it as a %. That includes applications closed while testing earlier today.
