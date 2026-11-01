# Commissions shown per viewer: dashboard card, list, detail

**Date:** 2026-10-22
**Branch:** bugfix/all-bugfix
**Author:** awlad

## Problem
The dashboard commission card, the Commissions list and the commission page picked what to show from `is_host` alone. Host staff saw the host's whole book, and partner staff saw the partner's commission. The dashboard card showed one paid total, with nothing about money still owed or paid to staff. The matching `fch-api` change (handoff `2026-10-22-commission-per-viewer.md` there) now sends a `viewer` and only the money that viewer may see.

## Solution
The screens follow the API's `viewer` (`host_owner`, `host_staff`, `partner_owner`, `partner_staff`), resolved by `resolveCommissionViewer()` in `src/modules/commission/viewer.ts`. If the API sends no viewer (an older API or a cached response), it falls back to the old `is_host` owner view.

By request, the dashboard card shows **one figure only** (no pending/unpaid/expected lines), and the Commissions page shows **at most four cards**, the important ones. The API still sends the other figures (`pending_amount`, `paid_to_staff`, `total_funded_amount`, `avg_commission_rate`, …), so a card can be brought back without a backend change.

| | Dashboard card | List cards (≤ 4) | List amount columns | Detail page |
|---|---|---|---|---|
| host owner | **Commission Earned** (host share on funded deals) | Total Commission (whole, host + partners), Host Share, Partner Share, Payouts Due | Admin Comm., Partner Comm. | Total Commission, breakdown, payout |
| partner owner | **Commission Earned** (partner share on funded deals: paid + unpaid) | My Total Commission, Received, Awaiting Payment, Completed Deals | Partner Comm. | Your Commission |
| host staff | **My Commission** (paid + expected) | Received, Awaiting Payment, My Deals, Completed Deals | My Payout | My Commission (their payout), payout box without Pay |
| partner staff | **My Deals** (no money) | My Deals, Completed Deals, My Funded Amount | none | no commission card or breakdown |

"Earned" means commission on funded deals, paid out or not. It comes from the API's `commission.earned_amount`; Pending deals aren't funded yet, so they don't count.

Card titles name whose money each card shows. On the host's page:
- **Total Commission** is the whole commission (`deal_commission_amount`).
- It splits into **Host Share** and **Partner Share**, which add up to the total.
- **Payouts Due** (`payouts_due_amount`) is what the host still has to pay partners and staff on funded deals: the same amounts the Pay button would pay.

An earlier "Payout Due" card showed the host's own share on unpaid deals, which nobody owes anyone. `payouts_due_amount` replaces it.

## Files changed
- `src/modules/commission/viewer.ts`: new; `COMMISSION_VIEWER`, `resolveCommissionViewer()` (exported from the module index)
- `src/modules/commission/types.ts`: statistics and item types for per-viewer fields (`my_payout`, `viewer`, money fields optional)
- `src/modules/dashboard/types.ts`: `DashboardCommission`; `counts.total_commission` optional
- `src/pages/dashboard/components/CommissionKpiCard.tsx`: new; the per-viewer card, falling back to the plain total for an older API
- `src/pages/dashboard/Dashboard.jsx`: both commission KPIs replaced by `CommissionKpiCard`
- `src/pages/commissions/components/commissionCards.ts`: new; list cards per viewer
- `src/pages/commissions/CommissionList.tsx`: cards and amount columns from the viewer
- `src/pages/commissions/CommissionDetails.tsx`: commission card, payout box and breakdown from the viewer

## Testing
- Added:
  - `tests/modules/commission/viewer.test.ts` (unit)
  - `tests/pages/dashboard/components/CommissionKpiCard.test.tsx` (each viewer, legacy fallback, loading)
  - `tests/pages/commissions/CommissionDetails.viewer.test.tsx` (host staff, partner staff)
  - a partner-staff case in `tests/pages/dashboard/Dashboard.test.tsx`
- Rewrote `tests/pages/commissions/CommissionList.cards.test.tsx`: cards and columns for all four viewers.
- The new unit, component and list tests failed first and pass now. The Dashboard page case was added after the card was wired in.
- `tests/pages/commissions`, `tests/pages/dashboard`, `tests/modules/commission`, `tests/modules/dashboard`: 11 files, 41 tests passed. `npm run typecheck` passed.
- E2E: added host staff and partner staff cases to `e2e/sidebar/commissions/commissions.spec.ts`. **Not run**: this machine has no Playwright browser (`npx playwright install chromium`). Existing specs don't send `viewer` and rely on the fallback.

## Open items
- Run the Playwright commission specs once the browser is installed.
- The cards don't filter the table on click yet (proposed, not built).
- The `fch-api` follow-ups apply here too, especially locking down the compensation endpoints so host staff can't raise their own rate.
