# Saved secrets show as 16 dots: CMS Site Settings (reCAPTCHA) and MicroBilt Config

**Date:** 2026-11-10

## Problem
- On CMS → Site Settings, the reCAPTCHA Secret Key field always looked empty, even after saving a secret. Only a grey placeholder ("Saved - leave blank to keep") hinted it was saved. Clearing the field and saving did not remove the secret either, because a blank secret means "keep" to the API. With the site key cleared and the secret kept, every website lead was refused ("Please complete the reCAPTCHA verification.").
- Settings → MicroBilt Config's client secret field looked empty in the same way.

## Solution
- When a secret is saved, the field shows **16 dots** (`SECRET_DISPLAY_MASK` in `src/config/appConfig.ts`), so it looks saved. The secret itself still never reaches the page; the API sends only its 8-dot mask (`SETTINGS_SECRET_MASK`).
- `secretForSave()` turns the 16 dots back into the API's 8-dot mask on save, which the API reads as "keep". Sending the 16 dots as they are would be saved as a new secret.
- Field size and height are unchanged.
- **Site Settings (reCAPTCHA):**
  - **Left alone:** kept.
  - **New value typed:** replaces the secret.
  - **Field cleared:** also sends `remove_recaptcha_secret_key=1` (`REMOVE_RECAPTCHA_SECRET_FIELD`) and the API removes the secret.
  - **No secret saved:** the field is empty with the placeholder "Secret Key".
- **MicroBilt Config:**
  - **Left alone:** kept.
  - **New value typed:** replaces the secret.
  - **Field cleared:** "Client Secret is required." and nothing is saved, because MicroBilt cannot work without the secret of the mode in use. The other mode's saved secret goes back as the mask and is kept.
  - No API change was needed: `AppConfigurationService` already masks the secret and keeps it when the mask comes back.
- Credit Profile's OpenAI key is unchanged ("Saved - leave blank to keep").
- API side for Site Settings: `fch-api/docs/handoff/2026-11-10-recaptcha-half-config-and-secret-removal.md`. That change also turns the reCAPTCHA check off unless both keys are saved.

## Files changed
- `src/config/appConfig.ts`: `SECRET_DISPLAY_MASK`, `secretForSave()`, `REMOVE_RECAPTCHA_SECRET_FIELD`.
- `src/pages/cms/SiteSettings.tsx`: 16 dots when saved; the API mask on save; the remove flag when a saved secret is cleared.
- `src/pages/settings/components/MicroBiltConfigForm.tsx`: 16 dots when saved; the API mask on save; the secret of the mode in use always required.
- `tests/pages/settings/SettingsSecretFields.test.tsx`: Site Settings (4) and MicroBilt (5) tests for the new behaviour.
- `e2e/sidebar/cms/site-settings/site-settings.spec.ts`: the BUG-022 test updated; new "clearing removes it" test.
- `e2e/sidebar/settings/settings.spec.ts`: new MicroBilt client secret tests (2).

## Testing
- Vitest: the changed tests failed before each change and pass now. `tests/pages/settings` + `tests/pages/cms`: 263 passed. A full run earlier: 2,955 passed; the only failures were these new MicroBilt tests before the form was changed.
- Playwright (mock project, after `npm run build`, `--workers=1`): `e2e/sidebar/settings/settings.spec.ts` + `e2e/sidebar/cms/site-settings`. With the default workers, `page.goto` timed out across unrelated tests too (machine load).
- `npm run typecheck` clean.

## Open items
- Deploy together with the fch-api change. With an older API the remove flag is ignored (the secret is kept), which is safe but does not remove it.
