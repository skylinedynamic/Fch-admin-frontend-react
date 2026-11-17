# Set partner commissions link (Closed (Completed) modal)

2026-11-17

## Problem
Funding application details › status **Closed (Completed)** › modal › **Partner Commission** strip. When the partner has no commission tiers (or this deal is past the last tier), the strip said "Not set" and the admin kept the whole success fee. It gave no way to go and set the tiers.

## Solution
When no tier applies, the strip now shows a **Set partner commissions** link to Partner profile › Commissions (`/partners/{partner_id}?tab=commissions`). The link opens in a new tab, so the funded amount already typed in the modal isn't lost. It shows only to users who can edit commissions here (host side, `view commission` + `update commission`, the same check as the modal's editable Commission Details), and only when the application has a `partner_id`.

## Files changed
- `src/config/partnerCommission.ts`: new `partnerCommissionPath(partnerId)` helper.
- `src/components/Common/Modals/PartnerCommissionPanel.tsx`: new optional `setCommissionHref` prop; renders the link when there is no tier.
- `src/components/Common/Modals/FundedAmountModal.tsx`: new `setPartnerCommissionHref` prop, passed through to the panel.
- `src/pages/applications/funding/FundingApplicationDetails.tsx`: builds the href; the permission check now uses `COMMISSION_VIEW_PERMISSION`/`COMMISSION_MANAGE_PERMISSION` constants (`canEditClosingCommission`) instead of inline strings.
- `assets/css/funded-amount-modal.css`: `.fam-partner__link` styles (theme primary, 12.5px/600, underline on hover/focus).

## Testing
- Unit: `tests/config/partnerCommission.test.ts` (new); `tests/assets/css/fundedAmountModalPartnerLink.test.ts` (new).
- Integration: `PartnerCommissionPanel.test.tsx` (+4: link when not set, link past last tier, no link with a tier, no link without href); `FundedAmountModal.test.tsx` (+1 pass-through); `FundingApplicationDetails.test.tsx` (+2: href `/partners/7?tab=commissions`, no link without `update commission`).
- Vitest: 36 files / 357 tests passed (config, Modals, pages/applications/funding, assets/css). `npm run typecheck` clean.
- E2E: `funding-application-partner-commission.spec.ts` gained link assertions (present + `target=_blank` when not set; absent when a tier applies). 6/6 passed against a fresh `npm run build` + `vite preview` on :4174.

## Open items
- After the admin sets tiers in the other tab, the modal's data doesn't update by itself. Close it and refresh the page (or refocus, if query refetch-on-focus is on), then open the modal again.
- E2E against the dev server on :5174 (`.env.e2e` `E2E_BASE_URL`) timed out on `page.goto` for every test in the spec, including unchanged ones. That's an environment/dev-server issue, not this change.
