# BUG-074 / BUG-075: FICO Score error under the field, credit profile activity icon

**Date:** 2026-11-03
**Branch:** bugfix/round-2
**Author:** Awlad Hossain

## Problem
Clients › client › Credit Profile (QA round 2).

- **BUG-074 (R2-OP-CRP-07).** A credit profile saved with FICO Score cleared. The API now refuses it with a 422 on `metrics.fico_score` (fch-api handoff with the same name). This screen showed every save error as a toast, and it called the `saveCreditProfile` service directly, not through a query hook.
- **BUG-075 (R2-OP-CLI-21).** The API now writes `credit_profile_save` / `credit_profile_delete` activity entries. The Activity panel had no icon for those log types.

## Solution
- **Save through a mutation hook.** New `useSaveClientCreditProfile(clientId)` in `modules/client/queries.ts`. It re-reads the profile on success and leaves the cache alone on a refusal. `CreditProfileSection` uses it, and `isSaving` now comes from `isPending`.
- **Field error inline.** On a 422, `apiFieldErrors()` gives the field errors:
  - `metrics.fico_score` shows under FICO Score as `FormFeedback`, and the input gets `invalid` / `aria-invalid`. No toast.
  - The Metrics tab is brought forward, and the error clears as soon as the field is edited.
  - Other failures still toast, with the API's message.
- **Label.** The FICO Score label is now tied to its input (`for` / `id`) and shows `*` for the host.
- **Activity icon.** Added `LOG_TYPE_CREDIT_PROFILE_SAVE` / `LOG_TYPE_CREDIT_PROFILE_DELETE` to `config/appConfig.ts`. `getAvatarConfig()` shows `ri-bank-card-line` for both.

## Files changed
- `src/modules/client/queries.ts`: `useSaveClientCreditProfile`.
- `src/pages/clients/components/CreditProfileSection.tsx`: the mutation hook, inline FICO error, label `for` / `id` and `*`.
- `src/config/appConfig.ts`: the two log type constants.
- `src/utils/activityIconConfig.ts`: icon for the two log types.

## Testing
- **Unit:**
  - `tests/modules/client/queries.test.tsx`: `useSaveClientCreditProfile` posts with `borrower_id` and refreshes the profile. A 422 leaves the cache alone.
  - `tests/utils/activityIconConfig.test.ts`: icon for both log types, and the values match the API.
- **Integration:** `tests/pages/clients/components/CreditProfileSection.test.tsx`: a refused FICO shows under the field, with `aria-invalid` and no toast, and the error clears when a score is typed.
- **E2E:** `e2e/client-credit-profile.spec.ts`: "the host cannot save a credit profile without a FICO Score" (422 → inline error → type a score → saved).
- The new tests failed first, then passed after the change.
- `npm run typecheck`: clean.
- Vitest, full suite: 350 files, 2488 passed and 2 expected fail.
- Playwright `e2e/client-credit-profile.spec.ts`: 6/6 passed. The first run timed out on `page.goto` while the full Vitest suite was loading the machine. The rerun was clean.

## Open items
- `apiFieldErrors` / `apiErrorMessage` live under `pages/settings/components/SmsConfiguration/apiErrors.ts`, but they are general helpers. Moving them to `src/utils/` would be a small, separate cleanup.
- Upload (`parseCreditProfilePDF`) and reveal (`revealClientField`) are still called as services from this component, not through query hooks.
- The parser filling FICO 850 and 0 trade accounts (QA's side note on BUG-074) is an API matter and still open.
