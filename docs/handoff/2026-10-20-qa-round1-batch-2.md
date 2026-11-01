# QA round 1 - batch 2 (admin portal: BUG-016, BUG-022)

**Date:** 2026-10-20
**Branch:** `bugfix/qa-round1-release` (from `release`; first cut from `stage` as `bugfix/qa-round1-batch-2`, moved 2026-10-21 - no file differed between the two) - not committed
**Author:** arafat-invento (with Claude Code)
**API side:** `fch-backend-api/docs/handoff/2026-10-20-qa-round1-batch-2.md` (BUG-009/011/013 are API-only fixes)

## Problem
- **BUG-016** Leads > Lead Profile: Meetings / Total Clients / Invoiced / Subscriptions / Tickets showed the same numbers on every lead. The page loaded `/common/stats`, which is the signed-in user's partner stats, not the lead's.
- **BUG-022** CMS > Site Settings showed the reCAPTCHA secret in plain text; Settings > MicroBilt Config (and Credit Profile Config's OpenAI key) held the full secret in the page.

## Solution
- Lead Details: the counter strip, its state and the `/common/stats` call are removed; `fetchGlobalStats` (now unused) removed from `modules/leads/services.ts`. A lead has no meetings, clients, invoices or tickets of its own, so there is nothing lead-specific to show.
- The API now returns a mask for stored secrets. The three forms never put it in the input: the field is a blank password input with "Saved - leave blank to keep"; saving it blank keeps the stored secret; a value is still required when none is saved. Constants `SETTINGS_SECRET_MASK` / `SAVED_SECRET_PLACEHOLDER` in `src/config/appConfig.ts`.

## Files changed
- `src/pages/leads/LeadDetails.jsx` - counter strip and stats fetch removed
- `src/modules/leads/services.ts` - `fetchGlobalStats` removed
- `src/config/appConfig.ts` - secret mask constants
- `src/pages/cms/SiteSettings.tsx` - reCAPTCHA secret: password input, never prefilled
- `src/pages/settings/components/MicroBiltConfigForm.tsx` - client secret never prefilled; required only when none is saved
- `src/pages/settings/components/CreditProfileConfigForm.tsx` - OpenAI key the same

## Tests
- Added: `tests/pages/leads/LeadDetails.metrics.test.tsx`, `tests/pages/settings/SettingsSecretFields.test.tsx`
- Updated e2e: `e2e/sidebar/leads/lead-convert.spec.ts` (stats strip no longer shown/fetched); added a reCAPTCHA case to `e2e/sidebar/cms/site-settings/site-settings.spec.ts`
- Suites run: `npx vitest run` - 1426 passed (+2 pre-existing expected-fail); `tsc --noEmit` clean; mocked e2e - see the report for this branch

## Open / follow-up
- The backend `/common/stats` endpoint has no admin caller any more (API O66).

## Addendum 2026-10-21 - xlsx (4): BUG-003, BUG-007
- **BUG-003** Leads list: empty Contact/Email/Phone showed "Null". `src/pages/leads/Leads.jsx` `nullSafeBodyTemplate` now shows a muted "—" (null, empty, "null", "undefined"). Tests: `tests/pages/leads/Leads.emptyValues.test.tsx`, e2e `e2e/sidebar/leads/leads.spec.ts`.
- **BUG-007** Credit Accounts, Manage Tier, Verification Center said "No available options" (PrimeReact's dropdown default) on an empty result. `emptyMessage` added to `CreditAccountsList.jsx`, `TiersList.jsx`, `VerificationCenter.jsx`, and the same gap in `BorrowerVerificationRequests.jsx`, `TierTasks.jsx`, `TierVendors.jsx`. Tests: `emptyText` in `CreditAccounts.list`, `Tiers.list`, `VerificationCenter.list`; e2e empty-state cases in `credit-accounts.spec.ts`, `tiers.spec.ts`, `verification-center.spec.ts`.
- Not changed: PP-EMP-09 (Department dropdown's "No available options") is a real dropdown with no options - that wording is right there.
- Loan Applications: the table (only) shows its skeleton on every reload - sort, page, filter (`EmbedFormSubmissions.tsx`, test in `EmbedFormSubmissions.test.tsx`).
- Funding Application / Pre-Qualification date range: `src/utils/dates.ts` `toLocalYmd()` sends the picked day; `toISOString()` sent the UTC day, one day early east of UTC (API F144). Test: `tests/utils/dates.test.ts`. Open: `AppointmentModal.jsx` has the same pattern (API O68).
