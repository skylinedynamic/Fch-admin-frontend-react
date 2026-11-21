# Partner profile › Subscription shown as details, not a table

2026-11-21

## Problem
Partner profile › Subscription showed the partner's subscription in a sortable, paginated `DataTable`. A partner has only one subscription, so this was a one-row table that scrolled sideways, with a paginator and the word "Null" for missing values (for example an empty Start Date).

## Solution
The table is replaced by `SubscriptionDetailsSection`, which shows the one subscription as label/value details (`<dl>`, three columns on xl, two on md):
- **Fields:** Partner Type, Enrollment Type, Status, Total Amount, Installment Balance (Installment plans only), Platform Fee, Start Date, End Date.
- **Status:** a badge coloured from `SUBSCRIPTION_STATUS_COLORS` (config), the same as the Subscriptions screens. A status not in that map (e.g. `Past Due`) gets `secondary`.
- **Missing values:** shown as `—`, never "Null".
- **No subscription:** "No subscription found".
- **Older partner with more than one row:** the latest (highest id) is shown.
- **BUG-126 rules kept:** Total Amount is `payable_amount`, the whole enrollment. Installment Balance is `total_subscription_amount`. A One Time Payment has no balance row.

**One subscription per partner, confirmed in fch-api.**
- `SubscriptionCreationService` and `SubscriptionService` save the partner's subscription with `updateOrCreate` keyed on `entity_type` + `entity_id`.
- User-seat subscriptions belong to the Employee/User, not to the partner.
- The local DB has no partner with more than one row.

## Files changed
- `src/pages/partners/components/SubscriptionDetailsSection.tsx`: new (TypeScript), replaces the table
- `src/pages/partners/components/SubscriptionListSection.jsx`: removed
- `src/pages/partners/components/PartnerForm.jsx`: the Subscription tab renders the details section
- `src/modules/partner/types.ts`: `PartnerSubscription` (the API's `subscriptions[]` item)
- `tests/pages/partners/components/SubscriptionDetailsSection.test.tsx`: new. It replaces `SubscriptionListSection.test.tsx` (removed with its component) and carries over its BUG-126 assertions.
- `e2e/sidebar/partners/partner-subscription.spec.ts`: new

## Testing
- Unit/integration: `SubscriptionDetailsSection.test.tsx`, 5 tests. Written first and seen failing (the component didn't exist), now passing.
- `vitest run tests/pages/partners tests/modules/partner`: 27 files, 215 passed
- `npm run typecheck`: clean
- Playwright mock `partner-subscription.spec.ts`: 2 passed (after `npm run build`)

## Open items
- `SUBSCRIPTION_STATUS_COLORS` has no `Past Due` (fch-api `Subscription::STATUS_PAST_DUE`), so it falls back to the grey badge. Add it to the config if it should be coloured.
- fch-api still sends `subscriptions` as an array. A single `subscription` object would match the data model better. That's an API change, left as is.
