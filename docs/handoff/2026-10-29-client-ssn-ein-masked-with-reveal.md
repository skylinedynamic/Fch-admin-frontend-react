# Client SSN and Business EIN masked, revealed on the eye button (BUG-014, reopened)

Date: 2026-10-29

## Problem
Owner › Clients › Client Info (`/clients/:id`). The QA retest on 28-Oct left BUG-014 open:
- **Business EIN:** shown in full as a plain input, with no mask or reveal.
- **API:** `GET /common/borrowers/{id}` sent the full SSN and EIN, so the masked SSN field was only hiding a number already in the page.
- **Change Requests** (first report, 19-Oct): an EIN change showed its old and new numbers in full.

## Solution
fch-api now sends both numbers masked and reveals one at a time (fch-api handoff of the same name). The portal follows that:
- **Two shared components:**
  - `RevealableInput` (form field): the mask shows read-only. The eye button fetches the number, writes it out (XXX-XX-XXXX / XX-XXXXXXX) and opens it for editing; the eye again hides it, and showing it again fetches nothing new. With no number on file it is a plain input, written out as typed. A failed reveal leaves the mask.
  - `RevealableValue` (read-only): the same for the details modal.
- **Client Info:** SSN and Business EIN both use `RevealableInput`. Loading keeps a mask as it comes; it no longer runs `formatSSN` / `displayEIN` over it.
- **Client details modal:** SSN and EIN use `RevealableValue`. `InfoItem` moved out of the modal: defined inside it, every re-render (a reveal's loading state) remounted the value and lost what was revealed.
- **Saving:** `mapClientUpdatePayload` leaves out an SSN or EIN that is still the mask. The API ignores one too.
- **Change Requests:** the review's current and requested values moved to `components/ChangeRequestValues.tsx`. For an SSN or EIN change (`is_masked`), one "Show numbers" button reveals both, written out, and hides them again. The list shows the masks.
- **Data layer:** `revealClientField` / `useRevealClientField` (client module) and `revealChangeRequest` / `useRevealChangeRequest` (change-request module). These are mutations, not cached queries: each reveal is a deliberate, logged look.
- Helpers: `maskEIN()` (same form as the API's) and `isMaskedValue()` in `utils/borrowerFormatters.ts`; `CHANGE_REQUEST_SSN_FIELDS` in the change-request types.

## Files changed
- `src/components/Common/RevealableInput.tsx`, `RevealableValue.tsx` (new)
- `src/utils/borrowerFormatters.ts`: `maskEIN`, `isMaskedValue`
- `src/modules/client/services.ts`, `queries.ts`, `types.ts`: `revealClientField`, `useRevealClientField`, `RevealableClientField`
- `src/modules/client/logic.ts`: an unrevealed mask is left out of the update
- `src/modules/change-request/services.ts`, `queries.ts`, `types.ts`: `revealChangeRequest`, `useRevealChangeRequest`, `is_masked`, `ChangeRequestRevealed`, `CHANGE_REQUEST_SSN_FIELDS`
- `src/pages/clients/components/ClientInfoSection.tsx`: both fields are `RevealableInput`; masks kept on load
- `src/pages/clients/components/ClientDetailsModal.tsx`: `RevealableValue`; `InfoItem` at module level
- `src/pages/applications/change-requests/ChangeRequests.tsx`: uses `ChangeRequestValues`
- `src/pages/applications/change-requests/components/ChangeRequestValues.tsx` (new)

## Testing
New, each red first:
- `tests/components/Common/RevealableInput.test.tsx` (5)
- `tests/components/Common/RevealableValue.test.tsx` (2)
- `tests/utils/borrowerFormatters.test.ts` (3)
- `tests/pages/applications/change-requests/ChangeRequests.reveal.test.tsx` (3)
- `tests/modules/client/services.test.ts` (+1)
- `tests/modules/change-request/services.test.ts` (+1). Its first run failed on a syntax slip in the test itself, so this one was not seen red against missing code.
- `tests/modules/client/logic.test.ts` (+2): the mask is left out; a revealed or typed number is sent.

Updated for the API's new shape (MSW now serves masks and the reveal):
- `tests/pages/clients/components/ClientEinFormat.test.tsx`: Client Info and the modal show both masked and reveal each by field.
- `tests/pages/applications/fundapplication/components/ssnFields.test.tsx`: the Client Info SSN case.

E2E (mock):
- New `e2e/sidebar/clients/client-ssn-ein-reveal.spec.ts` (4): masked and read-only, with no reveal on open; the EIN eye reveals the EIN only; the SSN eye reveals and hides; a save without revealing sends neither.
- `e2e/sidebar/intake-review/change-requests/change-requests.spec.ts` (+1): an EIN change is listed masked and revealed in the review.
- Clients plus change-requests: 126 of 127 passed. The one failure is `clients-list.spec.ts › partner filter sends the partner id`, the known E2E-016.

Runs:
- `npm run typecheck`: clean.
- Clients, applications, components/Common, client and change-request modules, utils: 477 Vitest, all passing after the updates.
- Full suite: see the session report.

## Open items
- Retest BUG-014 on stage once both repos deploy; the sheet still says "Reopened".
- `SsnInput` / `SsnValue` stay for screens that still get a full SSN: the funding application, co-borrowers and credit profile requests. Masking those needs the API to change first.
- The client list and other screens reading `business_ein` from other endpoints were not checked for a full EIN.
