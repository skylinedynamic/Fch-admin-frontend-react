# E2E Issues — Admin Portal

Issues found while organising, writing and running the Playwright E2E suite (`e2e/`): the mocked specs (`*.spec.ts`) and the real-API specs (`*.live.spec.ts`, local `fch-backend-api` + `fch_dev`).
Add new findings at the bottom with the next ID; update **Status** when something changes.

**Status legend**
- ✅ **Fixed** — resolved; the E2E suite covers it
- 🟡 **Open** — confirmed, not fixed yet; the "Fix / Notes" column is the proposed solution
- 🔵 **Needs decision** — the fix depends on a product/team call
- ⚪ **Won't fix** — accepted as is (reason given)

| ID | Area (sidebar menu) | Issue | Severity | Status | Fix / Notes |
|----|---------------------|-------|----------|--------|-------------|
| E2E-001 | Test infra | The 38 mocked specs sat flat in `e2e/`, several mixing menus in one file (`billing.spec.ts` = Subscriptions + Upcoming Billings + Commissions + Payment Method + Plan & Fee; `workspace`, `account`, `intake-review`, `cms`, `payments-invoices`, `embed-form` likewise). Nothing showed which sidebar menu a test belonged to. | Medium | ✅ Fixed (2026-10-14) | Re-laid out like `fch-borrower-react`: `e2e/sidebar/<menu>/` (submenus as `<group>/<item>/`), `e2e/topbar/<item>/`, `e2e/auth/`, `e2e/support/`. Mixed files split by `describe` block. Same 1,211 test titles before and after (diffed). |
| E2E-002 | Test infra | Only the mocked suite ran against every screen; the real-API suite (`e2e-live/`) had 5 specs and none per menu, so nothing checked the screens against the real `fch-backend-api` the way the borrower suite does. | High | ✅ Fixed (2026-10-14) | `e2e-live/` replaced by `*.live.spec.ts` next to the mocked spec in each menu folder: host login once (`e2e/auth.setup.ts`), every screen opened by clicking its sidebar item, fail on any 5xx or page error (`e2e/support/live/fixtures.ts`). 119 tests across all 35 menu items + topbar + login. |
| E2E-003 | Test infra | `.env.e2e` used `craig@fourcornerfunding.com` as the host; that account does not exist in the local `fch_dev` (login: "The email you entered does not exist"). The other persona accounts in `.env.e2e` are missing too. | Medium | ✅ Fixed (2026-10-14) | Host is `craig.rice@fourcornerfunding.com` (same password). `.env.e2e.example` now names it. Persona accounts are only needed by the mocked access matrix, which uses `e2e/fixtures/personaProfiles.ts`. |
| E2E-004 | Test infra | The mocked suite ran with `workers: 1` (needed only by the live API), so a full run took over an hour. Against the Vite dev server, 50% workers made some specs time out under load. | Medium | ✅ Fixed (2026-10-14) | Mocked specs run in parallel (`workers: '50%'`) against the preview build: **1,268 passed in 10.4 min**. Live specs keep one worker (project-level `workers: 1`). Use the preview build (`npm run build`, no `E2E_BASE_URL`) for full runs. |
| E2E-005 | Dashboard | Every real login showed **"Welcome, User!"**. The login API sends `name` ("Host Admin") but no `first_name`, and `Dashboard.jsx` only read `first_name`. The mocked spec and the Vitest test both seeded a `first_name`, a field the API never sends, so they passed. Found by `dashboard.live.spec.ts`. | Medium | ✅ Fixed (2026-10-14) | `Dashboard.jsx` greets `first_name`, else the first word of `name`, else "User". Tests: `e2e/sidebar/dashboard/dashboard.spec.ts` (+1, red before), `tests/pages/dashboard/Dashboard.test.tsx` (+1, red before; "no name" test now really has no name), live `dashboard.live.spec.ts`. |
| E2E-006 | Sidebar (user dropdown) | `Sidebar.jsx` held the theme's demo user menu: "Anna Adame", "Welcome Anna!", "Balance : **$5971.67**", Messages / Help / Settings links with `href="#"`, and its own Logout — with the same `id="page-header-user-dropdown"` as the real header menu (duplicate DOM id, broke the logout spec's selector). Hidden by CSS only (`data-sidebar-user-show` is never set). Same as borrower E2E-008. | Low | ✅ Fixed (2026-10-14) | The dead block and its unused `avatar-1.jpg` import are removed. Test: `e2e/sidebar/menu/navigation.spec.ts › carries no template demo user menu` (red before). |
| E2E-007 | Intake & Review › Request Credit Profile | `GET /admin/credit-profile-requests/{id}` sends the applicant's **full 9-digit SSN** to the browser; the detail page only masks it (`***-**-6789`) until "Reveal" is pressed. Anyone with the response (devtools, a proxy, browser cache) has the full SSN. | High (PII) | 🔵 Needs decision | Backend: return the masked SSN by default and the full value only from a separate, permission-gated and audited "reveal" call. Covered as-is by `credit-profile-request-details.spec.ts` (masked until Reveal). |
| E2E-008 | Notification | The local inbox holds the same "New funding application — Michael Chen submitted funding application #56" notification **8 times**, all "6 days ago". Looks like the notification is dispatched more than once per submission (or per recipient role). | Medium | 🟡 Open | Check the funding-application-submitted notification in `fch-backend-api` (listener registered twice, or one dispatch per matching rule) and dedupe per notifiable + application. |
| E2E-009 | Commissions (search) | The search box does nothing on Enter; the search only runs after pressing **Filters**. Other list screens search as you type or on Enter. | Low | 🟡 Open | Apply the filters on Enter in `CommissionList` (and any other screen with the same pattern). The live helper presses Filters when Enter does not search. |
| E2E-010 | Upcoming Billings › details | `BillingDetails.jsx` requests the invoice ledger even when the billing record failed to load (Subscriptions details waits for the record first). | Low | 🟡 Open | Load invoices only after the details loaded, like `SubscriptionDetails.tsx`. |
| E2E-011 | Invoices › Pay (card data) | `src/pages/invoices/components/PaymentMethodForms.jsx` still has the raw-card forms (Authorize.Net / Square / Ecrypt) that the borrower portal deleted (borrower E2E-017). Not wired to a screen, and the API now refuses card fields with 422. | Medium (PCI) | 🟡 Open | Delete the three forms and their helpers, as done in `fch-borrower-react`, and add the same "no `cardNumber`/`cardCode` in a payload" guard test. |

| E2E-012 | Users (search) | **Any search on the Users screen returned 500** "Failed to retrieve users". `User::scopeSearch()` (`fch-backend-api`) still matched `users.end_date`, a column dropped by the 2026-08-15 migration, so MySQL answered "Unknown column 'end_date'". The controller swallows the exception without logging it. Found by `sidebar/users/users.live.spec.ts`. | High | ✅ Fixed (2026-10-14, backend) | `end_date` removed from the search. Test `fch-backend-api/tests/Feature/User/UserListSearchTest.php` (3; checks every searched column exists, since SQLite reads an unknown quoted column as a string and would not fail). Verified against the local API: 200 with the search. Follow-up: log the exception in `UserController::fetchUsers`. |
| E2E-013 | Users (errors) | When the user list request fails, `Users.jsx` only does `console.error` — no toast or message, so a failed search looks like a screen that never finishes. | Low | 🟡 Open | Show the API message (toast or the table's empty message) in the `catch` of `loadUsers`, as other list screens do. |
| E2E-014 | Layout (every page) | **The whole app went blank** (no layout, no error) for any user with `update email configuration settings` when `GET /common/mail-configurations` answered without a `fallback` object: `MailNotVerifiedBanner` read `data.data.fallback.from_address` → `TypeError: Cannot read properties of undefined (reading 'from_address')`, with no error boundary. Every mocked spec that does not mock that call hit it — ~259 failures in `sidebar/menu/persona-access`, `sidebar/settings`, `topbar/contacts` (30 s timeouts waiting for `#layout-wrapper`), first mistaken for machine load. | High | ✅ Fixed (2026-10-24) | The banner shows only when the reply says `uses_own_configuration: false` and carries `fallback`; anything else hides it. Test `tests/components/Layout/MailNotVerifiedBanner.test.tsx` (+3: empty list / no fallback / null data — red before, the same TypeError). Follow-up: an error boundary around the layout's optional widgets. |

## Coverage map

Every sidebar menu item has its own folder. `M` = mocked specs, `L` = live (real API) spec.

| Sidebar menu | Folder `e2e/sidebar/…` | M | L |
|---|---|---|---|
| (menu itself) | `menu/` | items per persona, submenus, every entry opens its screen, access matrix (6 personas × every route), no demo user menu | items in order, no locks, 4 submenus, single active item, submenu auto-open |
| Dashboard | `dashboard/` | greeting (first name / name / fallback), signed-out redirect | greeting from the real login |
| Partners | `partners/` | list, create, profile tabs, tenant config, file manager | list, search, row → profile |
| Leads | `leads/` | list, create, profile, convert | list, search, row → lead profile |
| Clients | `clients/` | list, filters, bulk actions, create, profile tabs, activity visibility | list, search, row → client profile |
| Intake & Review › Pre-Qualification | `intake-review/pre-qualification/` | list, details, status update | list, search, row → details |
| Intake & Review › Funding Request | `intake-review/funding-request/` | list, **details: status update / reject reason / lender required / errors** | list, search, row → details |
| Intake & Review › Funding Application | `intake-review/funding-application/` | list | list, search, row → details, **audit history** |
| Intake & Review › Change Requests | `intake-review/change-requests/` | list, approve / reject | list, search |
| Intake & Review › Request Credit Profile | `intake-review/credit-profile-requests/` | list, **details: SSN mask/reveal, borrower link, errors, host-only** | list, search, row → details |
| Capital Access | `capital-access/` | list, create, edit, bulk | list, search, row → edit |
| Lenders | `lenders/` | list, create, edit | list, search, row → edit |
| Funding Sequence | `funding-sequence/` | list, create, edit, visibility rules | list, search, row → edit |
| Credit Builder › Manage Tier | `credit-builder/manage-tier/` | list, create, edit, tasks, vendors | list, search, row → edit |
| Credit Builder › Verification Center | `credit-builder/verification-center/` | list, borrower requests | list, search |
| Credit Builder › Credit Accounts | `credit-builder/credit-accounts/` | list, create, edit | list, search, row → edit |
| Commissions | `commissions/` | list, **details: breakdown, partner view, payout (pay / cancel / refused)** | list, search, row → details |
| Invoices | `invoices/` | list, details, payment | list, search, row → invoice |
| Payments | `payments/` | list, details approve / reject | list, search, row → details |
| Subscriptions | `subscriptions/` | list, **details: plan, invoice ledger, not found** | list, search, row → details |
| Upcoming Billings | `upcoming-billings/` | list, **details: subscriber links, invoices, not found** | list, search, row → details |
| Appointments | `appointments/` | calendar, create permission, booking dialog | calendar, views, create dialog |
| Task & Reminders | `task-reminders/` | list, search, dismiss, reminder popup | list, search |
| Notification | `notification/` | list, tabs, mark read / all, delete | inbox, tabs, Unread request |
| Resources | `resources/` | list, create, edit, manage, permissions | sections, host actions |
| Employees | `employees/` | list, create, details | list, search, row → details |
| Users | `users/` | list, create, details, bulk | list, search, row → details |
| Payment Method | `payment-method/` | gateways on/off, confirm, errors | gateways, toggle → Cancel (read-only) |
| Plan & Fee | `plan-fee/` | plans, save, access | tabs, plans |
| Roles & Permissions | `roles-permissions/` | list, create, edit | roles, edit, add |
| CMS › Site Settings | `cms/site-settings/` | form, save | sections filled from the API |
| CMS › Blogs | `cms/blogs/` | list, editor, categories, tags | list, search, row → edit |
| CMS › SEO Settings | `cms/seo-settings/` | list, create, edit | list, search, row → edit |
| Embedded Form › Configuration | `embedded-form/configuration/` | settings, domains, keys | form + embed code |
| Embedded Form › Loan Applications | `embedded-form/loan-applications/` | list, details, convert | list, search, row → details |
| Settings | `settings/` | sections, permissions, domain / branding | all 10 sections open without a 5xx |

| Topbar / guest | Folder `e2e/…` | M | L |
|---|---|---|---|
| Profile | `topbar/profile/` | form, validation, change password | opens with the user's email |
| Contacts | `topbar/contacts/` | list, create, edit, delete | opens the contacts list |
| My Subscription | `topbar/my-subscription/` | plan, cancel, redirects | — (partner-only; host has none) |
| Notification bell | `topbar/notification-bell/` | badge, 99+, list, empty, mark all, view all | list → View all |
| Logout | `topbar/logout/` | menu items, API call, session cleared, failed request still logs out | real logout in its own session, protected route → login |
| Login / forgot / reset | `auth/` | validation, errors, redirects | unknown email refused, guard redirect, forgot link |

The live specs are read-only: nothing is created, changed or deleted in the local database.
