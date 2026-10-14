# 2026-10-12 — E2E test suite — spec and configuration changes

**Date:** 2026-10-12  
**Title:** E2E test suite — spec and configuration changes  
**Repositories:** API — `fch-backend-api`, Admin — `Fch-admin-frontend-react`, both on branch `e2e-missing-tests`. **Nothing is committed.**  
**Summary, pending items and test data for this date:** [2026-10-12-summary-pending-and-test-data.md](2026-10-12-summary-pending-and-test-data.md)

Each entry: date and title, then the problem, the solution, the files touched, how it was verified and a status.

## At a glance — issue, solution and what was changed

| # | Issue faced | Solution | What was changed (files) | Status |
|---|---|---|---|---|
| 19 | `e2e-live/contacts.crud.spec.ts` used an `@example.test` address. | The spec now uses a `@mailinator.com` address. | `e2e-live/contacts.crud.spec.ts` | Fixed |
| 20 | On the dev server React StrictMode runs effects twice, so a failed load shows its error toast twice. | Those nine assertions now use `.first()`, the same form the rest of the suite uses, so they hold on `:5174`. | `e2e/client-profile-tabs.spec.ts`, `credit-accounts.spec.ts`, `funding.spec.ts`, `lenders.spec.ts`, `partner-profile.spec.ts`, `settings-domain-branding.spec.ts`, `tiers.spec.ts`, `workspace.spec.ts` | Fixed |
| 21 | Without a setting the suite serves and tests the preview build on `:4174`. | `E2E_BASE_URL=http://localhost:5174` added to the local, git-ignored `.env.e2e`. | local `.env.e2e` only | Done (local file only) |
| 22 | The fixes of this date had only been checked with the spec files they touch. | Ran `node e2e/run.mjs mock --headed`, all 1,193 tests, against `http://localhost:5174`. | None changed by this run. | Done |
| 28 | `e2e/embed-form.spec.ts` mocked the applications list as `{ data: { data: [...], meta } }`. | The list mocks now use the real shape (`paginated()`). | `e2e/embed-form.spec.ts` | Fixed and verified |
| 33 | The mocked create tests filled only the company name (Lead) and name, position and email (Employee) and expected a successful save. | The Lead create test now picks a probability and a status and checks they are sent. | `e2e/leads.spec.ts`, `e2e/employees.spec.ts` | Fixed and verified |

## 2026-10-12 — 19. Live contact spec could not pass

- **Problem:** `e2e-live/contacts.crud.spec.ts` used an `@example.test` address. The real validator rejects it ("Please enter a valid email address"), so the create step failed for every account.
- **Solution:** The spec now uses a `@mailinator.com` address.
- **Files:** `e2e-live/contacts.crud.spec.ts`
- **Verified:** The spec itself was not rerun. The same create → edit → duplicate → delete flow passed for all six accounts from a script.
- **Status:** Fixed

## 2026-10-12 — 20. Nine error-toast tests failed on `:5174`

- **Problem:** On the dev server React StrictMode runs effects twice, so a failed load shows its error toast twice. Nine tests expected exactly one and failed with a "resolved to 2 elements" error. They pass on the preview build.
- **Solution:** Those nine assertions now use `.first()`, the same form the rest of the suite uses, so they hold on `:5174`.
- **Files:** `e2e/client-profile-tabs.spec.ts`, `credit-accounts.spec.ts`, `funding.spec.ts`, `lenders.spec.ts`, `partner-profile.spec.ts`, `settings-domain-branding.spec.ts`, `tiers.spec.ts`, `workspace.spec.ts`
- **Verified:** In the full rerun (entry 22).
- **Status:** Fixed

## 2026-10-12 — 21. Base URL set to `:5174`

- **Problem:** Without a setting the suite serves and tests the preview build on `:4174`. The app under test here is the dev server on `:5174`.
- **Solution:** `E2E_BASE_URL=http://localhost:5174` added to the local, git-ignored `.env.e2e`. Other machines need the same line or the environment variable.
- **Status:** Done (local file only)

## 2026-10-12 — 22. Full per-module suite after the fixes

- **Problem:** The fixes of this date had only been checked with the spec files they touch. The whole suite needed to be run on the base URL in use, `http://localhost:5174`.
- **Solution:** Ran `node e2e/run.mjs mock --headed`, all 1,193 tests, against `http://localhost:5174`. **Result: 1,192 passed, 1 failed.** The one failure ("the host does not pay invoices") shows a duration of 1.4 hours — the machine went to sleep during that test. Its spec file was rerun on its own afterwards and passed: `e2e/invoice-payment.spec.ts` and `e2e/lenders.spec.ts` together, 38 passed, which also covers the lender fix (entry 18) made after the full run started.
- **Files:** None changed by this run.
- **Verified:** Two tests still show as expected failures because their bugs are still open and marked in the suite: the rejected cash payment receipt (P1) and the "Business Services" card (P2). They count as passed in the total.
- **Status:** Done

## 2026-10-12 — 28. Embedded Form spec mocked a response shape the API does not send

- **Problem:** `e2e/embed-form.spec.ts` mocked the applications list as `{ data: { data: [...], meta } }`. The real API sends `{ data: [...], meta }`. The mock matched the page's old, wrong reading, which is why the "Total 10" defect (entry 10) was never caught. The spec also had no test for the totals, the server-confirmed status, the existing-borrower confirmation or the new refusals.
- **Solution:** The list mocks now use the real shape (`paginated()`). Seven tests added: cards and paginator use the totals the API sends; a business name is sent as the search term; the status shown is the one the server returned; a refused status change is shown and rolled back; converting an already-converted application shows the refusal; an existing borrower must be confirmed (409 → modal → confirm sends `confirm_existing_borrower`).
- **Files:** `e2e/embed-form.spec.ts`
- **Verified:** The spec file run alone against `http://localhost:5174`, headed — 35 passed.
- **Status:** Fixed and verified

## 2026-10-12 — 33. Lead and Employee specs assumed fewer required fields than the real API

- **Problem:** The mocked create tests filled only the company name (Lead) and name, position and email (Employee) and expected a successful save. The real API refuses both: a Lead also needs Probability and Status, an Employee also needs Department, Phone, Address, State and City. A mocked spec must not accept a form the real API rejects.
- **Solution:** The Lead create test now picks a probability and a status and checks they are sent. One test was added to each spec for the real API's refusal, using the exact field names and messages the API returns, checking that each message is shown next to its field and the form stays open.
- **Files:** `e2e/leads.spec.ts`, `e2e/employees.spec.ts`
- **Verified:** Both spec files on `http://localhost:5174`, headed — 47 passed.
- **Status:** Fixed and verified
