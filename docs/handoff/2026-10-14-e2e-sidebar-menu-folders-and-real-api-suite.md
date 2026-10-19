# 2026-10-14 — E2E — sidebar menu folders and real-API suite

**Date:** 2026-10-14  
**Title:** E2E — sidebar menu folders and real-API suite  
**Repositories:** Admin — `Fch-admin-frontend-react`, branch `e2e-missing-tests`. API — `fch-backend-api` (run only; no API code changed on this date). **Nothing is committed.**  
**Issue list with status:** [docs/e2e/ISSUES.md](../e2e/ISSUES.md)

Each entry: date and title, then the problem, the solution, the files touched, how it was verified and a status.

## At a glance — issue, solution and what was changed

| # | Issue faced | Solution | What was changed (files) | Status |
|---|---|---|---|---|
| 1 | The 38 mocked specs sat flat in `e2e/`, several mixing sidebar menus in one file. | Re-laid out like `fch-borrower-react`: one folder per sidebar menu (`e2e/sidebar/<menu>/`, submenus as `<group>/<item>/`), `e2e/topbar/<item>/`, `e2e/auth/`, `e2e/support/`. Mixed files split by `describe` block. | all `e2e/*.spec.ts` moved/split; `e2e/helpers.ts` → `e2e/support/helpers.ts` | Fixed and verified |
| 2 | Screens had no test against the real API, menu by menu (the old `e2e-live/` had 5 specs). | `*.live.spec.ts` next to the mocked spec in every menu folder; host login once; each screen opened by clicking the sidebar; fail on 5xx / page error. `e2e-live/` removed, its route table moved to `e2e/support/`. | `e2e/auth.setup.ts`, `e2e/support/live/*`, 39 `*.live.spec.ts`, `playwright.config.ts`, `package.json`, `e2e/run.mjs` | Fixed and verified |
| 3 | Gaps in the mocked suite: no logout or header-bell test, and no spec for 6 detail screens. | New specs: topbar logout + notification bell, commission / subscription / billing / funding-request / credit-profile-request details. | 7 new `*.spec.ts` (see entry 3) | Fixed and verified |
| 4 | Every real login showed "Welcome, User!" on the Dashboard. | Greet `first_name`, else the first word of `name`. | `src/pages/dashboard/Dashboard.jsx` + mocked, Vitest and live tests | Fixed and verified |
| 5 | The sidebar carried the theme's demo user menu ("Anna Adame", "$5971.67") with the header's DOM id. | Dead block removed. | `src/components/Layout/Sidebar.jsx`, `e2e/sidebar/menu/navigation.spec.ts` | Fixed and verified |
| 6 | Full mocked run took over an hour; `.env.e2e` host account missing locally; live run slow on one `artisan serve`. | Mocked specs in parallel on the preview build; host account corrected; live workers configurable for several API processes. | `playwright.config.ts`, `.env.e2e.example`, `e2e/README.md` | Fixed |
| 7 | Findings that need a fix outside this change. | Recorded with a status in `docs/e2e/ISSUES.md` (E2E-007 … E2E-011, E2E-013). | `docs/e2e/ISSUES.md` | Pending |
| 10 | Any search on the Users screen answered 500 (found by the live specs). | `User::scopeSearch()` no longer searches the dropped `users.end_date` column. | `fch-backend-api`: `app/Models/User/User.php`, `tests/Feature/User/UserListSearchTest.php` (new) | Fixed and verified |
| 8 | No written rule tied E2E folders, the issue list and handoffs together. | `CLAUDE.md` sections "E2E tests" and "Handoff notes (required)" rewritten. | `CLAUDE.md`, `e2e/README.md` | Done |

## 2026-10-14 — 1. Mocked specs reorganised by sidebar menu

- **Problem:** `e2e/` held 38 spec files at one level. `billing.spec.ts` covered five sidebar menus, `workspace.spec.ts` three (Dashboard, Appointments, My Subscription), `account.spec.ts` three (Profile, Notification, Task & Reminders), and `intake-review`, `cms`, `payments-invoices`, `embed-form` mixed their sub-menus.
- **Solution:** A script moved whole files with `git mv` and split the mixed ones by their top-level `describe` blocks, rewriting relative imports. Layout: `e2e/sidebar/<menu>/` for all 26 top-level menu items, `<group>/<item>/` for the 13 submenu items, `e2e/sidebar/menu/` for the sidebar and access matrix, `e2e/topbar/{profile,contacts,my-subscription,notification-bell,logout,menu}/`, `e2e/auth/`. Contacts moved under the topbar, where its menu entry is.
- **Files:** every former `e2e/*.spec.ts`; `e2e/helpers.ts` → `e2e/support/helpers.ts`; `e2e-live/routes.ts`, `navigation.ts`, `apiCallLog.ts` → `e2e/support/`.
- **Verified:** `playwright test --list` before and after: the same 1,211 test titles (diffed). `npm run typecheck:e2e` clean.
- **Status:** Fixed and verified

## 2026-10-14 — 2. Real-API specs for every menu, like the borrower suite

- **Problem:** Mocked specs answer every call with hand-written JSON, so they cannot see a response shape, a slow endpoint or a server error the real API produces. The borrower portal runs its whole suite against the local API; the admin had only five live specs, none per menu.
- **Solution:** `e2e/auth.setup.ts` logs the host in through the login page once and saves the session (`e2e/.auth/host.json`, git-ignored). `e2e/support/live/fixtures.ts` fails a test on any 5xx API response or uncaught page error, and opens screens by clicking the sidebar (`openFromSidebar`, starting on the light 404 page so dashboard calls do not queue in front). List screens share `listScreenTests()` — heading and columns, search with no match → empty → cleared → rows back (pressing the screen's Filters button where Enter does not search), first row → its detail page. Hand-written live specs cover the sidebar itself, Dashboard, Appointments, Notification, Resources, Payment Method, Plan & Fee, Roles & Permissions, Site Settings, Embedded Form Configuration, Settings (all 10 sections), topbar, logout and login. Playwright projects: `mock` (ignores `*.live.spec.ts`), `setup`, `live` (depends on setup). The old `e2e-live/` folder was removed; `report.mjs` and `api-coverage.mjs` now read the mocked suite only.
- **Files:** `e2e/auth.setup.ts`, `e2e/support/live/env.ts`, `e2e/support/live/fixtures.ts`, `e2e/**/*.live.spec.ts` (39), `playwright.config.ts`, `package.json` (`test:e2e`, `test:e2e:live`), `e2e/run.mjs`, `e2e/report.mjs`, `e2e/api-coverage.mjs`, `tsconfig.e2e.json`, `.gitignore`, `.env.e2e.example`.
- **Verified:** see entry 9.
- **Status:** Fixed and verified

## 2026-10-14 — 3. Missing mocked specs

- **Problem:** No spec clicked Logout or the header bell; the detail pages `/commissions/:id`, `/subscriptions/:id`, `/billing/:id`, `/intake-review/funding-request/:id` and `/intake-review/credit-profile-requests/:id` were never opened.
- **Solution:** New specs: `topbar/logout/logout.spec.ts` (6), `topbar/notification-bell/notification-bell.spec.ts` (7), `sidebar/commissions/commission-details.spec.ts` (13: breakdown, partner view, notes, payout pay / cancel / refused / not payable), `sidebar/subscriptions/subscription-details.spec.ts` (7), `sidebar/upcoming-billings/billing-details.spec.ts` (7), `sidebar/intake-review/funding-request/funding-request-details.spec.ts` (11: status change, reject reason required, lender required before approval, errors, partner read-only), `sidebar/intake-review/credit-profile-requests/credit-profile-request-details.spec.ts` (6: SSN masked until Reveal, borrower link by permission, errors, host only). The live spec for Funding Application adds the document audit history.
- **Files:** the seven spec files above.
- **Verified:** each file run on its own: all passed; then in the full run (entry 9).
- **Status:** Fixed and verified

## 2026-10-14 — 4. Dashboard greeted every real user as "User"

- **Problem:** `dashboard.live.spec.ts` showed "Welcome, User!" for the host. The login response stores `name: "Host Admin"` and no `first_name`; `Dashboard.jsx` read only `first_name`. The mocked spec and `Dashboard.test.tsx` seeded `first_name`, which the API never sends, so both passed.
- **Solution:** `const firstName = currentUser?.first_name || currentUser?.name?.trim().split(' ')[0] || 'User'`. Tests written first and seen failing: mocked "greets a user from the login response by the first word of their name", Vitest the same; the "no name" tests now really have no name.
- **Files:** `src/pages/dashboard/Dashboard.jsx`, `e2e/sidebar/dashboard/dashboard.spec.ts`, `tests/pages/dashboard/Dashboard.test.tsx`, `e2e/sidebar/dashboard/dashboard.live.spec.ts`
- **Verified:** mocked dashboard spec 4/4, Vitest `tests/pages/dashboard` 8/8, live dashboard spec passed.
- **Status:** Fixed and verified (ISSUES E2E-005)

## 2026-10-14 — 5. Demo user menu in the sidebar

- **Problem:** `Sidebar.jsx` rendered the theme's sample dropdown — "Anna Adame", "Welcome Anna!", "Balance : $5971.67", `href="#"` links and a second Logout — with `id="page-header-user-dropdown"`, the id of the real header menu. CSS hid it (`data-sidebar-user-show` is never set), but the duplicate id made the new logout spec's selector match two elements.
- **Solution:** The block and its unused `avatar-1.jpg` import removed (the borrower portal fixed the same, its E2E-008). Test first: "carries no template demo user menu" failed, then passed.
- **Files:** `src/components/Layout/Sidebar.jsx`, `e2e/sidebar/menu/navigation.spec.ts`
- **Verified:** `navigation.spec.ts` + `logout.spec.ts` 61/61; Vitest `tests/components` 63/63.
- **Status:** Fixed and verified (ISSUES E2E-006)

## 2026-10-14 — 6. Test infrastructure

- **Problem:** (a) the mocked suite ran with one worker, over an hour for a full run; (b) `.env.e2e` named `craig@fourcornerfunding.com`, which is not in the local `fch_dev` ("The email you entered does not exist"); (c) one `php artisan serve` made the live run ~40 s per test; (d) against the Vite dev server, 50% workers made some sidebar specs time out.
- **Solution:** (a) mocked project runs with `workers: '50%'` on the preview build; (b) host is `craig.rice@fourcornerfunding.com` (same password; `.env.e2e` updated locally, `.env.e2e.example` documents it); (c) live project's workers come from `E2E_LIVE_WORKERS` (default 1); locally four `artisan serve` processes (8001–8004) ran behind a small round-robin proxy on :8000 (a scratch script, not in the repo); (d) full runs use the preview build — the same specs pass with 2 workers on the dev server.
- **Files:** `playwright.config.ts`, `.env.e2e.example`, `e2e/README.md`
- **Verified:** entry 9.
- **Status:** Fixed

## 2026-10-14 — 7. Findings left open

- **Problem / Solution:** recorded in `docs/e2e/ISSUES.md` with a proposed fix each: E2E-007 the credit-profile-request API sends the full SSN to the browser (needs decision, backend); E2E-008 the same notification stored 8 times; E2E-009 Commissions search ignores Enter; E2E-010 billing details loads invoices after a failed load; E2E-011 raw-card payment forms still in `PaymentMethodForms.jsx`.
- **Files:** `docs/e2e/ISSUES.md`
- **Status:** Pending

## 2026-10-14 — 8. Rules written down

- **Problem:** Nothing tied the menu folders, the issue list and handoffs together for the next change.
- **Solution:** `CLAUDE.md` "E2E tests": folder per sidebar menu, `*.spec.ts` vs `*.live.spec.ts`, E2E follows the feature, issues go to `docs/e2e/ISSUES.md` with a status. "Handoff notes (required)": every new feature or change ends with `docs/handoff/YYYY-MM-DD-<title>.md` stating the problem, the solution and the files changed.
- **Files:** `CLAUDE.md`, `e2e/README.md`, `docs/handoff/README.md`
- **Status:** Done

## 2026-10-14 — 10. Users search answered 500 (backend)

- **Problem:** `users.live.spec.ts` › search: typing anything in the Users search box made `POST /common/users/fetch-users` answer 500 "Failed to retrieve users". Tinker showed `SQLSTATE[42S22] Unknown column 'end_date'`: `User::scopeSearch()` still matched `end_date`, which `2026_08_15_000002_drop_payment_and_date_columns_from_users_table` dropped. The controller's `catch` returns the 500 without logging, so nothing reached `storage/logs`.
- **Solution:** `end_date` removed from the search (name, email, phone, entity type, status and role name remain). Test first: `UserListSearchTest › the search only uses columns the users table has` failed with "users.end_date is searched but does not exist", then passed. The HTTP tests alone could not catch it: on SQLite an unknown double-quoted column is read as a string literal.
- **Files:** `fch-backend-api/app/Models/User/User.php`, `fch-backend-api/tests/Feature/User/UserListSearchTest.php` (new, 3 tests)
- **Verified:** `php artisan test tests/Feature/User` — 16 passed. Local API: the same request now 200 on all four servers. Live Users spec passes.
- **Status:** Fixed and verified (ISSUES E2E-012)

## 2026-10-14 — 9. Test runs

**Final clean run (all changes in place, idle machine):** mocked **1,270 passed, 0 failed, 0 skipped** (17.9 min); live **119 passed, 0 failed, 0 skipped** (9.6 min); `fch-backend-api` `php artisan test` **1,344 passed, 0 failed, 0 skipped**; `fch-borrower-react` E2E 126 passed + the one backend-caused failure fixed and re-run (4/4).

Earlier runs during the day:

- **Mocked suite** (`npm run test:e2e`, preview build, 50% workers): final run with every change in place — **1,270 tests: 1,260 passed, 10 timed out** while the machine was at 100% CPU (the live API servers and a dev server were running too). The two affected files (`sidebar/appointments/*`, `sidebar/menu/persona-access.spec.ts`) were re-run on their own: **386 passed, 0 failed**. An earlier full run on an idle machine: 1,268 passed, 0 failed (10.4 min).
- **Live suite** (`npm run test:e2e:live`, real API + `fch_dev`, `E2E_LIVE_WORKERS=4` behind the local proxy): **119 tests: 118 passed, 0 failed** (11.4 min) after the Users fix; the one remaining failure was in the test itself (Task & Reminders starts on today's date range, so Clear can bring back rows) — fixed and re-run: passed. No test is skipped: the search check now runs on an empty table too.
- **Vitest:** `tests/pages/dashboard` 8/8, `tests/components` 63/63.
- **Typecheck:** `npm run typecheck:e2e` clean.

## Pending

- ISSUES E2E-007 … E2E-011.
- `e2e/report.mjs` / `e2e/api-coverage.mjs` count the mocked suite only; live results are in the Playwright HTML report.
- Persona accounts in `.env.e2e` (white-label, certified, employees) do not exist in the local DB; the six-persona matrix runs mocked only.
- No live write flows yet (create / save); the borrower suite has them with seeders that undo the change.
