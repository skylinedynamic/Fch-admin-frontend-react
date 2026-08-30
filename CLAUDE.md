# Fch-admin-frontend-react

Admin panel. React 18 + Vite + TypeScript config, PrimeReact/Reactstrap/Bootstrap UI, CKEditor, Zustand state, TanStack Query, Stripe payments.

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build (also copies `assets/` into `dist/`)
- `npm run preview` — preview build

## Architecture
Same foundation as `client-fch` (shared conventions, separate codebase) — `src/lib/http/apiClient.ts`, `src/lib/query/`, `src/lib/auth/` route guards, Zustand `src/store/` — but the module surface is the full back-office: roles/permissions, employees, partners, lenders, commissions, subscriptions, CMS, leads, contacts, the sequencing engine, etc.
- **Routing**: centralized in `src/App.jsx`, gated by the same `src/lib/auth/` guard set as `client-fch`; admin-only screens should additionally check role/permission via `PermissionGuard`, not ad hoc `user.role` checks in the page.
- **Feature modules** (`src/modules/<feature>/`): same `services.ts` / `queries.ts` / `types.ts` / `index.ts` shape as `client-fch`. Pages call a module's query hooks, never `apiClient` directly.
- **Pages vs. components**: `src/pages/<feature>/` for route-level screens (often with local `components/`/`hooks/`); `src/components/` for shared UI, including admin-specific shared pieces under `components/Common/Filters`, `components/Common/Payment`, `components/Common/Activity`, and `components/errors`.
- **State**: Zustand in `src/store/`, plus `store/config/` for admin-specific config state alongside `store/auth/`.
- **HTTP**: one shared `apiClient` (mirrors `client-fch`'s interceptor behavior — Bearer token, `X-Timezone`, global 401/403 handling). Don't create a second axios instance.
- **Config/constants**: `src/config/*.ts` for status enums/option lists, same convention as `client-fch`.
- Additional libraries specific to this app: CKEditor (`@ckeditor/ckeditor5-react`) for rich text, `react-dnd` for drag-and-drop (sequencing engine), `html2pdf.js`/`mammoth` for document generation/import — keep usage of these confined to the module that needs them rather than pulling them into shared components.
- Same `.jsx` → `.tsx` migration in progress; write new/changed files in TypeScript.

## Coding standards
- No ESLint/Prettier is configured yet — set one up (ESLint + `typescript-eslint` + Prettier) before relying on style review alone.
- Follow the fixed module shape (`services.ts` → `queries.ts` → `types.ts` → `index.ts`) for any new feature.
- This app renders sensitive PII/financial data across many admin screens — every new page/action touching it must sit behind a route guard and/or `PermissionGuard`, not just a UI hide.
- Status/role/permission strings and dropdown options belong in `src/config/` or the module's `types.ts`, not repeated as inline literals.

## TDD (strict)
No test runner is configured yet — that is the first task before any TDD-covered work starts here. Once set up (Vitest + React Testing Library, Playwright/Cypress for E2E):
1. Write a failing test for the behavior first.
2. Write the minimum code to pass it.
3. Refactor with the test green.
No production code without a preceding failing test. Never weaken/skip a test to make it pass.

Cover the level the change actually needs, not just one:
- **Unit** — hooks/utils/store logic in isolation, dependencies mocked.
- **Integration** — a component rendered with its real children/store/query client (no mocking the thing under test).
- **Functional** — an actual admin user flow end-to-end (form submit → API call → UI result) via Playwright/Cypress.

## Compliance & data security
This is the admin surface for applicant PII, credit, and payment (Stripe) data — see the `code-reviewer` agent's compliance/data-security categories (PCI-DSS, FCRA, GLBA, TCPA, state privacy law). Gate every screen/action showing sensitive data behind Spatie roles/permissions; never log or persist raw card numbers, SSNs, or bank account numbers client-side.

## Branching
- `stage` — test branch. All feature work lands here first for QA.
- `release` — production branch. Only what's been verified on `stage` is merged here.
- Feature branches (`feature/*`) branch from `stage` and merge back via PR.
- Hotfixes branch from `release`, then merge to both `release` and `stage`.

## Code review
Use the `code-reviewer` agent (`~/.claude/agents/code-reviewer.md`) before merging into `stage` or `release`: architecture, security, duplication, vulnerable dependencies, magic strings, code smells, performance.

## Related projects
Sibling repos under `d:\laragon\www\`, part of the same FCH system:
- **`fch-backend-api`** — Laravel 12 API backend shared by this app and the borrower portal (Passport auth, Spatie roles/permissions). This app talks to the `v1/admin` (`FCH` controller namespace) surface.
- **`fch-borrower-react`** (`client-fch`) — the borrower-facing portal. Same stack and module conventions as this repo (`services.ts`/`queries.ts`/`types.ts`/`index.ts`, shared `apiClient`/`queryKeys`/auth-guard patterns) but a separate codebase — treat conventions there as shared guidance, not shared code.
- **`fch-website-react`** — public marketing site (Next.js 16 + React 19), separate stack. This admin panel manages the CMS content, leads, and blog data the website reads.
