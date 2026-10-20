# 2026-10-12 — Embedded Form — API fixes

**Date:** 2026-10-12  
**Title:** Embedded Form — API fixes  
**Repositories:** API — `fch-backend-api`, Admin — `Fch-admin-frontend-react`, both on branch `e2e-missing-tests`. **Nothing is committed.**  
**Summary, pending items and test data for this date:** [2026-10-12-summary-pending-and-test-data.md](2026-10-12-summary-pending-and-test-data.md)

Each entry: date and title, then the problem, the solution, the files touched, how it was verified and a status.

## At a glance — issue, solution and what was changed

| # | Issue faced | Solution | What was changed (files) | Status |
|---|---|---|---|---|
| 1 | When the applicant's email already belonged to a borrower, "Convert to Free Plan Borrower" returned HTTP 500 and the toast showed a raw PHP error (`Class "…AppSupportmbedFormxistingBorrowerConfirmationRequired" not found`). | Restored the correct class name so the confirmation exception is raised properly. | `app/Services/FCH/Common/EmbedForm/EmbedFormService.php` | Fixed and verified |
| 2 | The eight `/common/embed-forms/*` routes only required a login. | Added the `permission:` middleware to all eight routes, using the same four permissions the admin panel uses: `view configuration`, `update configuration`, `view application`, `convert application`. | `routes/common.php` | Fixed and verified |
| 3 | The seeder granted the four permissions to the Admin and Developer roles only, so partner employees (Sales and the other roles) could not use the module. | The seeder now grants them to every role of every partner, filtered by the same partner-type rule the other permission seeders use (host: all; certified: permissions flagged for certified; white-label: everything not host-only). | `database/seeders/EmbeddedLoanApplicationFormPermissionSeeder.php` | Fixed |
| 4 | `PUT …/submissions/{id}/status` accepted `converted`, which marked an application as done with no borrower behind it. | The request now accepts only `new`, `reviewing` and `rejected`. | `UpdateEmbedFormSubmissionStatusRequest.php`, `EmbedFormController.php`, `lang/en/embed_form.php` | Fixed and verified |
| 5 | Converting an already-converted application created a second funding application for the same borrower. | The controller refuses to convert an application whose status is already converted. | `EmbedFormController.php`, `lang/en/embed_form.php` | Fixed and verified |
| 6 | The Loan Applications list shows the business beside the applicant, but searching for it returned nothing. | Search now also covers `business_name` and `business_email`. | `EmbedFormController.php` | Fixed and verified |
| 7 | `validate-step` and `submit` for a key that does not exist (or a deactivated form) answered 422 with every field of the form, because validation ran before the "form not found" check. | The request now answers 404 before validation when the key has no active form. | `SubmitEmbedFormRequest.php` | Fixed and verified |
| 8 | `GET /common/embed-forms/submissions/undefined` returned a server error. | The four `{id}` routes now accept numbers only, so anything else is a 404. | `routes/common.php` | Fixed and verified |
| 9 | Any unexpected failure in conversion returned the exception's own message, which ended up in a toast. | The response now carries the generic "Conversion failed." The cause is still logged by the service. | `EmbedFormController.php` | Fixed |
| 26 | `SubmitEmbedFormRequest` kept the form's configuration in a `static` variable. | The lookup is now held on the request object, so each request resolves its own form. | `app/Http/Requests/Api/V1/Global/Website/EmbedForm/SubmitEmbedFormRequest.php` | Fixed and verified |
| 27 | The permission checks, the status rules, the convert-once rule, the 404 for an unknown key and the business-name search had only been checked through the browser. | Added a feature test file with 10 tests: no permission → 403 on all eight routes; view permission alone does not allow converting or configuring; "converted" cannot be set by hand; a converted application keeps its status and is not converted again; non-numeric id → 404; search finds by business name and business email; another partner's application → 403; unknown key → 404 with no field names; deactivated form → 404; a live form still validates. | `tests/Feature/EmbedForm/EmbedFormApiRulesTest.php` (new) | Fixed and verified |
| 29 | `EmbedFormService::downloadAttachment()` returned `ApiResponse::unauthenticated()` when there was no signed-in user. | The call now uses the existing `ApiResponse::unauthorized()`. | `app/Services/FCH/Common/EmbedForm/EmbedFormService.php` | Fixed |
| 35 | A borrower created by converting an embedded-form application signed in to the borrower portal and was met with a "Complete Your Profile" prompt asking for date of birth, business address, entity type, industry, revenue and more — all of which the applicant had already entered on the public form. | The conversion now also copies date of birth, the full business address (address, country, dialling code, city, state, postal code), entity type, industry type, years in business, number of employees, monthly and annual revenue, and the existing business debt. | `app/Services/FCH/Common/EmbedForm/EmbedFormService.php` | Fixed and verified |

## 2026-10-12 — 1. Converting an application for an existing borrower crashed

- **Problem:** When the applicant's email already belonged to a borrower, "Convert to Free Plan Borrower" returned HTTP 500 and the toast showed a raw PHP error (`Class "…AppSupportmbedFormxistingBorrowerConfirmationRequired" not found`). The class name in the `throw` had lost its backslashes.
- **Solution:** Restored the correct class name so the confirmation exception is raised properly.
- **Files:** `app/Services/FCH/Common/EmbedForm/EmbedFormService.php`
- **Verified:** Browser, certified partner — first call 409, "Existing Borrower Found" modal with the borrower's details, confirm → 200 "Funding application created for the existing borrower".
- **Status:** Fixed and verified

## 2026-10-12 — 2. Embed-form API had no permission checks

- **Problem:** The eight `/common/embed-forms/*` routes only required a login. Two employees with zero permissions were blocked by the UI but could still list applications, read applicant data (email, phone, date of birth, last four of SSN), change status, update the form configuration and convert an application through the API.
- **Solution:** Added the `permission:` middleware to all eight routes, using the same four permissions the admin panel uses: `view configuration`, `update configuration`, `view application`, `convert application`. Status change follows `view application` because the panel offers the dropdown to anyone who can open an application.
- **Files:** `routes/common.php`
- **Verified:** Browser, all six accounts — accounts with the permissions get 200; a zero-permission employee gets 403 on every route; no token gets 401.
- **Status:** Fixed and verified

## 2026-10-12 — 3. Employee roles did not hold the embed-form permissions

- **Problem:** The seeder granted the four permissions to the Admin and Developer roles only, so partner employees (Sales and the other roles) could not use the module.
- **Solution:** The seeder now grants them to every role of every partner, filtered by the same partner-type rule the other permission seeders use (host: all; certified: permissions flagged for certified; white-label: everything not host-only). Run locally on `fch-backend`.
- **Files:** `database/seeders/EmbeddedLoanApplicationFormPermissionSeeder.php`
- **Verified:** Database check — 31 roles and 37 role-holding users hold 4 of 4.
- **Status:** Fixed. **Check before release:** see "Things to confirm" in [2026-10-12-summary-pending-and-test-data.md](2026-10-12-summary-pending-and-test-data.md).

## 2026-10-12 — 4. Status could be set to "converted" by hand, and a converted application could be moved back

- **Problem:** `PUT …/submissions/{id}/status` accepted `converted`, which marked an application as done with no borrower behind it. It also let a converted application be set back to `new`.
- **Solution:** The request now accepts only `new`, `reviewing` and `rejected`. The controller refuses any status change on a converted application.
- **Files:** `UpdateEmbedFormSubmissionStatusRequest.php`, `EmbedFormController.php`, `lang/en/embed_form.php`
- **Verified:** 422 "That is not a valid submission status." and 422 "A converted application cannot change status."
- **Status:** Fixed and verified

## 2026-10-12 — 5. An application could be converted twice

- **Problem:** Converting an already-converted application created a second funding application for the same borrower.
- **Solution:** The controller refuses to convert an application whose status is already converted.
- **Files:** `EmbedFormController.php`, `lang/en/embed_form.php`
- **Verified:** 422 "This application has already been converted." through the API; in the UI the convert button disappears and the status dropdown locks.
- **Status:** Fixed and verified

## 2026-10-12 — 6. Search ignored the business name

- **Problem:** The Loan Applications list shows the business beside the applicant, but searching for it returned nothing. The controller searched only first name, last name, email and phone.
- **Solution:** Search now also covers `business_name` and `business_email`.
- **Files:** `EmbedFormController.php`
- **Verified:** Search by business name and by business email each return the application.
- **Status:** Fixed and verified

## 2026-10-12 — 7. Unknown or deactivated form key returned the list of field names

- **Problem:** `validate-step` and `submit` for a key that does not exist (or a deactivated form) answered 422 with every field of the form, because validation ran before the "form not found" check.
- **Solution:** The request now answers 404 before validation when the key has no active form.
- **Files:** `SubmitEmbedFormRequest.php`
- **Verified:** 404 "Form not found or is no longer active." with no field names; a valid key still validates normally.
- **Status:** Fixed and verified

## 2026-10-12 — 8. Non-numeric application id returned 500

- **Problem:** `GET /common/embed-forms/submissions/undefined` returned a server error.
- **Solution:** The four `{id}` routes now accept numbers only, so anything else is a 404.
- **Files:** `routes/common.php`
- **Verified:** 404 for `undefined` and `abc`.
- **Status:** Fixed and verified

## 2026-10-12 — 9. Raw exception text reached the user on a failed conversion

- **Problem:** Any unexpected failure in conversion returned the exception's own message, which ended up in a toast.
- **Solution:** The response now carries the generic "Conversion failed." The cause is still logged by the service.
- **Files:** `EmbedFormController.php`
- **Status:** Fixed

## 2026-10-12 — 26. Form lookup was cached in a static and leaked between requests

- **Problem:** `SubmitEmbedFormRequest` kept the form's configuration in a `static` variable. A static outlives the request in any long-running PHP worker, so the next request could be answered with the previous request's form — or with its "not found". Found when a new test for a live form got a 404 left over from the test before it.
- **Solution:** The lookup is now held on the request object, so each request resolves its own form.
- **Files:** `app/Http/Requests/Api/V1/Global/Website/EmbedForm/SubmitEmbedFormRequest.php`
- **Verified:** The new test passes after the change; against the running API a live form key still answers 422 with its field errors and an unknown key answers 404.
- **Status:** Fixed and verified

## 2026-10-12 — 27. No backend tests covered the new API rules

- **Problem:** The permission checks, the status rules, the convert-once rule, the 404 for an unknown key and the business-name search had only been checked through the browser.
- **Solution:** Added a feature test file with 10 tests: no permission → 403 on all eight routes; view permission alone does not allow converting or configuring; "converted" cannot be set by hand; a converted application keeps its status and is not converted again; non-numeric id → 404; search finds by business name and business email; another partner's application → 403; unknown key → 404 with no field names; deactivated form → 404; a live form still validates.
- **Files:** `tests/Feature/EmbedForm/EmbedFormApiRulesTest.php` (new)
- **Verified:** `php artisan test tests/Feature/EmbedForm` — 38 passed (28 existing + 10 new).
- **Status:** Fixed and verified

## 2026-10-12 — 29. Attachment download called a response helper that does not exist

- **Problem:** `EmbedFormService::downloadAttachment()` returned `ApiResponse::unauthenticated()` when there was no signed-in user. `ApiResponse` has no such method, so that branch would have been a fatal error. It cannot be reached today because the route sits behind the auth middleware.
- **Solution:** The call now uses the existing `ApiResponse::unauthorized()`.
- **Files:** `app/Services/FCH/Common/EmbedForm/EmbedFormService.php`
- **Verified:** Lint clean; backend embed-form tests, 38 passed.
- **Status:** Fixed

## 2026-10-12 — 35. Converting an application left the borrower profile half empty

- **Problem:** A borrower created by converting an embedded-form application signed in to the borrower portal and was met with a "Complete Your Profile" prompt asking for date of birth, business address, entity type, industry, revenue and more — all of which the applicant had already entered on the public form. The conversion copied only names, emails, phones and the home address onto the borrower record.
- **Solution:** The conversion now also copies date of birth, the full business address (address, country, dialling code, city, state, postal code), entity type, industry type, years in business, number of employees, monthly and annual revenue, and the existing business debt. The option lists are the same ones the portal uses, so the values carry over unchanged.
- **Files:** `app/Services/FCH/Common/EmbedForm/EmbedFormService.php`
- **Verified:** A fresh application was submitted and converted through the browser as host (borrower 139). In the database all fourteen fields are filled on the borrower. Signing in to the borrower portal as that borrower shows no "Complete Your Profile" prompt. Backend embed-form tests: 38 passed.
- **Status:** Fixed and verified
