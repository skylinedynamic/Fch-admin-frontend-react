# BUG-058: converted onto an existing client, show that client and their real plan

2026-11-02

## Problem
QA flow R2-OP-EMB-04 / R2-PP-EMB-07, Embedded Form › Loan Applications › details. A submission whose email belongs to an existing client was converted: Convert › Existing Borrower Found › Confirm & Create Funding Application. Afterwards:
- the header badge said "FREE PLAN BORROWER";
- the Linked Borrower card showed the submitted applicant's name (e.g. "QA-TEST R2 Host Embed Two") with a "FREE PLAN" badge.

But client 144 is on a One Time Payment plan and client 159 is paid. The data was correct (application 94 was created under client 144); only the labels were wrong.

Causes:
- After converting, the page built the "linked borrower" itself from the submitted name and `is_free_trail ?? true`.
- The header, Linked Borrower and list badges were hard-coded to "Free Plan" for every converted row.

## Solution
Decisions (Awlad, 2026-11-02):
- The header shows the client: name, business, email, phone and plan.
- The Loan Applications list keeps the submitted name.
- A paid client's plan is its enrollment type.

Changes:
- **fch-api:** `converted_borrower` now also sends `email`, `phone`, `business_name` and `enrollment_type` (from the client's latest subscription). See the fch-api handoff of the same date.
- **Details page:** after converting, it re-reads the application from the API instead of guessing. Once converted:
  - the header and the Linked Borrower card show the client (`converted_borrower`) and their real plan;
  - the form answers below stay as submitted;
  - the timeline reads "Converted to Client · Linked to {client}".
- **List:** a converted row keeps the submitted name, and its badge names the client's real plan.
- **New helper** `getBorrowerPlanBadgeConfig` (in `utils/badgeHelper.ts`):
  - free client → "Free Plan", or "Free Plan Expired" once its end date has passed;
  - paid client → its enrollment type (e.g. "One Time Payment");
  - paid client with no enrollment → "Regular Plan" (new constant `REGULAR_PLAN_LABEL` in `config/borrower.ts`).

Converting onto an existing client never renames it. Only blank profile fields are filled, and only with consent (BUG-064).

## Files changed
- `src/utils/badgeHelper.ts`: `getBorrowerPlanBadgeConfig`.
- `src/config/borrower.ts`: `REGULAR_PLAN_LABEL`, now also used by the Clients plan filter.
- `src/modules/embed-form/types.ts`: `ConvertedBorrower` type.
- `src/pages/embed-form/EmbedFormSubmissionDetails.tsx`: header, Linked Borrower and timeline show the client; reloads after a conversion.
- `src/pages/embed-form/EmbedFormSubmissions.tsx`: the list's plan badge.
- `tests/utils/borrowerPlanBadge.test.ts`: new, 4 tests.
- `tests/pages/embed-form/EmbedFormSubmissionDetails.test.tsx`: 3 new tests.
- `tests/pages/embed-form/Submissions.list.test.tsx`: the converted row now carries its client's plan.
- `e2e/embed-form-convert-existing-borrower.spec.ts`: the mocked GET answers converted once confirmed; new BUG-058 spec.
- `e2e/sidebar/embedded-form/loan-applications/loan-applications.spec.ts`: badge spec now expects the real plan and the submitted name.

## Testing
- Vitest embed-form + helper: 8 files, 60 tests passed. The new tests failed before the change (7 red).
- `npm run typecheck`: clean.
- Playwright `embed-form-convert-existing-borrower.spec.ts` + `loan-applications.spec.ts`: 33/33 passed (`--workers=2`).

## Open items
- The page's fallback toasts still say "Free Plan Borrower" when the API sends no message. The API always sends one.
- `EmbedFormSubmissionDetails.tsx` still calls the module's `services.ts` directly rather than query hooks. That was not changed here.
- Update the QA sheet: BUG-058 → Fixed, ready for retest.

## Follow-up (same day, after the first retest)
- **The list still said "Free Plan".** The real list endpoint, `EmbedFormController::fetchSubmissions`, never loaded the converted client. The first change had gone into `EmbedFormService::getSubmissions()`, which this screen doesn't use, and the frontend tests mocked a response that already included the client. Fixed in fch-api (see its handoff). The list's fallback now says "Converted" when the client is missing, never a guessed "Free Plan". New test: `tests/pages/embed-form/Submissions.planBadge.test.tsx`.
- **Rejected rows:** the Action column shows a red "Rejected" badge (hover: "Rejected applications cannot be converted. Change the status to convert it.") instead of a disabled "Convert to Free Plan Borrower" button. `EmbedFormSubmissions.test.tsx` (BUG-098 test) was updated to the new behaviour.
- **Applicant column:** shows only the avatar and the name. The business/occupation and `#uid` line under it is gone.
- Tests: Vitest embed-form + helper 49 passed; typecheck clean; Playwright `loan-applications.spec.ts` + `embed-form-convert-existing-borrower.spec.ts` 35/35 passed (2 new list specs).
- **Details page, rejected application:** the "Rejected applications cannot be converted…" line under the disabled Convert button pushed the button out of line with the Status select. The hint is now a hover tooltip on a wrapper (a disabled button gets no hover) and a visually hidden accessible description. The button lines up with the select again. Tests: `EmbedFormSubmissionDetails.test.tsx` (rejected case updated) and a new E2E alignment check in `loan-applications.spec.ts`; Vitest embed-form 45 passed, Playwright 36/36 passed.
