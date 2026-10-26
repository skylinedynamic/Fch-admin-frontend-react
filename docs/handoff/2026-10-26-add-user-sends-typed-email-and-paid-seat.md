# Users › Add User — a bought seat is sent as paid, with the email typed (BUG-123)

**Date:** 2026-10-26
**Branch:** bugfix/all-bugfix
**Author:** awlad

## Problem
QA defect log **BUG-123** (found 21 Oct on stage): a Certified partner's 4th user, a bought seat paid by Cash (Processing), was Active straight away, and the user got the employee record's email instead of the one typed in the form.

The current `UserDetails.jsx` already sends `is_paid: true` and `months` for a bought seat, and the email from the form (choosing an employee only pre-fills it). The API keeps that user inactive until the seat invoice is paid (fch-api handoff, same date). `origin/stage` already has this code. QA's report (21 Oct) predates it and has not been retested.

## Solution
No code change. A test covers the email.

## Files changed
- `tests/pages/users/UserDetails.create.test.tsx`: +1 test.

## Testing
- **New:** pick an employee (email pre-filled), change the email, save → the request carries the typed email. The existing test already covers `is_paid: true, months: 3` for a bought seat.
- `tests/pages/users`: 18 passed.

## Open items
- **QA sheet:** BUG-123 → Ready for Retest on the current stage.
