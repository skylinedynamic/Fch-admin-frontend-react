# Add Client on a free trial: the Limited Free Plan only (BUG-142)

2026-10-29

## Problem
A partner on a free trial could add a paid client through Clients › Add Client. QA saw "Activate Limited Free Plan" off, and locked, with Enrollment Type open below it. "One Time Payment" saved a paid client and both its invoices. Leads › Convert to Borrower on the same partner offers only the Limited Free Plan.

**Cause, on the screen side.** For a partner on a free trial, `ClientInfoSection` turns the Limited Free Plan on and locks the switch. But it turned it on in a one-off sync when the form opened, and only if `userSubscription` was already known.
- `userSubscription` is not kept in localStorage (`authStore` persists only the token and user). `App.jsx` fetches it again (`/common/user-details`) after the page loads.
- So on a fresh load of `/clients/create` the sync ran before the trial was known and left the switch off.
- When the subscription arrived, the switch locked, still off. The paid Enrollment Type stayed open.
- The API never checked either (see the fch-api handoff of the same date).

## Solution
- **A second effect in `ClientInfoSection`:** on a new client, whenever the partner is known to be on a free trial and the plan is not already on, it turns the Limited Free Plan on. That holds whenever the subscription arrives.
  - The switch is then on and locked, and Enrollment Type is hidden, as on Convert Lead.
- **The API's `is_free_trail` error** (the "Paid Version" answer) now shows under the switch. `ClientDetails` already maps 422 errors onto fields, but nothing rendered this one.

## Files changed
- `src/pages/clients/components/ClientInfoSection.tsx`: the effect that turns the plan on once the trial is known, and the `is_free_trail` error under the switch.
- `tests/pages/clients/components/ClientFreeTrialPartnerAddClient.test.tsx` (new).
- `e2e/sidebar/clients/client-free-trial-partner-add.spec.ts` (new).

## Testing
- **Vitest:** `ClientFreeTrialPartnerAddClient.test.tsx` (3 tests).
  - With the subscription arriving after the form opens, the switch turns on and Enrollment Type is gone. Red first: the switch stayed off.
  - The API's Paid Version message shows under the switch. Red first.
  - A partner not on a trial keeps the switch off.
  - With the other `ClientInfoSection` suites (`ClientEnrollmentPartnerFee`, `ClientEinFormat`, `ClientAssignTo`): 12 passed.
- **E2E:** `client-free-trial-partner-add.spec.ts` (mocked; `/common/user-details` answers 1.5s late). Add Client has the switch on and no Enrollment Type. It failed with the new effect switched off, and passes with it.
  - Run with `client-assignee-team`, `client-save-stays-on-tab`, `clients` and `leads`: 74 passed, 3 failed.
  - The 3 failures are all in `e2e/sidebar/leads`, which this change does not touch (`src/pages/leads` is unchanged in the working tree). Two are `leads.spec.ts` strict-mode failures (two modal titles match), and one is a `[live]` spec that needs the live backend.
- `npm run typecheck`: clean.

## Open items
- The three failing leads specs above were already failing.
