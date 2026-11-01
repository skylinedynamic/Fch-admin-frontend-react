# Clients › Capital Access — the estimate is labelled "Estimated Remaining Access" (BUG-031)

**Date:** 2026-10-26
**Branch:** bugfix/all-bugfix
**Author:** awlad

## Problem
QA defect log **BUG-031** (CP-CAP-04), retest on 26 Oct: Owner › Clients › Capital Access showed Estimated Total Access $1,365,000 for both Laborum (score 78) and Michael Chen (score 88), and client 144 (score 83) showed $1,865,000.

The API adds up the maximum exposure of every play the client qualifies for, leaving out plays already completed. Qualifying clients get each play's full maximum, and completed plays lower the figure.

## Solution
**Decision: keep the calculation and say it is what remains.** The card is now titled **"Estimated Remaining Access"**, with the line "From the plays the client qualifies for and has not completed yet". It matches the client portal.

## Files changed
- `src/pages/clients/components/CapitalAccessSection.tsx`: title and explanatory line.
- `tests/pages/clients/components/CapitalAccessSection.access.test.tsx`: new, 1 test.

## Testing
- **New:** the title, the amount and the remaining-plays line (failed first).
- `tests/pages/clients`: 38 passed. `npm run typecheck` clean.


## The amount reads short (follow-up)
The card shows the API's `estimated_total_access_compact` ($1.37M; fch-api now sends it on `/common/borrowers/{id}/capital-access-overview` too), with the full amount on hover. It falls back to the full amount without it.

**Tests:** the access test now expects "$1.37M" with the title "$1,365,000.00" (failed first). `tests/pages/clients`: 38 passed. Typecheck clean.

## Open items
- QA sheet: BUG-031 → Fixed (wording, as decided). The amount is unchanged by design.
