# 2026-11-09 — Lender Information: a fixed lender made Inactive is still shown (SCRUM-434 S434-BUG-05)

## At a glance

| Problem | Solution | Changed |
|---|---|---|
| Funding Application 90 / Funding Request 47 (Closed (Completed), lender R2 Lender A, later made Inactive) showed the lock notice and an empty table: "The assigned lender is not among the lenders matched for this application." | The API now always lists the assigned lender once it is fixed, whatever its status, with `is_active`. The fixed-lender card shows it as before, plus an "Inactive" badge when it is no longer Active. | `src/components/Common/Lender/LenderInformationCard.tsx`, `src/modules/application/types.ts` (backend: `LenderMatchService`, see its handoff `2026-11-09-fixed-inactive-lender-shown.md`) |

## 2026-11-09 — Fixed lender made Inactive

**Problem.** The S434-BUG-02 fix keeps Inactive lenders out of `matched_lenders` (so they cannot be assigned). The locked view (`onlyAssigned`) shows the assigned lender only from that list, so a lender made Inactive after the deal closed disappeared from both detail pages.

**Solution.** Backend lists the fixed lender regardless of status. Here, `MatchedLender.is_active?: boolean` was added, and the fixed-lender card shows an "Inactive" badge next to the product category when `is_active === false`. Nothing changes while the lender can still be chosen: Inactive lenders are still not offered.

**Tests added.** `tests/components/Common/Lender/LenderInformationCard.test.tsx`: "shows a fixed lender made Inactive since, marked Inactive" (failed first), "does not mark an Active assigned lender".

**Verified.** `tests/components/Common/Lender`, `tests/pages/applications/funding`, `tests/pages/applications/funding-request`: 156 passed; `tsc --noEmit` clean.

**Status.** Done.

## Pending
- A soft-deleted assigned lender is still not shown (only Inactive is covered).
