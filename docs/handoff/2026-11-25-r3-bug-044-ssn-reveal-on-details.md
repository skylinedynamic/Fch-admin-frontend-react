# R3-BUG-044: Funding application SSNs revealed through the API

2026-11-25

## Problem
Funding Application details › Ownership Information showed the applicant's and each co-borrower's SSN masked, with an eye button. The full number was already in the details response, and the eye only un-hid that copy, with nothing logged. The Funding Application and Funding Request lists also received full SSNs, dates of birth, EINs and the encrypted SSN that they never show.

fch-api now sends:
- no SSN, date of birth or EIN in either list;
- SSNs masked on the details;
- the full number only from `POST .../funding-application/{id}/reveal`, which logs each reveal.

See `fch-api/docs/handoff/2026-11-25-r3-bug-044-list-apis-no-ssn-masked-details-reveal.md`.

(QA Round 3, R3-BUG-044, High / P1.)

## Solution
- **`SsnValue`** takes an optional `onReveal`. When the value is masked (`***-**-6789`), the eye calls it once, shows the number as `XXX-XX-XXXX`, and hides it again on the next click. A failed reveal leaves it masked.
  - A full value still toggles locally, as before.
  - The last four with nothing to reveal show with no button, as before.
- **Module `application`:**
  - `revealFundingApplicationField` (service);
  - `useRevealFundingApplicationField` (mutation, not cached: each reveal is asked for, and logged);
  - `FUNDING_APPLICATION_REVEAL_FIELD` and the request type.
- **`FundingApplicationDetails`:** the owner's SSN reveals with `field: ssn`, and a co-borrower's with `field: co_borrower_ssn, co_borrower_id`.
- **The lists:** no change was needed. The API's new list rows keep every field the Funding Application, Funding Request, client Funding Applications and client Funding Requests lists use (checked against each page).

## Files changed
- `src/components/Common/SsnValue.tsx`: `onReveal` for a masked value.
- `src/modules/application/types.ts`, `services.ts`, `queries.ts`: the reveal field constants, service and mutation.
- `src/pages/applications/funding/FundingApplicationDetails.tsx`: both SSNs reveal through the API.
- `tests/components/Common/SsnValue.test.tsx`: 2 new tests (reveal once and hide; a failed reveal stays masked).
- `tests/pages/applications/funding/FundingApplicationDetails.test.tsx`: the two Ownership SSN tests now get the masked value, as the API sends it. They check that the eye posts the right reveal (by MSW) and shows the number.
- `e2e/sidebar/intake-review/funding-application/funding-application-ssn-reveal.spec.ts` (new): a masked SSN is revealed from the API on the eye.

## Testing
- The new and updated Vitest tests failed first. After the change:
  - `SsnValue` and `FundingApplicationDetails`: 84 passed;
  - with `tests/pages/applications/funding`, `funding-request`, `tests/pages/clients` and `tests/modules/application`: 314 passed (1 expected fail).
- `npm run typecheck`: clean.
- Playwright mock, `e2e/sidebar/intake-review/funding-application` and `funding-request`: 53 passed, 3 failed. The new spec passes. The 3 failures happen without this change too (checked with the change stashed):
  - `funding-application-details-r2.spec.ts`: R2 BUG-038 and R2 BUG-036;
  - `funding-application.spec.ts`: the status filter.

## Open items
- The 3 failing mock specs above predate this change and are not looked into here.
- Not retested on admin-stage yet.
