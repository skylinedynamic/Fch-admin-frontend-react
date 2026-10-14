# 2026-10-12 — API answers for screens the UI blocks — what each endpoint returns

**Date:** 2026-10-12  
**Title:** API answers for screens the UI blocks — what each endpoint returns  
**Repositories:** API — `fch-backend-api`, Admin — `Fch-admin-frontend-react`, both on branch `e2e-missing-tests`. **Nothing is committed.**  
**Summary, pending items and test data for this date:** [2026-10-12-summary-pending-and-test-data.md](2026-10-12-summary-pending-and-test-data.md)

Each entry: date and title, then the problem, the solution, the files touched, how it was verified and a status.

## At a glance — issue, solution and what was changed

| # | Issue faced | Solution | What was changed (files) | Status |
|---|---|---|---|---|
| 34 | The all-modules pass recorded 17 cases where an account is kept off a screen by the admin app but the list endpoint behind that screen still answers 200 for it. | Each of the six endpoints was called as all six accounts and the returned rows were checked for which partner they belong to. | None changed. | Information — no cross-partner exposure found. |

## 2026-10-12 — 34. Seventeen cases where the API answered for a screen the UI blocks

- **Problem:** The all-modules pass recorded 17 cases where an account is kept off a screen by the admin app but the list endpoint behind that screen still answers 200 for it. The question was whether any of them hands one partner another partner's data.
- **Solution:** Each of the six endpoints was called as all six accounts and the returned rows were checked for which partner they belong to. None returns another partner's data. Verification center and Funding requests return only the caller's own partner's rows (the host sees all partners). My subscription returns the caller's own partner's subscription; the UI shows that screen to the partner account only, but the partner's employees get the same data from the API. Plan & fee is refused (403) for partners and answers for a host employee, whom the UI keeps off the screen. Capital access returns the host's catalogue of programmes (10 rows, all owned by the host) and Funding sequences returns the platform catalogue (16 rows, no partner on them) — the same lists for every account.
- **Files:** None changed.
- **Verified:** Browser session per account with direct API calls to `/common/credit-builder/verification-center-fetch-all`, `/common/funding-request`, `/common/my-subscription`, `/admin/plan-fee/fetch-subscription-plans`, `/common/capital-accesses/fetch-all` and `/common/funding-sequencings/fetch`.
- **Status:** Information — no cross-partner exposure found. Whether the two catalogues and the subscription endpoints should also be refused for accounts the UI blocks is a product decision, kept as pending item P3.
