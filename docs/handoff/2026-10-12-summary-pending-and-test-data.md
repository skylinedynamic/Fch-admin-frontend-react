# 2026-10-12 — Summary, pending items and test data

**Repositories**

- API — `fch-backend-api`, branch `e2e-missing-tests` (created from `release` at commit `f363a510`)
- Admin — `Fch-admin-frontend-react`, branch `e2e-missing-tests`

**Nothing is committed in either repository.** Everything below is a modified file in the working tree, waiting for review.

**Base URL for all browser testing:** `http://localhost:5174` (the dev server). API: `http://127.0.0.1:8000/api/v1`.

## Features and tasks worked on this date

| File | Title | Entries |
|---|---|---|
| [2026-10-12-embedded-form-api-fixes.md](2026-10-12-embedded-form-api-fixes.md) | Embedded Form — API fixes | 1–9, 26–27, 29, 35 |
| [2026-10-12-embedded-form-admin-screen-fixes.md](2026-10-12-embedded-form-admin-screen-fixes.md) | Embedded Form — admin screen fixes | 10–12, 30 |
| [2026-10-12-client-documents-host-employee-permission.md](2026-10-12-client-documents-host-employee-permission.md) | Client documents — host employee permission | 13 |
| [2026-10-12-payments-search-term-from-the-url.md](2026-10-12-payments-search-term-from-the-url.md) | Payments — search term from the URL | 14 |
| [2026-10-12-settings-access-with-section-permissions.md](2026-10-12-settings-access-with-section-permissions.md) | Settings — access with section permissions | 15 |
| [2026-10-12-resources-form-error-handling.md](2026-10-12-resources-form-error-handling.md) | Resources — form error handling | 16–17, 32 |
| [2026-10-12-lenders-product-categories-sent-as-names.md](2026-10-12-lenders-product-categories-sent-as-names.md) | Lenders — product categories sent as names | 18 |
| [2026-10-12-e2e-test-suite-spec-and-configuration-changes.md](2026-10-12-e2e-test-suite-spec-and-configuration-changes.md) | E2E test suite — spec and configuration changes | 19–22, 28, 33 |
| [2026-10-12-invoices-rejected-cash-payment-shown-as-confirmed.md](2026-10-12-invoices-rejected-cash-payment-shown-as-confirmed.md) | Invoices — rejected cash payment shown as confirmed | 31 |
| [2026-10-12-api-answers-for-screens-the-ui-blocks.md](2026-10-12-api-answers-for-screens-the-ui-blocks.md) | API answers for screens the UI blocks — what each endpoint returns | 34 |
| [2026-10-12-e2e-test-runs-what-was-tested.md](2026-10-12-e2e-test-runs-what-was-tested.md) | E2E test runs — what was tested, issues faced, solutions and changes | 23–25, 36–37 |

## All issues faced on this date — issue, solution, what was changed

Full detail for each row is in the file named in the last column. Issues met while running the tests are in [2026-10-12-e2e-test-runs-what-was-tested.md](2026-10-12-e2e-test-runs-what-was-tested.md).

| # | Issue faced | Solution | What was changed (files) | Status | Detail in |
|---|---|---|---|---|---|
| 1 | When the applicant's email already belonged to a borrower, "Convert to Free Plan Borrower" returned HTTP 500 and the toast showed a raw PHP error (`Class "…AppSupportmbedFormxistingBorrowerConfirmationRequired" not found`). | Restored the correct class name so the confirmation exception is raised properly. | `app/Services/FCH/Common/EmbedForm/EmbedFormService.php` | Fixed and verified | [embedded-form-api-fixes](2026-10-12-embedded-form-api-fixes.md) |
| 2 | The eight `/common/embed-forms/*` routes only required a login. | Added the `permission:` middleware to all eight routes, using the same four permissions the admin panel uses: `view configuration`, `update configuration`, `view application`, `convert application`. | `routes/common.php` | Fixed and verified | [embedded-form-api-fixes](2026-10-12-embedded-form-api-fixes.md) |
| 3 | The seeder granted the four permissions to the Admin and Developer roles only, so partner employees (Sales and the other roles) could not use the module. | The seeder now grants them to every role of every partner, filtered by the same partner-type rule the other permission seeders use (host: all; certified: permissions flagged for certified; white-label: everything not host-only). | `database/seeders/EmbeddedLoanApplicationFormPermissionSeeder.php` | Fixed | [embedded-form-api-fixes](2026-10-12-embedded-form-api-fixes.md) |
| 4 | `PUT …/submissions/{id}/status` accepted `converted`, which marked an application as done with no borrower behind it. | The request now accepts only `new`, `reviewing` and `rejected`. | `UpdateEmbedFormSubmissionStatusRequest.php`, `EmbedFormController.php`, `lang/en/embed_form.php` | Fixed and verified | [embedded-form-api-fixes](2026-10-12-embedded-form-api-fixes.md) |
| 5 | Converting an already-converted application created a second funding application for the same borrower. | The controller refuses to convert an application whose status is already converted. | `EmbedFormController.php`, `lang/en/embed_form.php` | Fixed and verified | [embedded-form-api-fixes](2026-10-12-embedded-form-api-fixes.md) |
| 6 | The Loan Applications list shows the business beside the applicant, but searching for it returned nothing. | Search now also covers `business_name` and `business_email`. | `EmbedFormController.php` | Fixed and verified | [embedded-form-api-fixes](2026-10-12-embedded-form-api-fixes.md) |
| 7 | `validate-step` and `submit` for a key that does not exist (or a deactivated form) answered 422 with every field of the form, because validation ran before the "form not found" check. | The request now answers 404 before validation when the key has no active form. | `SubmitEmbedFormRequest.php` | Fixed and verified | [embedded-form-api-fixes](2026-10-12-embedded-form-api-fixes.md) |
| 8 | `GET /common/embed-forms/submissions/undefined` returned a server error. | The four `{id}` routes now accept numbers only, so anything else is a 404. | `routes/common.php` | Fixed and verified | [embedded-form-api-fixes](2026-10-12-embedded-form-api-fixes.md) |
| 9 | Any unexpected failure in conversion returned the exception's own message, which ended up in a toast. | The response now carries the generic "Conversion failed." The cause is still logged by the service. | `EmbedFormController.php` | Fixed | [embedded-form-api-fixes](2026-10-12-embedded-form-api-fixes.md) |
| 10 | As host the cards showed "Total Applications 10" and the paginator offered one page, with 21 applications in the database. | Total and statistics are now read from `res.meta` first. | `src/pages/embed-form/EmbedFormSubmissions.tsx` | Fixed and verified | [embedded-form-admin-screen-fixes](2026-10-12-embedded-form-admin-screen-fixes.md) |
| 11 | Changing the status within a second of the page opening saved correctly on the server but the dropdown went back to the old value. | On success the page now sets the status the server returned. | `src/pages/embed-form/EmbedFormSubmissionDetails.tsx` | Fixed and verified | [embedded-form-admin-screen-fixes](2026-10-12-embedded-form-admin-screen-fixes.md) |
| 12 | `ConfigurationGuardModal` logged a debug object to the console on every render. | Removed. | `src/components/Common/ConfigurationGuardModal.tsx` | Fixed | [embedded-form-admin-screen-fixes](2026-10-12-embedded-form-admin-screen-fixes.md) |
| 13 | The Documents tab treated any user with `is_host` as fully permitted, so a host employee holding neither "delete borrower documents" nor "update borrower documents status" could delete documents and change their status. | Only the host account itself (`is_host` and `entity_type` "Partner") keeps the full access. | `src/pages/clients/components/ClientDocumentsSection.tsx`, `e2e/client-profile-tabs.spec.ts` | Fixed and verified | [client-documents-host-employee-permission](2026-10-12-client-documents-host-employee-permission.md) |
| 14 | The invoice list's "Review" button links to `/payments?search=<invoice id>`, but the Payments page never read the query string, so the list opened unfiltered. | The search box and the applied search both start from the URL value. | `src/pages/payments/Payments.jsx`, `e2e/payments-invoices.spec.ts` | Fixed and verified | [payments-search-term-from-the-url](2026-10-12-payments-search-term-from-the-url.md) |
| 15 | The `/settings` route admitted only the payment and the two agreement permissions, but the page has sections for email, SMS, branding, domain and MicroBilt, each behind its own permission. | The route and the sidebar entry now accept every settings-section permission. | `src/App.jsx`, `src/components/Layout/Sidebar.jsx`, `e2e/persona-access.spec.ts`, `e2e-live/routes.ts` | Fixed and verified | [settings-access-with-section-permissions](2026-10-12-settings-access-with-section-permissions.md) |
| 16 | Typing into a field after a validation error left it red. | The error key is removed instead of emptied. | `src/pages/resources/ResourceForm.tsx`, `e2e/resources.spec.ts` | Fixed and verified | [resources-form-error-handling](2026-10-12-resources-form-error-handling.md) |
| 17 | A non-validation failure was stored in a `general` error that no part of the form renders, so the user got no feedback. | The message is now shown in a toast. | `src/pages/resources/ResourceForm.tsx`, `e2e/resources.spec.ts` | Fixed and verified | [resources-form-error-handling](2026-10-12-resources-form-error-handling.md) |
| 18 | Until the category list loaded, the form offered a hardcoded fallback list whose values are names. | Only categories returned by the API are offered, and the field is disabled while they load. | `src/pages/lenders/LenderForm.tsx` | Fixed and verified | [lenders-product-categories-sent-as-names](2026-10-12-lenders-product-categories-sent-as-names.md) |
| 19 | `e2e-live/contacts.crud.spec.ts` used an `@example.test` address. | The spec now uses a `@mailinator.com` address. | `e2e-live/contacts.crud.spec.ts` | Fixed | [e2e-test-suite-spec-and-configuration-changes](2026-10-12-e2e-test-suite-spec-and-configuration-changes.md) |
| 20 | On the dev server React StrictMode runs effects twice, so a failed load shows its error toast twice. | Those nine assertions now use `.first()`, the same form the rest of the suite uses, so they hold on `:5174`. | `e2e/client-profile-tabs.spec.ts`, `credit-accounts.spec.ts`, `funding.spec.ts`, `lenders.spec.ts`, `partner-profile.spec.ts`, `settings-domain-branding.spec.ts`, `tiers.spec.ts`, `workspace.spec.ts` | Fixed | [e2e-test-suite-spec-and-configuration-changes](2026-10-12-e2e-test-suite-spec-and-configuration-changes.md) |
| 21 | Without a setting the suite serves and tests the preview build on `:4174`. | `E2E_BASE_URL=http://localhost:5174` added to the local, git-ignored `.env.e2e`. | local `.env.e2e` only | Done (local file only) | [e2e-test-suite-spec-and-configuration-changes](2026-10-12-e2e-test-suite-spec-and-configuration-changes.md) |
| 22 | The fixes of this date had only been checked with the spec files they touch. | Ran `node e2e/run.mjs mock --headed`, all 1,193 tests, against `http://localhost:5174`. | None changed by this run. | Done | [e2e-test-suite-spec-and-configuration-changes](2026-10-12-e2e-test-suite-spec-and-configuration-changes.md) |
| 26 | `SubmitEmbedFormRequest` kept the form's configuration in a `static` variable. | The lookup is now held on the request object, so each request resolves its own form. | `app/Http/Requests/Api/V1/Global/Website/EmbedForm/SubmitEmbedFormRequest.php` | Fixed and verified | [embedded-form-api-fixes](2026-10-12-embedded-form-api-fixes.md) |
| 27 | The permission checks, the status rules, the convert-once rule, the 404 for an unknown key and the business-name search had only been checked through the browser. | Added a feature test file with 10 tests: no permission → 403 on all eight routes; view permission alone does not allow converting or configuring; "converted" cannot be set by hand; a converted application keeps its status and is not converted again; non-numeric id → 404; search finds by business name and business email; another partner's application → 403; unknown key → 404 with no field names; deactivated form → 404; a live form still validates. | `tests/Feature/EmbedForm/EmbedFormApiRulesTest.php` (new) | Fixed and verified | [embedded-form-api-fixes](2026-10-12-embedded-form-api-fixes.md) |
| 28 | `e2e/embed-form.spec.ts` mocked the applications list as `{ data: { data: [...], meta } }`. | The list mocks now use the real shape (`paginated()`). | `e2e/embed-form.spec.ts` | Fixed and verified | [e2e-test-suite-spec-and-configuration-changes](2026-10-12-e2e-test-suite-spec-and-configuration-changes.md) |
| 29 | `EmbedFormService::downloadAttachment()` returned `ApiResponse::unauthenticated()` when there was no signed-in user. | The call now uses the existing `ApiResponse::unauthorized()`. | `app/Services/FCH/Common/EmbedForm/EmbedFormService.php` | Fixed | [embedded-form-api-fixes](2026-10-12-embedded-form-api-fixes.md) |
| 30 | A comment above the Embedded Form menu in the sidebar said the feature was hidden and on hold. | The comment was removed. The menu itself is unchanged. | `src/components/Layout/Sidebar.jsx` | Fixed | [embedded-form-admin-screen-fixes](2026-10-12-embedded-form-admin-screen-fixes.md) |
| 31 | In the invoice payment modal, paying by cash (manual processing) called `/payment/process` inside its own `try/catch` that only logged the error. | The inner `try/catch` was removed, so a refusal from the API stops the flow. | `src/pages/invoices/components/InvoicePaymentModal.jsx`, `e2e/invoice-payment.spec.ts` | Fixed and verified | [invoices-rejected-cash-payment-shown-as-confirmed](2026-10-12-invoices-rejected-cash-payment-shown-as-confirmed.md) |
| 32 | The "Business Services" summary card linked to `/business-services`. | The business services are listed further down the same Resources page, so the card now goes to that section (`/resources#business-services`) and scrolls it into view. | `src/pages/resources/Resource.tsx`, `e2e/resources-page.spec.ts` | Fixed and verified | [resources-form-error-handling](2026-10-12-resources-form-error-handling.md) |
| 33 | The mocked create tests filled only the company name (Lead) and name, position and email (Employee) and expected a successful save. | The Lead create test now picks a probability and a status and checks they are sent. | `e2e/leads.spec.ts`, `e2e/employees.spec.ts` | Fixed and verified | [e2e-test-suite-spec-and-configuration-changes](2026-10-12-e2e-test-suite-spec-and-configuration-changes.md) |
| 34 | The all-modules pass recorded 17 cases where an account is kept off a screen by the admin app but the list endpoint behind that screen still answers 200 for it. | Each of the six endpoints was called as all six accounts and the returned rows were checked for which partner they belong to. | None changed. | Information — no cross-partner exposure found. | [api-answers-for-screens-the-ui-blocks](2026-10-12-api-answers-for-screens-the-ui-blocks.md) |
| 35 | A borrower created by converting an embedded-form application signed in to the borrower portal and was met with a "Complete Your Profile" prompt asking for date of birth, business address, entity type, industry, revenue and more — all of which the applicant had already entered on the public form. | The conversion now also copies date of birth, the full business address (address, country, dialling code, city, state, postal code), entity type, industry type, years in business, number of employees, monthly and annual revenue, and the existing business debt. | `app/Services/FCH/Common/EmbedForm/EmbedFormService.php` | Fixed and verified | [embedded-form-api-fixes](2026-10-12-embedded-form-api-fixes.md) |

## Summary

| Area | State at end of day |
|---|---|
| Embedded Form — public form, review, convert, settings, permissions | Tested end to end with six accounts on two databases. Defects found were fixed and re-verified, except the items under Pending below. |
| Every module — screens open or are blocked per role, lists load real data | 342 passed, 1 failed (passed on retest), 5 skipped |
| Every module — forms, validation, buttons (mocked API, 1,193 tests) | After the fixes, on `http://localhost:5174`: 1,192 passed, 1 failed. The failure was a test interrupted by the machine sleeping; its spec file passed when rerun alone (entry 22). |
| Real-database create / validate / delete | Complete for Contacts, Leads, Roles, Employees (all six accounts), Resources and Lenders (host). Partial for the rest — see Pending below. |
| Unit and feature tests (Vitest) | 1,203 passed, 2 expected failures |
| Backend embed-form feature tests | 38 passed (10 added this date) |

**Accounts used**

- Round 1, database `fch-backend`: `craig@fourcornerfunding.com`, `contact@techsolutions.com`, `info@greenenergy.com`, `sajib1@gmail.com`, `partneremployee1901@gmail.com`, `partner3.employee1@example.com`
- Round 2 onward, database `fch_dev`: `craig.rice@fourcornerfunding.com` (host), `safwanbinarafat@gmail.com` (white-label), `kusukykim@mailinator.com` (certified), `qasez@mailinator.com` (host user), `xyzudenu@mailinator.com` (white-label user), `zunypiqe@mailinator.com` (certified user)

## Pending

### Defects not fixed

| # | Problem | Why it is still open |
|---|---|---|
| P1 | A rejected cash payment showed a "Payment Confirmation" receipt | **Done** — entry 31 |
| P2 | "Business Services" card on Resources led to a 404 | **Done** — entry 32 |
| P3 | API answers for screens the UI blocks — 17 cases | Checked (entry 34): no partner gets another partner's data. Open question only: should the two catalogue endpoints and the subscription endpoints also be refused for accounts the UI keeps off those screens |
| P4 | White-label and certified accounts could open `/resources/create`, but the API refuses them | **Done on 2026-10-13** — [entry 1](2026-10-13-resources-create-edit-and-manage-screens-need-their-own-permission.md) |
| P5 | "Configuration Incomplete – Payment Integration" modal sometimes covers the embed-form Configuration screen for certified and white-label accounts; the API is not blocked | Needs a decision on whether payment setup should gate this screen |
| P6 | After an employee converts an application, "View Borrower" can land on Access Denied if the role lacks `view clients` | Role design |
| P7 | Logos and favicons broken on the public form and sidebar | The files `fch_dev` points to are missing from this machine's `storage/app/public` |
| P8 | Mocked Lead and Employee specs assumed fewer required fields than the real API | **Done** — entry 33 |
| P9 | `ApiResponse::unauthenticated()` did not exist | **Done** — entry 29 |
| P10 | Stale "hidden" comment above the sidebar menu | **Done** — entry 30 |

### Testing not completed

| # | What | Detail |
|---|---|---|
| T1 | Full per-module suite on `:5174` after the fixes | **Done** — entry 22: 1,192 passed, 1 failed (sleep-interrupted, passed on rerun) |
| T2 | Real-database create for Funding sequence, Capital access, Credit account, Blog, SEO setting, Tier | Server validation was exercised up to the last requirement, but the script could not complete: icon picker and max > min (Funding), credit account selection (Capital access), card image (Credit account), editor content (Blog), save not clickable (SEO), tabbed form (Tier) |
| T3 | Real-database create for Users, Clients, Partners | Not attempted. A user account uses subscription seats and can raise an invoice; partners and clients create accounts, subscriptions and emails |
| T4 | Emails and bell notifications | Checked (entry 37): 423 jobs are waiting in the Redis queue because no worker runs locally. Not processed — the queue mixes jobs from two databases. Needs a decision: clear the queue, then start a worker |
| T5 | Converted borrower logging in to the borrower portal | **Done** — entry 36 (sign-in works; profile prompt fixed in entry 35) |
| T6 | Published form link for host and certified partners | Points to `localhost:3000`, which is not running locally; the form was tested at `127.0.0.1:8000/form/{key}` |
| T7 | Backend feature tests for the new API rules | **Done** — entry 27 (10 tests added, 38 passing) |
| T8 | Live contact spec after its fix | Not rerun (entry 19) |

## Files changed (uncommitted)

**API — `fch-backend-api`**

- `app/Services/FCH/Common/EmbedForm/EmbedFormService.php`
- `app/Http/Controllers/Api/V1/FCH/Common/EmbedForm/EmbedFormController.php`
- `app/Http/Requests/Api/V1/FCH/Common/EmbedForm/UpdateEmbedFormSubmissionStatusRequest.php`
- `app/Http/Requests/Api/V1/Global/Website/EmbedForm/SubmitEmbedFormRequest.php`
- `database/seeders/EmbeddedLoanApplicationFormPermissionSeeder.php`
- `lang/en/embed_form.php`
- `routes/common.php`
- `tests/Feature/EmbedForm/EmbedFormApiRulesTest.php` — new, 10 tests

**Admin — `Fch-admin-frontend-react`**

- `src/App.jsx`, `src/components/Layout/Sidebar.jsx`
- `src/components/Common/ConfigurationGuardModal.tsx`
- `src/pages/embed-form/EmbedFormSubmissions.tsx`, `src/pages/embed-form/EmbedFormSubmissionDetails.tsx`
- `src/pages/clients/components/ClientDocumentsSection.tsx`
- `src/pages/payments/Payments.jsx`
- `src/pages/resources/ResourceForm.tsx`
- `src/pages/lenders/LenderForm.tsx`
- `src/pages/invoices/components/InvoicePaymentModal.jsx`
- `src/pages/resources/Resource.tsx`
- `e2e/invoice-payment.spec.ts`, `e2e/resources-page.spec.ts`, `e2e/leads.spec.ts`, `e2e/employees.spec.ts`
- `e2e/client-profile-tabs.spec.ts`, `e2e/payments-invoices.spec.ts`, `e2e/persona-access.spec.ts`, `e2e/resources.spec.ts`
- `e2e/credit-accounts.spec.ts`, `e2e/funding.spec.ts`, `e2e/lenders.spec.ts`, `e2e/partner-profile.spec.ts`, `e2e/settings-domain-branding.spec.ts`, `e2e/tiers.spec.ts`, `e2e/workspace.spec.ts`
- `e2e/embed-form.spec.ts` — real response shape, 7 tests added
- `e2e-live/routes.ts`, `e2e-live/contacts.crud.spec.ts`
- `CLAUDE.md` — rule added: E2E tests are updated with every feature change
- `docs/handoff/README.md` and the ten `docs/handoff/2026-10-12-*.md` files

`e2e/README.md` was already modified before this work started. `.env.e2e` is git-ignored.

## Things to confirm before this goes further than local

- **Seeder scope (entry 3).** Every role of every partner now gets all four embed-form permissions. If some employee roles should not change the form configuration or rotate its key, narrow the list first.
- **Settings permissions (entry 15).** Confirm that holding any one settings-section permission should open the Settings page.
- **Documents permission (entry 13).** Host employees now need the document permissions on their role. Check the roles of existing host employees.
- **Status change permission (entry 2).** Changing an application's status is allowed with `view application`. Confirm, or move it behind `convert application`.

## Test data left in the databases

**`fch_dev`**

- Applications 15–23, borrowers 132–139, funding applications 81–89 (borrower 139 and its application were added by entry 35's check), all with `e2e.*@example.test` emails.
- Two test borrower logins (`e2e.hosta.…` and `e2e.profile.…`) had their password set to a known value in the database for the borrower-portal check.
- Two test borrower logins (`e2e.hosta.…` and `e2e.profile.…`) had their password set to a known value in the database for the borrower-portal check.
- Two applications reused real borrower emails already in the database: `fukazah@mailinator.com` (borrower 96 now has one extra draft funding application) and `erroldiaz7000@gmail.com` (application left rejected).
- The certified partner's (id 46) form key was rotated to `share_pub_2527de3ae3c8236611b55f9c6110cd72`.
- Test leads 175–183 are soft-deleted. Test contacts, roles, employees, resources and the test lender were deleted through the app; a database check found no live `E2E …` rows in leads, resources, lenders, roles or employees.

**`fch-backend`** (first round)

- Applications 1–9, borrowers 13–19, funding applications 8–16.
- Host form key rotated to `share_pub_77322cdf57d8286e6e2ac9b686d242a4`.
- Seeder run: every role holds the four embed-form permissions.

## How to rerun

From `Fch-admin-frontend-react`, with the dev server on `:5174` and the API on `:8000`. Passwords go in the environment or the git-ignored `.env.e2e`, never in a tracked file.

```bash
# Every module's forms, validation and buttons (mocked API)
E2E_BASE_URL=http://localhost:5174 node e2e/run.mjs mock --headed

# Every module's screens per account (real API, read-only)
E2E_BASE_URL=http://localhost:5174 E2E_HOST_EMAIL=... E2E_HOST_PASSWORD=... node e2e/run.mjs live --headed

# Unit and feature tests
npm test
```

The Embedded Form flow, the per-account create/delete round trips and the create pass over the remaining modules were run from throwaway Playwright scripts that are **not** in the repository. To keep them, they need to be turned into `e2e-live` specs.
