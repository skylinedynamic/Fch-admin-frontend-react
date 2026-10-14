# 2026-10-13 — Summary, pending items and test data

**Repositories**

- API — `fch-backend-api`, branch `e2e-missing-tests`
- Admin — `Fch-admin-frontend-react`, branch `e2e-missing-tests`

**Nothing is committed in either repository.** This date continues the work of 2026-10-12; see [2026-10-12-summary-pending-and-test-data.md](2026-10-12-summary-pending-and-test-data.md) for everything done before it.

**Base URL for all browser testing:** `http://localhost:5174`.

## Features and tasks worked on this date

| File | Title | Entries |
|---|---|---|
| [2026-10-13-resources-create-edit-and-manage-screens-need-their-own-permission.md](2026-10-13-resources-create-edit-and-manage-screens-need-their-own-permission.md) | Resources — create, edit and manage screens need their own permission | 1 |
| [2026-10-13-real-database-create-for-the-remaining-host-modules.md](2026-10-13-real-database-create-for-the-remaining-host-modules.md) | Real-database create for the remaining host modules | 2–4 |
| [2026-10-13-api-message-files-that-did-not-exist.md](2026-10-13-api-message-files-that-did-not-exist.md) | API — message files that did not exist | 5 |
| [2026-10-13-embedded-form-backend-test-for-the-borrower-profile.md](2026-10-13-embedded-form-backend-test-for-the-borrower-profile.md) | Embedded Form — backend test for the borrower profile | 6 |

## All issues faced on this date — issue, solution, what was changed

Full detail for each row is in the file named in the last column.

| # | Issue faced | Solution | What was changed (files) | Status | Detail in |
|---|---|---|---|---|---|
| 1 | The routes `/resources/create`, `/resources/edit/:id` and `/manage-resources` were guarded only by "view resources". | Each route now needs the permission for what it does: `create resources` for the create form, `update resources` for the edit form, and any one of create / update / delete for the manage screen. | `src/App.jsx`, `e2e-live/routes.ts`, `e2e/resources.spec.ts` | Fixed and verified | [resources-create-edit-and-manage-screens-need-their-own-permission](2026-10-13-resources-create-edit-and-manage-screens-need-their-own-permission.md) |
| 2 | Blog create had only been exercised up to "The content field is required" (2026-10-12, pending item T2), because the test script could not type into the rich-text editor. | The script was extended to type into rich-text editors. | None in the repositories (test script only). | Done | [real-database-create-for-the-remaining-host-modules](2026-10-13-real-database-create-for-the-remaining-host-modules.md) |
| 3 | These create forms had no real-database save yet. | A driver was written for each control, and each form was saved and deleted again as host: | None in the repositories (test scripts only). | Done | [real-database-create-for-the-remaining-host-modules](2026-10-13-real-database-create-for-the-remaining-host-modules.md) |
| 4 | The SEO setting create form had no real-database save yet. | Tried as host. The form offers 17 pages, and every one of them already has a setting (19 exist), so there is no page left to create one for. Choosing a page that already has a setting opens that page's existing record instead. An empty form is blocked in the browser. | None changed. | Information — not possible without overwriting a real page's settings. | [real-database-create-for-the-remaining-host-modules](2026-10-13-real-database-create-for-the-remaining-host-modules.md) |
| 5 | Creating and deleting a Tier answered with "tier.success_created" and "tier.success_deleted" instead of readable messages. | The four files were added, with one message for every key the code uses (17 for tiers, 18 for tier tasks, 4 for the borrower activity log, 9 for settings validation). | `lang/en/tier.php`, `lang/en/tier_task.php`, `lang/en/borrower_activity_log.php`, `lang/en/setting_validation.php` (all new) | Fixed | [api-message-files-that-did-not-exist](2026-10-13-api-message-files-that-did-not-exist.md) |
| 6 | The change that copies the applicant's details onto the borrower profile (2026-10-12, entry 35) had been verified through the browser and the database only. | A feature test was added. It converts an application through the API and checks that date of birth, the full business address, entity type, industry type, years in business, number of employees, monthly and annual revenue and existing business debt are on the new borrower, and that the application is marked converted. | `tests/Feature/EmbedForm/EmbedFormConversionProfileTest.php` (new) | Fixed and verified | [embedded-form-backend-test-for-the-borrower-profile](2026-10-13-embedded-form-backend-test-for-the-borrower-profile.md) |

## Summary

| Area | State |
|---|---|
| Resource create / edit / manage screens | Now need their own permissions; partners with only "view resources" are blocked (entry 1). This closes pending item P4 from 2026-10-12. |
| Specs run on this date | resources, resources-page, persona-access, navigation — 472 passed on `http://localhost:5174` |
| Full 1,193-test suite | Last full run was on 2026-10-12 (1,192 passed). It has not been rerun since the changes of entries 31–35 (2026-10-12) and entry 1 (this date); the spec files those changes touch were run and pass. |

## Pending (carried over)

### Defects and decisions

| # | Item | State |
|---|---|---|
| P3 | Catalogue and subscription endpoints answer for accounts the UI keeps off those screens | No cross-partner data (2026-10-12 entry 34). Product decision whether to refuse them |
| P5 | "Configuration Incomplete – Payment Integration" modal sometimes covers the embedded form Configuration screen for certified and white-label accounts | Needs a decision on whether payment setup should gate that screen |
| P6 | After an employee converts an application, "View Borrower" can land on Access Denied if the role lacks `view clients` | Role design |
| P11 | Capital access "Edit Step Details" dialog closes on an empty save although three fields are marked required | Checked by the API when the programme is saved; the dialog itself does no checking (entry 3) |
| P7 | Logos and favicons broken on the public form and sidebar | Uploaded files missing from this machine's `storage/app/public` |

### Testing not completed

| # | What | Detail |
|---|---|---|
| T2 | Real-database create for the remaining host modules | **Done** for Blog, Funding sequence, Credit account, Tier and Capital access (entries 2–3). SEO setting is not possible in this data (entry 4) |
| T3 | Real-database create for Users, Clients, Partners | Not attempted: a user account uses subscription seats and can raise an invoice; partners and clients create accounts, subscriptions and emails |
| T4 | Emails and bell notifications | 423 jobs waiting in the Redis queue, not processed (2026-10-12 entry 37). Decision needed before a worker is started |
| T6 | Published form link for host and certified partners | Points to `localhost:3000`, not running locally |
| T8 | Live contact spec after its fix | Not rerun |
| T9 | Full 1,193-test suite after the latest changes | Not rerun (see Summary) |
| T10 | Backend test for the borrower-profile mapping | **Done** — entry 6 |

## Files changed on this date (uncommitted)

- `src/App.jsx`
- API: `lang/en/tier.php`, `lang/en/tier_task.php`, `lang/en/borrower_activity_log.php`, `lang/en/setting_validation.php` (new)
- API: `tests/Feature/EmbedForm/EmbedFormConversionProfileTest.php` (new)
- `e2e-live/routes.ts`
- `e2e/resources.spec.ts`
- `docs/handoff/` — this date's two files, the index

## Test data

Created and deleted again on this date, all as host and all soft-deleted now: blog post 32, funding sequence 17, credit account 87, tier 6, capital access programmes 11 and 12. A database check found no live `E2E …` rows in those tables. Test data left by 2026-10-12 is listed in that date's summary file.
