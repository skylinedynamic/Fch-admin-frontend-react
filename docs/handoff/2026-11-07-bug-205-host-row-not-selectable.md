# BUG-205: the host company's row cannot be ticked in Partners

**Date:** 2026-11-07

## Problem
The host company is listed in Partners (kept on purpose, not counted in the cards) and its row could be ticked. Archive Selected then reported success while the API skipped it.

## Solution
- **Panel:** the Partners table has `isDataSelectable={(e) => !e.data?.is_host}`. PrimeReact disables that row's checkbox (greyed, `disabled` input), and a click selects nothing, so archive and delete never send the host. `is_host` was already on each row (`PartnerResource`).
- **API:** refuses a selection with the host, with a message (fch-api `docs/handoff/2026-11-07-bug-205-host-company-cannot-be-archived.md`).

## Files changed
- `src/pages/partners/Partners.jsx`: `isDataSelectable` on the table.
- `tests/pages/partners/Partners.hostRow.test.tsx` (new, 2 tests):
  - the host's checkbox is disabled (another partner's is not)
  - clicking it selects nothing, so archive sends only the other partner
- `e2e/sidebar/partners/partners-host-row.live.spec.ts` (new): real list, search "Four Corner Holdings". The host's checkbox is disabled, a click shows no Actions, and archive or delete of the host sent to the API answers 422 with the message.

## Testing
- **Vitest:** both new tests failed without the change (checkbox enabled; `ids: [1, 5]`), then passed. `tests/pages/partners`: 69 passed. Full suite: 2767 passed, 2 expected fail (380 files).
- `npm run typecheck`: clean.
- **Live spec:** failed on the old code ("Received: enabled"), then passed.
- **`e2e/sidebar/partners/`:** 84 of 85 passed. The one failure is `partner-new-email.live.spec.ts`: it needs a local partner 53 (`E2E_PARTNER_ID`, default 53) and the local DB's highest partner id is 42. With `E2E_PARTNER_ID=41` it passed. Not related to this change.

## Open items
- Not committed.
