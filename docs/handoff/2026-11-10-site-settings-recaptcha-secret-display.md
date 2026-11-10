# CMS Site Settings: reCAPTCHA secret shows as dots and can be removed

**Date:** 2026-11-10

## Problem
On CMS → Site Settings, the reCAPTCHA Secret Key field always looked empty, even after saving a secret. Only a grey placeholder ("Saved - leave blank to keep") hinted it was saved. Clearing the field and saving did not remove the secret either, because a blank secret means "keep" to the API. With the site key cleared and the secret kept, every website lead was refused ("Please complete the reCAPTCHA verification.").

## Solution
- When a secret is saved, the field now holds the mask the API sends (`SETTINGS_SECRET_MASK`, `••••••••`). In the password input it shows as dots, so a saved secret looks saved. The secret itself still never reaches the page.
- On save:
  - **Left alone:** the mask goes back and the API keeps the secret.
  - **New value typed:** it replaces the secret.
  - **Field cleared:** the page also sends `remove_recaptcha_secret_key=1` (`REMOVE_RECAPTCHA_SECRET_FIELD` in `src/config/appConfig.ts`) and the API removes the secret.
- With no secret saved, the field is empty with the placeholder "Secret Key" and no removal is sent.
- MicroBilt and Credit Profile secret fields are unchanged ("Saved - leave blank to keep").
- API side: `fch-api/docs/handoff/2026-11-10-recaptcha-half-config-and-secret-removal.md`. That change also turns the reCAPTCHA check off unless both keys are saved.

## Files changed
- `src/pages/cms/SiteSettings.tsx`: field holds the mask; sends the remove flag when a saved secret is cleared.
- `src/config/appConfig.ts`: `REMOVE_RECAPTCHA_SECRET_FIELD`.
- `tests/pages/settings/SettingsSecretFields.test.tsx`: Site Settings tests rewritten for the new behaviour (4 tests).
- `e2e/sidebar/cms/site-settings/site-settings.spec.ts`: the BUG-022 test updated; new "clearing removes it" test.

## Testing
- Vitest: the updated tests failed before the change (2 of the new expectations) and pass now. `tests/pages/settings/SettingsSecretFields.test.tsx` + `tests/pages/cms`: 39 passed. Full suite: see below.
- Playwright (mock project, after `npm run build`): `e2e/sidebar/cms/site-settings`, 9 passed with `--workers=1`. With the default workers, `page.goto` timed out across unrelated tests too, so that was machine load, not this change.
- `npm run typecheck` clean.

## Open items
- Deploy together with the fch-api change. With an older API the remove flag is ignored (the secret is kept), which is safe but does not remove it.
