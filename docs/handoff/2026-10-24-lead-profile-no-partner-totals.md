# Lead profile — no partner totals in the header (BUG-016)

2026-10-24

## Problem
QA defect log **BUG-016** (OP-LEAD-13, Medium/P2): on Leads › a lead (`/leads/:id`) the header strip showed **Meetings 2 · Total Clients 43 · Invoiced 34 · Subscriptions N/A · Tickets 7** — the same numbers on every lead, a brand-new one included.

The page called `fetchGlobalStats({ id })` → `POST /common/stats`. The API ignores the id: `StatisticsService::getPartnerProfileStats()` counts the **signed-in user's** meetings and their own partner's clients, invoices, tickets and subscription. The strip was the partner profile's header, copied onto the lead page, so it showed the reader's own totals as if they were the lead's.

## Solution
The strip is removed from the lead profile and the totals are no longer fetched. A lead has no clients, invoices or subscriptions of its own — most of the counters cannot apply to it — and showing the partner's totals there misleads. Removing it was preferred over adding lead-specific counters (new endpoint, no agreed set of metrics) or labelling the strip "your totals" (they belong on the dashboard, not on a lead).

The partner profile's own strip (`/admin/partners-profile-states-details-count/:id`, per partner) is unchanged.

## Files changed
- `src/pages/leads/LeadDetails.jsx` — removed the metrics strip, its state, the stats effect and the `ProfileMetricCard`/`ProfileMetricCardSkeleton` imports.
- `src/modules/leads/services.ts` — removed `fetchGlobalStats` (no other caller).
- `tests/pages/leads/LeadDetails.metrics.test.tsx` — new: no strip, no `/common/stats` call on a lead.
- `e2e/sidebar/leads/lead-convert.spec.ts` — "Lead profile - stats" asserted the old behaviour; now asserts no strip and no `/common/stats` call.

## Testing
- New Vitest test failed first (`expected <div …> to be null` — the strip was rendered), passes after the fix.
- `npx vitest run tests/pages/leads` — 10 files, 62 tests passed.
- `npm run typecheck` — clean.
- E2E: see the session report for the `e2e/sidebar/leads/lead-convert.spec.ts` run.

## Open items
- `POST /common/stats` (fch-api `StatisticsController::stats`) now has no caller in the admin panel; the borrower portal and website do not use it either. Left in place — removing an API route is a separate change in fch-api. Its SQL concatenates ids into the query and fails for a user with no `partner_id`; worth fixing or removing there.
- If leads should have counters later, they need their own endpoint (e.g. meetings, activities, funding requests linked to the lead).
- Update BUG-016 in the QA defect log to Fixed once verified on stage.
