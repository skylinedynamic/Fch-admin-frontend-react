# Partner commission tiers — Partner › Commissions tab

2026-11-15

## Problem
Partner › Commissions had one "Partner Commission (%)" field. The business wants the partner's Funding commission paid by **funded-deal count tiers**, for example 0–10 → 10%, 11–20 → 12%, 21+ → 15%, with rows that can be added and % only.

Employee › Commissions is **unchanged**, as requested.

## Solution
This follows the fch-api change of the same date (`fch-api/docs/handoff/2026-11-15-commission-tiers.md`): the table, the validation rules and how deals are counted.

**Tier editor** (`src/pages/partners/components/CommissionTierTable.tsx`):
- Each row has From / To (blank = and up) / Commission (%).
- "Add tier" proposes the next From (previous To + 1).
- The first tier always starts at 0: its From is read-only and it can't be removed. Later tiers can be removed.
- Each API error (`tiers.{j}.min_count`) shows under its own input, never in a toast.
- Styles are in `assets/css/commission-tiers.css` (theme colours, 4px corners, 37.5px fields).
- The helpers are in `src/modules/partner/tiers.ts`: `nextTierRow`, `tierForPosition`, `tierRangeLabel`, `tierCountValue`.

**`PartnerCommissionTab.tsx`:**
- The status reads "Current: 25%" for one tier covering every deal, or "Current: N tiers" otherwise.
- The donut and legend preview the split for the partner's **next deal** (`funded_deal_count + 1`). The line above them reads, for example, "10 funded so far. Deal #11 falls in tier 2 (11+).", and that tier's row is highlighted.
- The commission is required: every tier is sent, and a blank rate goes as `null`, so the API's "Enter the commission (%) for this tier." shows under that field. It can't be cleared from the screen.
- The client-side 0–99% check is removed. The API checks the range and its error shows under the field.

**Closed (Completed) modal › Partner Commission** (`src/components/Common/Modals/PartnerCommissionPanel.tsx`, shown in `FundedAmountModal` for a partner client):
- One compact strip that reads the API's `partner_commission_setup`. It shows only the tier that applies, not the whole list.
- When the partner has tiers set:
  - the partner's rate for this deal on the right, for example "20%", with "of success fee" under it;
  - a line like "Deal #12 · 11+ deals tier";
  - this is the rate the Partner Commission Rate opens at.
- When none are set: a soft warning strip with a "Not set" badge and "No commission is set for this partner. Set the Partner Commission Rate manually below." A deal past the last tier gets the same strip, with "No commission is set for deal #9 (past the last tier)…".
- When set, the strip has a soft primary background, so it stands out above Commission Details.
- Not shown for a host client.
- `FundingApplicationDetails.tsx` passes the setup; the type `PartnerCommissionSetup` is in `modules/application/types.ts`.

**Data and payload:**
- `PartnerProfile.jsx` passes `commission_tiers` and `funded_deal_count`, and keeps them after a save.
- The partner details form no longer sends `commission`, `commission_tiers` or `funded_deal_count` (`modules/partner/logic.ts`).
- Types: `PartnerCommissionTier`, `PartnerCommission`, payload `{ tiers }`.

## Files changed
**Config and module**
- `src/config/partnerCommission.ts`: comment updated; `PARTNER_COMMISSION_RANGE_ERROR` removed.
- `src/modules/partner/types.ts`: tier types, payload and response.
- `src/modules/partner/tiers.ts`: new.
- `src/modules/partner/logic.ts`: skips the commission fields.
- `src/modules/partner/services.ts`, `src/modules/partner/queries.ts`: comments only.

**Components and pages**
- `src/pages/partners/components/CommissionTierTable.tsx`: new.
- `src/pages/partners/components/PartnerCommissionTab.tsx`: tiers; next-deal preview.
- `src/pages/partners/PartnerProfile.jsx`: tab props; saved-tiers handler.

- `src/components/Common/Modals/PartnerCommissionPanel.tsx`: new.
- `src/components/Common/Modals/FundedAmountModal.tsx`: `partnerCommissionSetup` prop; the panel.
- `src/pages/applications/funding/FundingApplicationDetails.tsx`: passes `partner_commission_setup`.
- `src/modules/application/types.ts`: `partner_commission_setup`, `PartnerCommissionSetup`.

**Styles**
- `assets/css/commission-tiers.css`: new.
- `assets/css/partner-commission.css`: tier layout and the next-deal line.
- `assets/css/funded-amount-modal.css`: the Partner Commission panel.

## Testing
**Unit**
- New: `tests/modules/partner/tiers.test.ts`.
- Added to `tests/modules/partner/services.test.ts`, `queries.test.tsx` and `logic.test.ts`.

**Component**
- New: `tests/pages/partners/components/CommissionTierTable.test.tsx`.
- New: `tests/components/Common/Modals/PartnerCommissionPanel.test.tsx`.
- `tests/components/Common/Modals/FundedAmountModal.test.tsx`: the section is shown set, shown not set, and hidden for a host client.
- `tests/pages/applications/funding/FundingApplicationDetails.test.tsx`: the closing modal shows this deal's tier.

**Integration (MSW against the real `apiClient`)**
- `tests/pages/partners/PartnerProfile.commissionsTab.test.tsx`: rewritten for tiers (show, save, activity refresh, header button, next-deal preview, not set, a blank rate refused under its field, first tier fixed at 0, API error under its field, read-only, hidden cases).

**E2E**
- `e2e/sidebar/partners/partner-commissions.spec.ts`: rewritten.
- New: `e2e/sidebar/intake-review/funding-application/funding-application-partner-commission.spec.ts` (tiers shown and the split opening at this deal's tier; not set).
- `e2e/sidebar/partners/partner-commissions-save.live.spec.ts`: updated to the tier field. It skips a partner with no commission, since that partner couldn't be put back.

**Results**
- `npm run typecheck`: clean.
- Partner Vitest files: **24 files, 175 passed**.
- `npx playwright test --project=mock e2e/sidebar/partners/partner-commissions.spec.ts`, after `npm run build`: **4 passed**.
- Full suite: see the note below.
- The new funding-application E2E spec: **2 passed**.
- Three other funding-application specs fail, not because of this change:
  - R2 BUG-038 and R2 BUG-036 are already logged as **E2E-023**;
  - the list's status-filter test is new, logged as **E2E-025** in `docs/e2e/ISSUES.md`.
- The live spec was **not run**. It needs the local fch-api on :8000.

## Open items
- Run `partner-commissions-save.live.spec.ts` against the local API.
- The funding application's split modal is unchanged. It opens at `partner_default_commission`, which the API now works out from the tier.
