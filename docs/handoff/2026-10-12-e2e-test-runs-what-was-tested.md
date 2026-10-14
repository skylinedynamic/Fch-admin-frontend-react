# 2026-10-12 — E2E test runs — what was tested, issues faced, solutions and changes

**Date:** 2026-10-12  
**Title:** E2E test runs — what was tested, issues faced, solutions and changes  
**Repositories:** API — `fch-backend-api`, Admin — `Fch-admin-frontend-react`, both on branch `e2e-missing-tests`. **Nothing is committed.**  
**Summary, pending items and test data for this date:** [2026-10-12-summary-pending-and-test-data.md](2026-10-12-summary-pending-and-test-data.md)

This file records the test runs themselves: what was run, what went wrong during the runs, how each issue was handled and what was changed because of it. Application defects found by these runs have their own files; each one is referenced here by entry number.

## At a glance — issues faced during the runs

| # | Issue faced | Solution | What was changed |
|---|---|---|---|
| R1 | Host → Lenders screen did not render within 60 s in the all-modules pass | Retested the screen alone, twice: loads, 10 rows, API 200. Slow response from the single-threaded local API | Nothing |
| R2 | In the first database the white-label partner had no domain, so no form could exist for it | Tested the white-label form in the second database (`fch_dev`), where the partner has a domain | Nothing |
| R3 | Two employee accounts had zero embed-form permissions, so only their "blocked" path could be tested | Seeder changed and run (entry 3), then the accounts were tested with access | `EmbeddedLoanApplicationFormPermissionSeeder.php` |
| R4 | A "Configuration Incomplete – Payment Integration" modal covered the embed-form Configuration screen for the certified partner, so Save could not be clicked | Settings UI steps were run as host in round 1. In round 2 the modal did not appear and the steps ran as all three owners | Nothing — still open as P5 |
| R5 | Nine error-toast tests failed on `:5174` | Cause found: React StrictMode shows the toast twice on the dev server. Assertions changed to `.first()` (entry 20) | Eight spec files in `e2e/` |
| R6 | Runs started side by side on the same machine made each other time out (failures lasting 20–30 s that passed when run alone) | Every failure was rerun alone before being counted. Later runs were done one at a time | Nothing |
| R7 | The live contact spec failed for all six accounts | Cause found: its `@example.test` address is refused by the real validator. Spec changed (entry 19); the same flow was run from a script and passed | `e2e-live/contacts.crud.spec.ts` |
| R8 | The local `.env.e2e` still held the first round's account emails, so a per-account run tried accounts that do not exist in `fch_dev` | That run was stopped and rerun with the other accounts' variables blanked | Nothing in the repository |
| R9 | A test script asked the applications list for 200 rows per page; the API allows 100 and refused, so the script had no application ids and every later step in that run was meaningless | Run stopped, page size corrected to 100, phase rerun. Two conversions made through the list in the bad run were real and were kept | Test script only |
| R10 | A test script's delete step ran on the first row of the Leads list without confirming it was the test lead, after the list was slow to load | Run stopped at once and the table checked: only the test leads (ids 175–177) had been deleted. The step now acts only on the row that carries the test lead's name, and falls back to deleting by id | Test script only |
| R11 | A test script removed toast elements from the page to read the next toast, which crashed React on the settings screen | Script changed to read the latest toast without touching the page | Test script only |
| R12 | Creating a Lead or an Employee with the fields the mocked specs use was refused by the real API (Lead: Probability, Status; Employee: Department, Phone, Address, State, City) | The script filled the missing fields and the create passed. The mocked specs still assume the shorter list | Test script only — spec update is pending (P8) |
| R13 | Lender create failed with "product_categories.0 must be an integer" | Defect found in the form and fixed (entry 18) | `src/pages/lenders/LenderForm.tsx` |
| R14 | White-label and certified accounts could open the Resource create form, but the API refused with "Access denied. Admin privileges required" | Recorded as a defect | Nothing — still open as P4 |
| R15 | Real-database create could not be completed for Funding sequence, Capital access, Credit account, Blog, SEO setting and Tier | The script cannot drive the icon picker, credit-account selection, image upload, rich-text editor or the tabbed Tier form. Their server validation was exercised up to that last requirement | Nothing — still open as T2 |
| R16 | Logos and favicons returned 403 on the public form and the sidebar | Cause found: the uploaded files `fch_dev` points to are missing from this machine's `storage/app/public` | Nothing — environment, still open as P7 |
| R17 | The full suite was first rerun on the `:4174` preview build | Stopped at 985 passed when the base URL was set to `:5174`; restarted against `:5174` (entries 21, 22) | Local `.env.e2e` only |

## 2026-10-12 — 23. All-modules live pass, six accounts

- **What was tested:** The `e2e-live` suite, headed, against the real API, read-only. Sign-in for each account, wrong password, empty login, the sidebar, about 50 screens per account (each opens or is blocked as that role should be), and each list loading real data.
- **Result:** 342 passed, 1 failed, 5 skipped.
- **Issue faced:** The one failure was host → Lenders, where the page did not render within 60 seconds (R1). The five skipped were the contact write tests, which stay off unless writes are allowed.
- **Solution:** The Lenders screen was retested alone twice and loaded both times. The contact write tests were covered separately in entry 25.
- **What was changed:** Nothing.
- **Also found by this run:** 17 cases where the API answers for a screen the UI blocks — recorded as pending item P3.
- **Status:** Done

## 2026-10-12 — 24. Embedded Form full flow, six accounts

- **What was tested:**
  - Public form on the host, white-label and certified forms: all eight steps with validation, co-borrower, file uploads, sales rep and referral. 8 applications submitted.
  - Each account converted one application. The database shows an Active free-plan borrower, a draft funding application with documents and co-borrowers copied, and the SSN encrypted.
  - Existing borrower on the same partner → confirmation → funding application added. Existing borrower on another partner → refused.
  - Partners get 403 on each other's applications and files; the host sees all.
  - Settings: title, allowed domains (403 for unlisted origins), copy key, copy embed HTML, regenerate (cancel and confirm), activate and deactivate.
- **Issues faced:** No form for the white-label partner in the first database (R2); employees without permissions (R3); the Configuration modal blocking Save (R4); the page-size mistake in the script (R9); the toast-removal mistake in the script (R11); broken logos (R16).
- **Solution:** As listed against each issue in the table above.
- **What was changed:** Application defects found by this flow were fixed in entries 1–12. No other change.
- **Status:** Done

## 2026-10-12 — 25. Real-database create, validate and delete, once per account

- **What was tested:**
  - **Contacts** — required fields, bad email, create, edit saved on the server, duplicate email refused, delete. All six accounts passed.
  - **Leads** — empty form blocked, missing Probability and Status refused by the server, create, find, delete. All six created; five deleted through the UI and the host's through the API after its list timed out.
  - **Roles** — empty name blocked, create with permissions, duplicate refused, edit, delete. All six passed.
  - **Employees** — server names the five missing fields, create without a login account (so no seat is used), find, delete. All six passed.
  - **Resources** — create and delete as host and host user.
  - **Lenders** — create and delete as host, after the fix in entry 18.
  - **Every other create form** — an empty submit is refused, and forms a role should not reach are blocked.
- **Issues faced:** The live contact spec's address (R7); stale emails in `.env.e2e` (R8); the unconfirmed lead delete (R10); the extra required fields (R12); the lender category values (R13); the Resource form offered to partners (R14); forms the script could not complete (R15).
- **Solution:** As listed against each issue in the table above.
- **What was changed:** `e2e-live/contacts.crud.spec.ts` (entry 19) and `src/pages/lenders/LenderForm.tsx` (entry 18). Everything created by these runs was deleted again; a database check found no live `E2E …` rows in leads, resources, lenders, roles or employees.
- **Status:** Done for the modules listed. Not completed for the modules in R15, and not attempted for Users, Clients and Partners (pending item T3).

## 2026-10-12 — 36. Converted borrower signing in to the borrower portal

- **What was tested:** A borrower created by a conversion earlier in the day (test account, password set directly in the database because the welcome email is not delivered locally) signed in at `http://localhost:5173`.
- **Result:** Sign-in works. The dashboard shows "Funding Applications 1" and "Free Plan — Lifetime Access".
- **Issue faced:** The portal opened on a "Complete Your Profile" prompt for details the applicant had already given.
- **Solution:** Fixed in the conversion (entry 35) and rechecked with a new borrower: no prompt.
- **What was changed:** `EmbedFormService.php` (entry 35).
- **Not confirmed:** The "My Applications" list had not finished loading when it was captured, so the application row itself was not seen on that page — only the count on the dashboard.
- **Status:** Done

## 2026-10-12 — 37. Emails and bell notifications are waiting in the queue, not delivered

- **What was tested:** Whether the emails and bell notifications from the day's submissions and conversions were delivered.
- **Result:** They were not. `QUEUE_CONNECTION` is `redis` and no queue worker is running on this machine, so 423 jobs are waiting: 351 bell notifications, 45 "converted" emails, 18 "new submission" emails and 9 lead emails. No notification row was written to the database on this date.
- **Issue faced:** The queue holds jobs from both databases used on this date. The jobs refer to records by id, so running the worker now, with `fch_dev` connected, would attach the first database's notifications and emails to unrelated users and applications.
- **Solution:** The queue was **not** processed. Mail delivery rules are covered by the existing backend tests (`EmbedFormNotificationMailTest`, 13 tests, passing).
- **What was changed:** Nothing.
- **Decision needed:** Clear the queue (`php artisan queue:clear`) before starting a worker, or accept that the waiting jobs will be applied to the current database. All mail servers configured for the three partners involved point to the Mailtrap sandbox.
- **Status:** Pending — see T4
