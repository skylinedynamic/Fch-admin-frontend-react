# Business Financials saves the USD it shows (BUG-077)

Date: 2026-10-27

## Problem
On a client's Business Financials (`/clients/:id`), Currency displayed `formData.currency || 'USD'`, but the save sent the stored value. A client with no currency therefore showed USD to the owner and saved nothing. The client's own Profile › Financial tab then showed an empty, required "Select currency".

## Solution
The save sends what the field shows: the stored currency, or USD when none is stored. USD lives in one constant, `DEFAULT_BORROWER_CURRENCY` in `src/config/borrower.ts`, used for both the display and the save. The client portal applies the same default (see its handoff of the same date).

## Files changed
- `src/config/borrower.ts`: `DEFAULT_BORROWER_CURRENCY`.
- `src/pages/clients/components/BusinessFinancialsSection.tsx`: display and payload use the default.
- `tests/pages/clients/components/BusinessFinancialsSection.test.tsx`: 2 new cases (no stored currency saves USD; a stored one is kept).

## Testing
- The new case failed first, then passed. Full Vitest: 262 files, 1824 passed (2 expected fail).
- `npm run typecheck`: clean.
- Mock E2E `client-profile-tabs` + `verification-center`: 48/48.
- BUG-083 (rejection reason) needed no admin change. The Verification Center summary shows the API's message, which is now "Rejected: <reason>".

## Open items
- BUG-081 (attendee shown after saving) was not reproducible on this branch with the mocked flow: the next new appointment shows "Select Users". No change was made.
