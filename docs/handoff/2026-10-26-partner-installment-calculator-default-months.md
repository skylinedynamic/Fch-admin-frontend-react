# Partner create — the installment calculator takes its default months from the plan (BUG-114)

**Date:** 2026-10-26
**Branch:** bugfix/all-bugfix
**Author:** awlad

## Problem
QA defect log **BUG-114** (OP-PART-34): Add Partner › Certified Partner › Installment showed 12 months × $458.06. QA expected 11 × $499.70, taken from fch-api `config/enrollment.php`.

**Findings:**
- `config/enrollment.php` was read by nothing; plan prices and months come only from the database (Plan & Fee).
- The active Certified/WL **Installment** plan has Installment Upto = 24. The rule "start at 12, or at the plan's limit when lower" (API `installment_default_months`, form `defaultInstallmentMonths`) gives 12 months, so 12 × $458.06 is correct for the data.
- The 11-month plans ("Payment Plan (11-month plan)") are inactive and no longer used.

**Separately:** the calculator modal was passed `defaultMonths={selectedPlan?.total_installments_count || 12}`, a field the API never sends, so it was always 12. Nothing showed wrong, because the form always opens the calculator with its own applied months, and `installmentDefaultMonths` carried the API value.

## Solution
- **BUG-114 is by design.** The expected result comes from Plan & Fee: Installment Upto 24, so it starts at 12 months.
- **fch-api:** `config/enrollment.php` deleted, so it can't be mistaken for the source of truth again.
- **Admin:** `PartnerInformationSection.jsx` passes the calculator `defaultInstallmentMonths(selectedPlan)`, the same helper the installment card uses, as both `defaultMonths` and `installmentDefaultMonths`. The card and the calculator can no longer disagree. This is a refactor: no visible change.

## Files changed
- fch-api `config/enrollment.php`: deleted (no references).
- `src/pages/partners/components/PartnerInformationSection.jsx`: calculator months from `defaultInstallmentMonths`.
- `tests/pages/partners/PartnerProfile.installment.test.tsx`: +2 tests.

## Testing
- **New:** the calculator opens at the plan default, 12 Months for Installment Upto 24 and 6 Months for 6. Written before the refactor (green, since behaviour doesn't change) and still green after it.
- **Admin:** full Vitest suite, 254 files, 1,786 passed. `npm run typecheck` clean.
- **fch-api:** `--filter "Partner|Enrollment|Subscription"`, 780 passed after deleting the config.

## Open items
- **QA sheet:** BUG-114 → by design (it was marked Fixed).
- **If Installment should start at 11:** set Installment Upto = 11 in Plan & Fee. That makes 11 the maximum too.
