# BUG-057: converting a lead that another tab already converted

2026-11-02

## Problem
QA flow R2-PP-LEAD-03, Partner portal › Leads › Convert to Borrower. The second conversion of an already-converted lead (from a stale tab) answered HTTP 500. No message was seen, and the dialog stayed open with its button active.

## Solution
fch-api now refuses it with **422** "This lead has already been converted." (see the fch-api handoff). The same applies to the other refusals the partner can act on: email already a client, missing contact details.

On the Leads list (`Leads.jsx`), a 422 with no field errors now:
1. closes the Convert dialog;
2. opens a "Lead Not Converted" dialog with the API's reason (no toast);
3. reloads the list when its button, **"Reload list"**, is clicked.

The dialog reuses `DeleteBlockedModal` with `closeLabel` (added for BUG-041). Field errors (422 with `errors`) still show inside the Convert dialog. Other failures (500) still show a toast.

Lead details has no Convert button: `handleConvertClick` in `LeadDetails.jsx` isn't wired to anything, so it was not changed.

## Files changed
- `src/pages/leads/Leads.jsx`: `convertRefused` state, the 422 branch and the dialog.
- `tests/pages/leads/Leads.convertAlreadyConverted.test.tsx`: new integration test.
- `e2e/sidebar/leads/lead-convert.spec.ts`: new BUG-057 spec. The 500 spec's message changed from "Lead already converted." to "Conversion service is down.", because that case is now a 422.

## Testing
- New integration test: red before, green after.
- `tests/pages/leads`: 15 files, 74 passed. `npm run typecheck`: clean.
- Playwright `e2e/sidebar/leads`: 45 passed, 3 failed. The 3 failures were already failing; they fail the same with this change stashed:
  - `leads.spec.ts` › "a complete lead opens the convert dialog": strict-mode clash on "Convert Lead to Borrower", which matches both the owner-alert title and the convert dialog title.
  - `leads.spec.ts` › "Contact Person is required before anything is posted".
  - the live sidebar spec, which needs the running backend and a real session.

## Open items
- Fix the 2 failing `leads.spec.ts` mock specs: stale selectors, not app defects.
- Lead details' unused `handleConvertClick` / `handleConvertConfirm`: wire them to a button or remove them.
- Update the QA sheet: BUG-057 → Fixed, ready for retest.
