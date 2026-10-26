# Client and Lead pages say "Not Found" for a record that is not yours (BUG-030)

Date: 2026-10-26

## Problem
On a partner's domain (e.g. Wanda), opening another partner's client (`/clients/136`) showed an empty Client Profile form with zero counters and no message. Opening another partner's lead (`/leads/175`) showed an empty page and a "Failed to load lead details" toast. No data leaked: the API already answers 404 (`BorrowerController::show`, `LeadController::show`), but neither page handled it.

## Solution
Both pages now show the same `ErrorPage` (404) that Invoice details uses when the API answers 404 or 403: "Client Not Found" / "Lead Not Found". Other load errors on the lead page still show the toast as before.

## Files changed
- `src/pages/clients/ClientDetails.tsx`: reads `useClient`'s error; 404/403 renders `ErrorPage`.
- `src/pages/leads/LeadDetails.jsx`: 404/403 on load sets `notFound` and renders `ErrorPage` (no toast).
- `tests/pages/clients/ClientDetails.notFound.test.tsx`: new.
- `tests/pages/leads/LeadDetails.notFound.test.tsx`: new.
- `e2e/sidebar/clients/client-not-found.spec.ts`, `e2e/sidebar/leads/lead-not-found.spec.ts`: new mock specs.

## Testing
- New Vitest tests failed first (2 failed), then passed. `tests/pages/leads` + `tests/pages/clients`: 104/104. Full suite: 261 files, 1819 passed (2 expected fail).
- `npm run typecheck`: clean.
- Mock E2E `e2e/sidebar/clients` + `e2e/sidebar/leads`: 136 passed, 2 failed. The 2 failures predate this change and fail without it too: `clients-list.spec.ts:127` (partner filter click times out) and `leads.spec.ts:143` ("Convert Lead to Borrower" matches two modal titles).

## Open items
- The two pre-existing mock E2E failures above.
