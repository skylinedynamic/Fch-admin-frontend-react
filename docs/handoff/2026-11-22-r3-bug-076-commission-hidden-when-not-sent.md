# R3-BUG-076: commission screens when the API sends no commission

2026-11-22

## Problem
fch-api now sends commission money only to those who may see it (fch-api handoff `2026-11-22-r3-bug-076-059-commission-only-to-who-may-see-it.md`).
- The host owner, and host staff with `update commission`, get everything.
- A partner owner gets its own share.
- Other staff get none.

Two host screens assumed the fields were always there. For host staff without `update commission` they would have said "No commission was set" / "No commission is set for this application." even when one was set:
- the funding application's Closed (Completed) summary;
- the Closed (Completed) modal.

## Solution
- `sendsWholeCommission(app)` (`src/config/partnerCommission.ts`) checks whether the API sent the whole commission (the key is present; `null`, meaning not set yet, still counts).
- `ClosedApplicationSummary`, host view: without the commission, it shows only the requested and funded amounts. No commission rows, no "No commission was set".
- `FundedAmountModal`: new `showsCommission` prop (default `true`). When false, the modal asks for the funded amount only: no partner tiers panel, no Commission Details, no fee lines, and `onConfirm` gets `null`.
- `FundingApplicationDetails` passes `showsCommission={canEditClosingCommission || sendsWholeCommission(app)}`.
- The partner screens already used only the partner's own fields, so they are unchanged. Partners can't choose Closed (Completed).

## Files changed
- `src/config/partnerCommission.ts`: `sendsWholeCommission`.
- `src/pages/applications/funding/components/ClosedApplicationSummary.tsx`: no commission section when it wasn't sent.
- `src/components/Common/Modals/FundedAmountModal.tsx`: `showsCommission` prop.
- `src/pages/applications/funding/FundingApplicationDetails.tsx`: passes it.
- `tests/components/Common/Modals/FundedAmountModal.test.tsx`: new test, the funded amount only when `showsCommission={false}`.
- `tests/pages/applications/funding/ClosedApplicationSummary.test.tsx`: new test, host staff with no commission sent see no commission and no "not set".
- `tests/pages/applications/funding/FundingApplicationDetails.test.tsx`: the "no link without update commission" test now uses the API's new shape for that user (no tiers, no money). It asserts no Partner Commission panel, no link and no Commission Details.

## Testing
- The 2 new tests failed first, then passed.
- Full Vitest: 465 files, 3567 passed plus 2 expected failures. `npm run typecheck` is clean.

## Open items
- Deploy with the fch-api change.
