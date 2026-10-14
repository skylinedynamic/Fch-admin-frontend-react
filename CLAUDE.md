# Fch-admin-frontend-react

Admin panel. React 18 + Vite + TypeScript config, PrimeReact/Reactstrap/Bootstrap UI, CKEditor, Zustand state, TanStack Query, Stripe payments.

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build (also copies `assets/` into `dist/`)
- `npm run preview` — preview build

## Architecture
Same foundation as `client-fch` (shared conventions, separate codebase) — `src/lib/http/apiClient.ts`, `src/lib/query/`, `src/lib/auth/` route guards, Zustand `src/store/` — but the module surface is the full back-office. `src/modules/` (37 modules) includes: roles/permissions, employees, partners, lenders, commissions, subscriptions, CMS, leads, contacts, the sequencing engine (funding/funding-application), activity-log, agreement, appointment, auth-profile, business-service, capital-access, change-request, client, credit-accounts, credit-profile-request, documents, filemanager, invoice, my-subscription, payment/payment-method, resource, tiers, verification-center, and more — treat `src/modules/` itself as the source of truth for the current feature list rather than this summary.
- **Routing**: centralized in `src/App.jsx`, gated by the same `src/lib/auth/` guard set as `client-fch`; admin-only screens should additionally check role/permission via `PermissionGuard`, not ad hoc `user.role` checks in the page.
- **Feature modules** (`src/modules/<feature>/`): same `services.ts` / `queries.ts` / `types.ts` / `index.ts` shape as `client-fch`. Pages call a module's query hooks, never `apiClient` directly. This shape isn't universal — about 15 of 37 modules are missing `queries.ts` and/or `types.ts` (e.g. `activity-log`, `billing`, `cms`, `leads`, `subscription-plan`, `verification-center`, `payment`, `invoice`, `resource`, `settings`, `credit-accounts`, `filemanager`) — but is the target for new/changed modules.
- **Pages vs. components**: `src/pages/<feature>/` for route-level screens (often with local `components/`/`hooks/`); `src/components/` for shared UI, including admin-specific shared pieces under `components/Common/Filters`, `components/Common/Payment`, `components/Common/Activity`, and `components/errors`.
- **State**: Zustand in `src/store/`, plus `store/config/` for admin-specific config state alongside `store/auth/`.
- **HTTP**: one shared `apiClient` (mirrors `client-fch`'s interceptor behavior — Bearer token, `X-Timezone`, global 401/403 handling). Don't create a second axios instance.
- **Config/constants**: `src/config/*.ts` for status enums/option lists, same convention as `client-fch`.
- **Libraries actually wired in**: CKEditor (`@ckeditor/ckeditor5-react`) for rich text, used only in `pages/cms/BlogEdit.tsx` + `config/ckeditorConfig.ts`; `@fullcalendar/*` (react/daygrid/timegrid/list/interaction/bootstrap5) in `pages/appointments/Appointments.jsx`; Summernote via `hooks/useSummernote.js` in several modals (`EmailComposeModal`, `AppointmentModal`, `ActivityCreateModal`, `TierVendorModal`); jQuery/select2/choices.js/flatpickr/sweetalert2 widely used across older screens; `@stripe/react-stripe-js`/`@stripe/stripe-js` for payments; `react-toastify` for toasts. **`react-dnd`, `html2pdf.js`, and `mammoth` are listed in `package.json` but are dead dependencies with zero usage anywhere in `src/`** — don't assume the sequencing engine uses drag-and-drop, and don't add new code depending on these three without first checking they're still needed.
- Same `.jsx` → `.tsx` migration in progress, but progress is uneven: `src/modules/**` is essentially done, `src/pages/**` is only ~58% migrated, `src/components/**` ~55%. Write new/changed files in TypeScript.
- Leftover one-off migration/utility scripts at the repo root (`fix-breadcrumbs.cjs`, `revert_imports.py`, `update_imports.cjs`, `scratch/`, `demo.json`) are not part of the app — don't treat them as active tooling or entry points.
- `docs/PARTNER_TECHNICAL_DOCUMENTATION.md` and `docs/FCH_SaaS_Electronic_Signature_Audit_Trail_Developer_Handoff.docx` are a second documentation source in this repo's `docs/` folder, alongside this file.

## Coding standards
- No ESLint/Prettier is configured yet — set one up (ESLint + `typescript-eslint` + Prettier) before relying on style review alone.
- Follow the fixed module shape (`services.ts` → `queries.ts` → `types.ts` → `index.ts`) for any new feature.
- This app renders sensitive PII/financial data across many admin screens — every new page/action touching it must sit behind a route guard and/or `PermissionGuard`, not just a UI hide.
- Status/role/permission strings and dropdown options belong in `src/config/` or the module's `types.ts`, not repeated as inline literals.

## TDD (strict)
Vitest + React Testing Library (`npm test`, tests in `tests/`) and Playwright (`e2e/`) are configured. For every change:
1. Write a failing test for the behavior first.
2. Write the minimum code to pass it.
3. Refactor with the test green.
No production code without a preceding failing test. Never weaken/skip a test to make it pass.

Cover the level the change actually needs, not just one:
- **Unit** — hooks/utils/store logic in isolation, dependencies mocked.
- **Integration** — a component rendered with its real children/store/query client (no mocking the thing under test).
- **Functional** — an actual admin user flow end-to-end (form submit → API call → UI result) via Playwright.

## E2E tests
One Playwright tree, `e2e/`, laid out like the sibling `fch-borrower-react` suite — **one folder per sidebar menu item**:
- `e2e/sidebar/<menu>/` — every screen reachable from the sidebar, in the menu's own folder (`dashboard`, `partners`, `leads`, `clients`, `capital-access`, `lenders`, `funding-sequence`, `commissions`, `invoices`, `payments`, `subscriptions`, `upcoming-billings`, `appointments`, `task-reminders`, `notification`, `resources`, `employees`, `users`, `payment-method`, `plan-fee`, `roles-permissions`, `settings`); a submenu item goes in `<group>/<item>/` (`intake-review/{pre-qualification,funding-request,funding-application,change-requests,credit-profile-requests}`, `credit-builder/{manage-tier,verification-center,credit-accounts}`, `cms/{site-settings,blogs,seo-settings}`, `embedded-form/{configuration,loan-applications}`). Detail/create/edit pages opened from a menu screen live in that menu's folder. `e2e/sidebar/menu/` covers the sidebar itself and the permission matrix.
- `e2e/topbar/<item>/` — header items (`profile`, `contacts`, `my-subscription`, `notification-bell`, `logout`, `menu`); `e2e/auth/` — login / forgot / reset (guest).
- `e2e/support/` — `helpers.ts` (mock API), `routes.ts` (guard table), `live/` (real-API env + fixtures); `e2e/fixtures/` — persona permission snapshots.

Two kinds of spec, side by side in the same folder:
- `<name>.spec.ts` — **mocked**: every API call is intercepted by `mockApi()`, so validation, permissions and error cases are cheap to force. `npm run test:e2e` (parallel, ~10 min for the full suite).
- `<name>.live.spec.ts` — **real `fch-backend-api` + local database**, signed in once as the host by `e2e/auth.setup.ts` (session in git-ignored `e2e/.auth/`). Opens each screen by clicking the sidebar, like a user, and fails on any 5xx or uncaught page error. `npm run test:e2e:live` (one worker; needs the API on `E2E_API_URL` and `E2E_HOST_EMAIL`/`E2E_HOST_PASSWORD` in `.env.e2e`). Live specs are read-only unless named `*-submit`/`*-save`/`*-create`, which must undo their change or be safe to repeat.

E2E follows the feature (mandatory) — a feature change without its E2E update is not finished:
- **New screen, route, form, button or permission** — add its specs in the menu's folder (mocked, and a live check for a new screen) and, where it has a route, an entry in `e2e/support/routes.ts` so the access matrix covers it.
- **Changed behavior** (validation rule, required field, permission, API payload or response shape, label the tests match on, redirect) — update every spec that asserts the old behavior. Search `e2e/` for the route, endpoint and visible text you touched.
- **Removed feature** — remove its specs and its `e2e/support/routes.ts` entry.
- **Fixed bug that a spec marks as a known bug** (`test.fail()`) — remove the marker and its comment in the same change.
- **API change in `fch-backend-api`** that this app consumes — update the mocked responses to the real shape; a mocked spec must not accept data the real API never sends (e.g. the login user has `name`, not `first_name`).
- Never weaken, skip or delete a test to get a pass. If a test is wrong, fix the test and say why.
- Run the affected spec files before handing a change over, and both suites before merging into `stage`.
- **Issues found by E2E runs** are tracked in `docs/e2e/ISSUES.md` with a status per issue (Fixed / Open / Needs decision / Won't fix) — add new findings there and update the status when fixed.

## Handoff notes (required)
Every new feature, and every change to an existing feature (including bug fixes), ends with a handoff file in `docs/handoff/`. Write it in the same task as the change — not later, and not only when asked.
- **File name**: `docs/handoff/YYYY-MM-DD-<full-title-in-kebab-case>.md` — the date the work was done plus its title, e.g. `2026-10-14-e2e-sidebar-menu-folders-and-real-api-suite.md`. No date folders; several features on one date are several files with the same date. If one already exists for the same date and title, update it.
- **Contents**: `# YYYY-MM-DD — Title`, then an "At a glance" table of **the problem (what was wrong or missing, and how it showed up), the solution, and what was changed (files)**; then dated, titled entries with Problem / Solution / Files / Verified / Status; then what is still pending. A test run that found no defect still records the issues met during the run.
- Add the file to the index in `docs/handoff/README.md`.

## Compliance & data security
This is the admin surface for applicant PII, credit, and payment (Stripe) data — see the `code-reviewer` agent's compliance/data-security categories (PCI-DSS, FCRA, GLBA, TCPA, state privacy law). Gate every screen/action showing sensitive data behind Spatie roles/permissions; never log or persist raw card numbers, SSNs, or bank account numbers client-side.

## Branching
- `stage` — test branch. All feature work lands here first for QA.
- `release` — production branch. Only what's been verified on `stage` is merged here.
- Feature branches (`feature/*`) branch from `stage` and merge back via PR.
- Hotfixes branch from `release`, then merge to both `release` and `stage`.
- Pushes to `stage`/`release` auto-deploy via `.github/workflows/deploy-stage.yml`/`deploy-release.yml`: rsync+SSH to EC2 targets named `admin-portal-react`/`partner-portal`, restart nginx, HTTP smoke test. A merge to either branch is a live deploy, not just a QA/prod gate.

## Code review
Use the `code-reviewer` agent (`~/.claude/agents/code-reviewer.md`) before merging into `stage` or `release`: architecture, security, duplication, vulnerable dependencies, magic strings, code smells, performance.

## Related projects
Sibling repos under `d:\laragon\www\`, part of the same FCH system:
- **`fch-backend-api`** (`fch-api`) — **the base project of the platform.** Laravel 12 API backend shared by this app and the borrower portal (Passport auth, Spatie roles/permissions). This app talks to the `v1/admin` (`FCH` controller namespace) surface. The data model, API contracts, permissions and compliance controls originate there — this repo is a consumer. For any change that spans both, start in `fch-api` and follow its response shapes rather than adapting the API to this app.
- **`fch-borrower-react`** (`client-fch`) — the borrower-facing portal. Same stack and module conventions as this repo (`services.ts`/`queries.ts`/`types.ts`/`index.ts`, shared `apiClient`/`queryKeys`/auth-guard patterns) but a separate codebase — treat conventions there as shared guidance, not shared code.
- **`fch-website-react`** — public marketing site (Next.js 16 + React 19), separate stack. This admin panel manages the CMS content, leads, and blog data the website reads.
