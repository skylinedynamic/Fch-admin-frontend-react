# Configuration guard — a Certified partner without an active gateway is stopped on Clients and Leads (BUG-115)

**Date:** 2026-10-26
**Branch:** bugfix/all-bugfix
**Author:** awlad

## Problem
QA defect log **BUG-115** (PP-CERT-04): a Certified partner with every payment gateway inactive could open Add Client and Leads › create; no Configuration Incomplete modal.

## Solution
No admin code change. `ConfigurationGuardModal` already stops a Certified partner when `is_fresh_payment` is missing. The API sent the host's flag instead of the partner's own; that is fixed in fch-api (`docs/handoff/2026-10-26-certified-partner-payment-flag-is-its-own.md`). Tests were added here for the pages QA used.

## Files changed
- `tests/components/Common/ConfigurationGuardModal.test.tsx`: +3 tests.

## Testing
- **New:**
  - a Certified partner with `is_fresh_payment: null` (what the API sends now) gets the modal with Payment Integration on `/clients/create` and `/leads/create`;
  - missing branding alone does not stop a Certified partner (its branding is the host's).
- 19 passed. `npm run typecheck` clean.

## Open items
- A signed-in partner's flags are cached (`app-config-store`) until the theme is fetched again. Re-login or reload after changing gateways.
- QA sheet: BUG-115 → Fixed after the stage retest.
