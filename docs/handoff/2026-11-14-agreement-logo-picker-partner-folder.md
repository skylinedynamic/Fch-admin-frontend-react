# Agreement Builder: logo picker opens the partner's own folder

**Date:** 2026-11-14
**Author:** Awlad Hossain

## Problem

Settings › Agreement Builder › "Add your logo" opened the file manager on a folder of its own, `agreements/{partner}`. When the user had no partner, it opened `agreements/1`, partner 1's folder.

The API's file manager now opens only the folders on its list (fch-api, R3-BUG-002). `agreements` is not on that list, so the picker would get a 403. The folder was also only ever a place to pick from: when an agreement is saved, the API copies its pictures into the private `agreement-images/`.

## Solution

- The picker opens the partner's own folder, `partners/{partner_id}`, at its base. The partner's logo and branding already live in that folder. A partner's own team and the host may open it.
- Nothing is created inside `partners/{id}` on the picker's behalf: it opens at the base, like the Branding page's picker. A first version opened a `/agreements` subfolder; that was dropped the same day.
- A user with no partner gets no picker. The old fallback to partner 1 is gone.
- The folder name is a constant in `modules/filemanager/config.ts`: `FILE_MANAGER_FOLDERS.PARTNERS`.

## Files changed

- `src/pages/settings/components/AgreementBuilder/index.tsx`: the picker's root is `partners/{partner_id}`, opened at its base. No picker without a partner.
- `src/modules/filemanager/config.ts`: `FILE_MANAGER_FOLDERS.PARTNERS`.
- `tests/pages/settings/components/AgreementBuilder/AgreementBuilder.test.tsx`: +2 tests. The picker lists `partners/42` at `/`, and opens nothing for a user with no partner.
- `e2e/sidebar/settings/settings.spec.ts`: +1 test, "Agreement Builder logo picker › opens the partner's own folder at its base".

## Testing

- **Seen failing before the fix:**
  - The 2 unit tests: the picker listed `agreements` at `/`.
  - The E2E test.
  - After the switch from `/agreements` to the base: the unit test failed again (it still listed `/agreements`) before the code change.
- **After the fix:**
  - `tests/pages/settings/components/AgreementBuilder`: 143 passed (11 files).
  - The new E2E test passed (re-run after the switch to the base: 1 passed).
  - `npm run typecheck` was clean.
- **Mock E2E for settings, employees, cms, resources, credit-builder, clients and partners** (`partner-profile.spec.ts` left out, see below): 382 passed and 61 failed.
  - The same 61 also fail with this change stashed (baseline run: 61 failed, 181 passed on those files). So they are not caused by this change.
  - Most are in `credit-accounts.spec.ts` (24), `verification-center.spec.ts` (16) and `settings.spec.ts` (14).

## Open items

- **Deploy together with fch-api.** Deploy this together with the fch-api allowlist (`fch-api/docs/handoff/2026-11-14-file-manager-folder-allowlist.md`).
- **61 failing mock E2E tests.** These were failing before this change and still need a look.
- **`partner-profile.spec.ts` does not load locally.** `VITE_WEBSITE_URL` is not set, so `new URL(...)` throws while the file loads.
