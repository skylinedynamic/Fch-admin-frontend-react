# CLAUDE.md Audit Findings — Fch-admin-frontend-react

Generated 2026-08-30. Result of scanning `CLAUDE.md` against the actual repo (package.json, `src/`, `.github/workflows/`) to find stale claims and undocumented conventions. Nothing here has been applied to `CLAUDE.md` yet — treat this as a to-do list for the next doc update.

## Stale / incorrect claims in CLAUDE.md

1. **Dead dependencies listed as in-use (CLAUDE.md:18)** — the doc claims `react-dnd`, `html2pdf.js`, and `mammoth` are used and should be "confined to the module that needs them," but none of the three appear anywhere in `src/` (verified via full-tree grep for `react-dnd`/`DndProvider`/`useDrag`/`useDrop`, `html2pdf`, `mammoth` — zero matches). `src/pages/funding/components/FundingSequencingForm.tsx` (the "sequencing engine" itself, which the doc implies uses drag-and-drop) has no drag/drop code at all. These three packages are still listed in `package.json` (lines 29, 31, 35-36) despite being dead weight. Only CKEditor is actually used, and only in `src/pages/cms/BlogEdit.tsx` + `src/config/ckeditorConfig.ts`.

2. **Module-shape consistency overstated (CLAUDE.md:13)** — "same `services.ts`/`queries.ts`/`types.ts`/`index.ts` shape... for any new feature" doesn't hold for 15 of 37 modules under `src/modules/`, which are missing `queries.ts` and/or `types.ts`: `activity-log`, `billing`, `cms`, `leads`, `subscription-plan`, `verification-center`, `payment`, `payment-method`, `invoice`, `resource`, `settings`, `credit-accounts`, `filemanager`, `my-subscription`, `business-service`.

3. **`.jsx`→`.tsx` migration progress understated as uniform (CLAUDE.md:19)** — progress is very uneven: `src/modules/**` is essentially done (0 `.jsx`, 3 `.tsx`, 123 `.ts`); `src/pages/**` is only ~58% migrated (108 `.tsx` vs 77 `.jsx`); `src/components/**` ~55% (38 `.tsx` vs 31 `.jsx`).

**Confirmed still accurate**: `npm run` scripts are exactly `dev`/`build`/`preview` (`package.json:7-9`); the build script literally does `vite build && cp -r assets dist/`; no ESLint/Prettier/test-runner config files exist anywhere in root; `src/lib/http/apiClient.ts`, `src/lib/query/`, `src/lib/auth/` (9 guard files), and `src/store/{auth,config}/` all exist as described.

## Missing from CLAUDE.md

1. **CI/CD**: `.github/workflows/deploy-stage.yml` and `deploy-release.yml` — pushes to `stage`/`release` auto-build and `rsync`-deploy over SSH to EC2 targets literally named `admin-portal-react` and `partner-portal`, restart nginx, and run an HTTP smoke test. The Branching section (CLAUDE.md:42-46) has no pointer to any of this.

2. **Undocumented major dependencies that are actually wired in**: `@fullcalendar/*` (react/daygrid/timegrid/list/interaction/bootstrap5) used in `src/pages/appointments/Appointments.jsx`; `summernote` used via `src/hooks/useSummernote.js` across `EmailComposeModal.jsx`, `AppointmentModal.jsx`, `ActivityCreateModal.jsx`, `TierVendorModal.jsx`; `jquery`/`select2`/`choices.js`/`flatpickr`/`sweetalert2` widely used (~120 files touch jQuery-style `$`/imports); `@stripe/react-stripe-js` + `@stripe/stripe-js` (mentioned only in the one-line repo summary, not in Architecture); `react-toastify`.

3. **`src/modules/` feature list is larger than documented (CLAUDE.md:11)** — also present but unlisted: `activity-log`, `agreement`, `appointment`, `auth-profile`, `business-service`, `capital-access`, `change-request`, `client`, `credit-accounts`, `credit-profile-request`, `documents`, `filemanager`, `funding`/`funding-application`, `invoice`, `my-subscription`, `payment`/`payment-method`, `resource`, `tiers`, `verification-center`.

4. **Leftover one-off migration/utility scripts at repo root**: `fix-breadcrumbs.cjs`, `revert_imports.py`, `update_imports.cjs`, plus a `scratch/` folder and `demo.json` — unmentioned anywhere, worth a one-line note so they aren't mistaken for active tooling.

5. **`docs/PARTNER_TECHNICAL_DOCUMENTATION.md`** and **`docs/FCH_SaaS_Electronic_Signature_Audit_Trail_Developer_Handoff.docx`** exist as a second documentation source in this same `docs/` folder but aren't cross-referenced from `CLAUDE.md`.

## Suggested next step
Fold the items above into `CLAUDE.md`: remove/replace the dead-dependency claim, soften the module-shape and migration-progress claims with real numbers, add a CI/CD note under Branching, list the actually-used dependencies, point the feature-surface sentence at `src/modules/` as the source of truth instead of an incomplete enumeration, and cross-reference the other two files already in this `docs/` folder.
