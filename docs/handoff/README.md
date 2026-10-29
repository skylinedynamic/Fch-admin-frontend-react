# Handoff notes

Every handoff file sits directly in this folder (no sub-folders) and is named with the **date and the full title** of the feature or task:

```
docs/handoff/YYYY-MM-DD-full-title-of-the-feature-or-task.md
```

Several features or tasks on the same date means several files with the same date and different titles.

## Index

### 2026-10-29

| File | Title |
|---|---|
| [2026-10-29-client-documents-by-category.md](2026-10-29-client-documents-by-category.md) | Client › Documents tab: one table grouped by category, required first, per-category upload |
| [2026-10-29-bug-106-view-agreement-without-signed-copy.md](2026-10-29-bug-106-view-agreement-without-signed-copy.md) | View Agreement without a signed copy — "No signed agreement", Re-sign for a missing copy (BUG-106) |
| [2026-10-29-add-user-seat-limit-window-on-open.md](2026-10-29-add-user-seat-limit-window-on-open.md) | Add User opened at the seat limit shows the purchase window right away (BUG-109 retest) |
| [2026-10-29-appointment-edit-time-zone-bug-132.md](2026-10-29-appointment-edit-time-zone-bug-132.md) | Appointment edit saved 6 hours late — fixed by the browser time zone change (BUG-132) |
| [2026-10-29-manage-tier-delete-in-use-and-vendor-logo-file-manager.md](2026-10-29-manage-tier-delete-in-use-and-vendor-logo-file-manager.md) | BUG-095 (reopened) / BUG-127: one task deletes without a 405, a task or vendor in use is refused with the reason, the vendor logo comes from the File Manager |
| [2026-10-29-client-ssn-ein-masked-with-reveal.md](2026-10-29-client-ssn-ein-masked-with-reveal.md) | BUG-014 (reopened): the client's SSN and EIN arrive masked and are revealed on the eye button, change requests too |
| [2026-10-29-upcoming-billings-amount-outstanding-sort.md](2026-10-29-upcoming-billings-amount-outstanding-sort.md) | BUG-012 (reopened): Upcoming Billings sorts by Amount and Outstanding again |

### 2026-10-28

| File | Title |
|---|---|
| [2026-10-28-activity-task-any-date-no-validation-toast.md](2026-10-28-activity-task-any-date-no-validation-toast.md) | Activity log — a Task takes any date, validation is not toasted |
| [2026-10-28-assign-pickers-active-staff-only.md](2026-10-28-assign-pickers-active-staff-only.md) | Assign pickers (Task, Client, Lead Owner, Agent) list active staff only |

### 2026-10-27
- [2026-10-27-login-footer-without-a-brand-name.md](2026-10-27-login-footer-without-a-brand-name.md) — BUG-118: the login footer leaves no gap when the branding has no name.
- [2026-10-27-invoice-details-email-invoice.md](2026-10-27-invoice-details-email-invoice.md) — BUG-091: the invoice details page can e-mail an unpaid invoice.
- [2026-10-27-rejected-loan-application-convert-disabled.md](2026-10-27-rejected-loan-application-convert-disabled.md) — BUG-098: Convert is disabled on a rejected loan application.
- [2026-10-27-add-user-seat-limit-purchase.md](2026-10-27-add-user-seat-limit-purchase.md) — BUG-109: Add User at the seat limit opens the seat purchase window and keeps what was typed.
- [2026-10-27-appointment-edit-attendee-and-conflict.md](2026-10-27-appointment-edit-attendee-and-conflict.md) — BUG-100: editing an appointment keeps its attendee and checks conflicts before saving.
- [2026-10-27-business-financials-default-currency.md](2026-10-27-business-financials-default-currency.md) — BUG-077: Business Financials saves the USD it shows when no currency is stored.
- [2026-10-27-activity-log-assign-task-to-staff.md](2026-10-27-activity-log-assign-task-to-staff.md) — Activity log: assign a Task to a staff member.
- [2026-10-27-funding-applications-company-name-column.md](2026-10-27-funding-applications-company-name-column.md) — Funding Applications list: Company Name column.

### 2026-10-26
- [2026-10-26-employee-alternate-mobile-error.md](2026-10-26-employee-alternate-mobile-error.md) — Employee Alternate Mobile and Zip Code show the API validation message under the field.
- [2026-10-26-client-lead-not-found.md](2026-10-26-client-lead-not-found.md) — BUG-030: another partner's client or lead shows "Not Found" instead of an empty page.
- [2026-10-26-list-sort-direction.md](2026-10-26-list-sort-direction.md) — BUG-010: Capital Access, Credit Accounts, Employees and Manage Tier sort A-Z on the first header click.
- [2026-10-26-upcoming-billings-date-order.md](2026-10-26-upcoming-billings-date-order.md) — BUG-012: Upcoming Billings lists the soonest billing date first; Amount no longer sorts.
- [2026-10-26-upcoming-billings-search-on-enter.md](2026-10-26-upcoming-billings-search-on-enter.md) — BUG-006: Upcoming Billings search applies on Enter like other lists.

| File | Title |
|---|---|
| [2026-10-26-users-free-trial-seat-limit-is-by-design.md](2026-10-26-users-free-trial-seat-limit-is-by-design.md) | Users — a free-trial partner adds users up to its seat limit, then sees "Paid Version Only" (BUG-112) |
| [2026-10-26-partner-installment-calculator-default-months.md](2026-10-26-partner-installment-calculator-default-months.md) | Partner create — the installment calculator takes its default months from the plan (BUG-114) |
| [2026-10-26-certified-partner-configuration-guard-on-clients-and-leads.md](2026-10-26-certified-partner-configuration-guard-on-clients-and-leads.md) | Configuration guard — a Certified partner without an active gateway is stopped on Clients and Leads (BUG-115) |
| [2026-10-26-custom-domain-field-errors-and-optional-borrower-domain.md](2026-10-26-custom-domain-field-errors-and-optional-borrower-domain.md) | Custom Domain and Tenant Config — refused domains show under the field, the whole field turns red, the borrower domain is optional (BUG-121) |
| [2026-10-26-invoice-modal-date-and-amount.md](2026-10-26-invoice-modal-date-and-amount.md) | Invoices — the details modal shows the invoice's own amount and date (BUG-122) |
| [2026-10-26-partner-subscription-total-and-installment-balance.md](2026-10-26-partner-subscription-total-and-installment-balance.md) | Partner profile › Subscription — "Total Amount" is the whole enrollment, "Installment Balance" the rest (BUG-126) |
| [2026-10-26-client-capital-access-estimated-remaining-access.md](2026-10-26-client-capital-access-estimated-remaining-access.md) | Clients › Capital Access — the estimate is labelled "Estimated Remaining Access" (BUG-031) |
| [2026-10-26-plan-fee-refused-at-save-before-confirmation.md](2026-10-26-plan-fee-refused-at-save-before-confirmation.md) | Plan & Fee — a bad value is refused at Save, before the confirmation dialog (BUG-096 retest) |

### 2026-10-25

| File | Title |
|---|---|
| [2026-10-25-appointments-invitee-can-reschedule-confirm-or-cancel.md](2026-10-25-appointments-invitee-can-reschedule-confirm-or-cancel.md) | Appointments — the person a meeting was booked with can reschedule, confirm or cancel it (BUG-102) |
| [2026-10-25-tier-1-add-task-knows-its-tier-and-vendors.md](2026-10-25-tier-1-add-task-knows-its-tier-and-vendors.md) | Manage Tier — Add Task on Tier 1 always asks for its vendor, and says when vendors are loading (BUG-095) |
| [2026-10-25-plan-fee-shows-validation-messages-under-each-field.md](2026-10-25-plan-fee-shows-validation-messages-under-each-field.md) | Plan & Fee — the API's validation messages show under each field (BUG-096) |
| [2026-10-25-dashboard-and-intake-review-follow-permissions.md](2026-10-25-dashboard-and-intake-review-follow-permissions.md) | Request Credit Profile needs "manage credit profile requests" (BUG-097) |

### 2026-10-24

| File | Title |
|---|---|
| [2026-10-24-lead-profile-no-partner-totals.md](2026-10-24-lead-profile-no-partner-totals.md) | Lead profile — no partner totals in the header (BUG-016) |
| [2026-10-24-mail-banner-blank-app-crash.md](2026-10-24-mail-banner-blank-app-crash.md) | Mail-not-verified banner no longer blanks the whole app |
| [2026-10-24-credit-accounts-bulk-delete-status-and-form.md](2026-10-24-credit-accounts-bulk-delete-status-and-form.md) | Credit Accounts — delete selected, status on the details page, form redesign (BUG-042) |
| [2026-10-24-blog-duplicate-title-no-silent-failure.md](2026-10-24-blog-duplicate-title-no-silent-failure.md) | CMS Blogs — duplicate title no longer fails silently (BUG-045) |
| [2026-10-24-client-assign-to-lists-the-clients-partner-team.md](2026-10-24-client-assign-to-lists-the-clients-partner-team.md) | Clients — "Assign to" lists the client's partner's team (BUG-055) |
| [2026-10-24-reminders-list-says-it-shows-today.md](2026-10-24-reminders-list-says-it-shows-today.md) | Task & Reminders — the list says it shows today, and Show all dates is one click (BUG-056) |
| [2026-10-24-commissions-headers-send-the-api-sort-key.md](2026-10-24-commissions-headers-send-the-api-sort-key.md) | Commissions — each header sends the sort key the API knows (BUG-073) |
| [2026-10-24-appointments-browser-time-zone-and-no-past-times.md](2026-10-24-appointments-browser-time-zone-and-no-past-times.md) | Appointments — booked in the browser's time zone, no past times today (BUG-078, 079, 080) |

### 2026-10-23

| File | Title |
|---|---|
| [2026-10-23-partner-configuration-tab.md](2026-10-23-partner-configuration-tab.md) | Partner profile › Configuration tab |
| [2026-10-23-embed-form-convert-client-message.md](2026-10-23-embed-form-convert-client-message.md) | Embed Form — Convert modal says clearly whether the client exists |
| [2026-10-23-user-phone-number-optional.md](2026-10-23-user-phone-number-optional.md) | Users — phone number is optional |
| [2026-10-23-employee-create-account-seat-limit-like-users.md](2026-10-23-employee-create-account-seat-limit-like-users.md) | Employees — "Create account" at the seat limit behaves like Users › Add User |

### 2026-10-14

| File | Title |
|---|---|
| [2026-10-14-e2e-sidebar-menu-folders-and-real-api-suite.md](2026-10-14-e2e-sidebar-menu-folders-and-real-api-suite.md) | E2E — sidebar menu folders and real-API suite |

Issues found by E2E runs, with a status each: [../e2e/ISSUES.md](../e2e/ISSUES.md).

### 2026-10-13

| File | Title |
|---|---|
| [2026-10-13-summary-pending-and-test-data.md](2026-10-13-summary-pending-and-test-data.md) | Summary, pending items and test data |
| [2026-10-13-one-lead-delete-api.md](2026-10-13-one-lead-delete-api.md) | Leads — one lead delete API |
| [2026-10-13-remove-default-payment-method.md](2026-10-13-remove-default-payment-method.md) | My Subscription — remove the default payment method |
| [2026-10-13-application-documents-open-the-borrowers-folder.md](2026-10-13-application-documents-open-the-borrowers-folder.md) | Application documents open the borrower’s folder |
| [2026-10-13-resources-create-edit-and-manage-screens-need-their-own-permission.md](2026-10-13-resources-create-edit-and-manage-screens-need-their-own-permission.md) | Resources — create, edit and manage screens need their own permission |
| [2026-10-13-real-database-create-for-the-remaining-host-modules.md](2026-10-13-real-database-create-for-the-remaining-host-modules.md) | Real-database create for the remaining host modules |
| [2026-10-13-api-message-files-that-did-not-exist.md](2026-10-13-api-message-files-that-did-not-exist.md) | API — message files that did not exist |
| [2026-10-13-embedded-form-backend-test-for-the-borrower-profile.md](2026-10-13-embedded-form-backend-test-for-the-borrower-profile.md) | Embedded Form — backend test for the borrower profile |

### 2026-10-12

| File | Title |
|---|---|
| [2026-10-12-summary-pending-and-test-data.md](2026-10-12-summary-pending-and-test-data.md) | Summary, pending items and test data |
| [2026-10-12-embedded-form-api-fixes.md](2026-10-12-embedded-form-api-fixes.md) | Embedded Form — API fixes |
| [2026-10-12-embedded-form-admin-screen-fixes.md](2026-10-12-embedded-form-admin-screen-fixes.md) | Embedded Form — admin screen fixes |
| [2026-10-12-client-documents-host-employee-permission.md](2026-10-12-client-documents-host-employee-permission.md) | Client documents — host employee permission |
| [2026-10-12-payments-search-term-from-the-url.md](2026-10-12-payments-search-term-from-the-url.md) | Payments — search term from the URL |
| [2026-10-12-settings-access-with-section-permissions.md](2026-10-12-settings-access-with-section-permissions.md) | Settings — access with section permissions |
| [2026-10-12-resources-form-error-handling.md](2026-10-12-resources-form-error-handling.md) | Resources — form error handling |
| [2026-10-12-lenders-product-categories-sent-as-names.md](2026-10-12-lenders-product-categories-sent-as-names.md) | Lenders — product categories sent as names |
| [2026-10-12-e2e-test-suite-spec-and-configuration-changes.md](2026-10-12-e2e-test-suite-spec-and-configuration-changes.md) | E2E test suite — spec and configuration changes |
| [2026-10-12-invoices-rejected-cash-payment-shown-as-confirmed.md](2026-10-12-invoices-rejected-cash-payment-shown-as-confirmed.md) | Invoices — rejected cash payment shown as confirmed |
| [2026-10-12-api-answers-for-screens-the-ui-blocks.md](2026-10-12-api-answers-for-screens-the-ui-blocks.md) | API answers for screens the UI blocks — what each endpoint returns |
| [2026-10-12-e2e-test-runs-what-was-tested.md](2026-10-12-e2e-test-runs-what-was-tested.md) | E2E test runs — what was tested, issues faced, solutions and changes |

## Rules

- **Name:** `YYYY-MM-DD-full-title.md` — date first, then the full title in lower case with hyphens. One feature or task per file.
- **Same date, another feature:** add another file with the same date and its own title. Do not create a folder for a date.
- **File heading:** `# YYYY-MM-DD — Full title`, then the date, title, repositories and branch.
- **Every file must say three things:** what issues were faced, what the solution was, and what was changed (files). Each file opens with an "At a glance" table of exactly those three, and the entries below give the detail. A test run with no application defect still records the issues met during the run and how they were handled.
- **Entries:** every entry heading carries the date and a title (`## YYYY-MM-DD — N. Entry title`), followed by:
  - **Problem** — what was wrong or what was needed
  - **Solution** — what was actually changed
  - **Files** — the files touched
  - **Verified** — how it was checked
  - **Status** — Fixed and verified · Fixed · Pending · Information
- **Summary file:** each date also has `YYYY-MM-DD-summary-pending-and-test-data.md` — the list of that date's files, where things stand, what is still pending, the files changed, the test data left behind and how to rerun.
- Do not edit an older date's file to record new work. If an item from an earlier date is finished later, record it in a file for the new date and reference the old entry by date and number.
- Add every new file to the index above.
# Handoffs

One file per finished piece of work — a feature, a change or a bug fix — so whoever picks it up next knows what was wrong, what was done and what is left.

**File name:** `YYYY-MM-DD-short-title.md` (date the work was finished, kebab-case title), e.g. `2026-10-12-payment-form-validation.md`.

## Template

```markdown
# <Title>

**Date:** YYYY-MM-DD
**Branch:** <branch>
**Author:** <name>

## Problem
What was wrong or missing, and how it showed up (which screen, who was affected, what they saw).

## Solution
What was changed and why this approach. Note any behaviour change a user will notice, and any API change in fch-api it depends on.

## Files changed
- `src/path/to/file.tsx` — one line on what changed

## Tests
- Added: `tests/.../thing.test.tsx` — what it pins
- Updated: `tests/.../other.test.tsx` — what changed in the expectation
- E2E: `e2e/...spec.ts` — added/updated, or why not needed
- Run: `npm test` / `npm run test:e2e` / `npm run typecheck` — result

## Open / follow-up
Anything not done, decisions waiting, and actions for someone outside the code.
```
