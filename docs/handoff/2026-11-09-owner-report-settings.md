# Owner Summary report settings

2026-11-09

## Problem

Report settings from the approved design was missing from the Owner Summary page (`/owner-summary`), and the owner did not want the Live and Sandbox toggle.

## Solution

- **Report settings button:** opens a dialog matching the design: an on/off for the weekly report, recipients, "+ Add recipient", Cancel and Save settings. A remove button was added to each row, since a saved address otherwise could not be taken off.
- **Validation:** the API decides. A refused address shows under its own field with a red border, never as a toast, and clears when edited. Empty rows are dropped on save.
- **Loading:** the settings are only requested when the dialog opens. If that fails, the dialog shows a message and no form, so a blank form can't overwrite saved settings.
- **Live and Sandbox removed, then a switch added back:** at the owner's later request the page has All Payment, Production and Sandbox, starting on Production. It sends `environment` on every request. Only payments are marked, so it changes only Net Earnings, its chart, and failed or disputed payments; the page says so whenever the switch isn't on Production. The "Showing" line takes the mode from the response.

## Files changed

- `src/pages/owner-summary/components/ReportSettingsModal.tsx`: new
- `src/pages/owner-summary/OwnerSummary.tsx`: button and dialog added, toggle removed
- `src/pages/owner-summary/components/format.ts`: `firstMessage()` moved here to be shared
- `src/pages/owner-summary/ownerSummary.css`: dialog styles
- `src/modules/owner-summary/services.ts`, `queries.ts`, `types.ts`: report settings calls and hooks; `environment` removed from params and query key
- `src/config/ownerSummary.ts`: maximum recipients; environment options removed
- `tests/pages/owner-summary/ReportSettings.test.tsx`: new
- `tests/pages/owner-summary/OwnerSummary.test.tsx`, `tests/modules/owner-summary/services.test.ts`, `queries.test.tsx`: updated
- `e2e/sidebar/owner-summary/owner-summary.spec.ts`: report settings flows; sandbox steps removed
- `e2e/sidebar/owner-summary/owner-report-settings-save.live.spec.ts`: new

## Testing

- **Vitest:** owner summary page and module tests: 56 pass.
- **Mocked E2E:** `owner-summary.spec.ts`: 12 pass.
- **Live E2E:** `owner-summary.live.spec.ts` and `owner-report-settings-save.live.spec.ts`: 5 passed, including login setup.
- **Typecheck:** passes.
- **Not run:** the full Vitest and E2E suites.

## Open items

- **Needs the API migration on each environment:** until `php artisan migrate` runs in `fch-api`, the dialog opens with "Report settings could not be loaded" instead of the form.
- API side: `fch-api` `docs/handoff/2026-11-09-owner-weekly-report.md`.
