# Fch-admin-frontend-react

Admin panel. React 18 + Vite + TypeScript config, PrimeReact/Reactstrap/Bootstrap UI, CKEditor, Zustand state, TanStack Query, Stripe payments.

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build (also copies `assets/` into `dist/`)
- `npm run preview` — preview build
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — Vitest once (`npm run test:unit`, `npm run test:feature` for one level; `npm run test:watch`, `npm run test:coverage`)
- `npm run test:e2e` — Playwright (`npm run test:e2e:ui` for the interactive runner)

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
Test runner: Vitest + React Testing Library + MSW for unit/integration (`vitest.config.ts`, tests under `tests/`, harness in `tests/setup.ts` / `tests/test-utils.tsx` / `tests/mocks/`), Playwright for E2E (`playwright.config.ts`, specs under `e2e/`).
1. Write a failing test for the behavior first.
2. Write the minimum code to pass it.
3. Refactor with the test green.
No production code without a preceding failing test. Never weaken/skip a test to make it pass.

Cover the level the change actually needs, not just one:
- **Unit** — hooks/utils/store logic in isolation, dependencies mocked.
- **Integration** — a component rendered with its real children/store/query client (no mocking the thing under test).
- **Functional** — an actual admin user flow end-to-end (form submit → API call → UI result) via Playwright.

### Every change updates the tests (mandatory)
For **any** change — a new feature, a change to an existing feature, or a bug fix:

1. **Find the existing tests first.** Search `tests/` (Vitest unit and integration/feature tests) and `e2e/` (Playwright specs) for the module, page, component and flow you are touching. Update every test whose expectation the change affects — never leave a test asserting the old behaviour, and never delete, skip or weaken a test to make it pass.
2. **Cover each level the change touches**, not just one:
   - **Unit** — new/changed hook, util, store or `services.ts` mapping logic.
   - **Integration / feature** — new/changed component or page, rendered with its real children, store and query client, HTTP mocked with MSW against the real `apiClient`.
   - **Functional (E2E)** — new/changed user flow (form submit → API call → UI result) in Playwright.
3. **Bug fixes are test-first:** write the test expecting the *correct* behaviour, watch it fail, then fix.
4. **New features:** failing test → minimum code → refactor with the test green.
5. Run the affected suites (and `npm run typecheck`) before finishing, and say so — with the failure output if anything fails.

When the change follows an API change in `fch-api`, update the MSW handlers and fixtures to the API's new response shape in the same change.

## Handoffs
`docs/handoff/` holds one file per finished piece of work — a feature, a change or a bug fix — named `YYYY-MM-DD-short-title.md`. It records **the problem**, **the solution**, the files changed, the tests added/updated and anything left open, so the next person (or session) can pick up without re-reading the history. Template: `docs/handoff/README.md`. Write it when the work is finished, before handing over or opening the PR.

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
