# Custom Domain and Tenant Config — refused domains show under the field, the whole field turns red, the borrower domain is optional (BUG-121)

**Date:** 2026-10-26
**Branch:** bugfix/all-bugfix
**Author:** awlad

## Problem
QA defect log **BUG-121** (PP-SET-07): Settings › Custom Domain accepted `not a domain`. The format check is fixed in fch-api (`docs/handoff/2026-10-26-custom-domain-must-be-a-host-name.md`).

On the two screens that edit these domains (Settings › Custom Domain, and the host's Partners › profile › **Tenant Config**):
- with a field error, only the input turned red, not its icon box;
- the borrower domain had `required`, so the browser said "Please fill out this field" and Tenant Config showed a red `*`, although the borrower domain is optional (as decided);
- Settings › Custom Domain added a toast ("Validation failed.") beside the field message.

## Solution
On both screens:
- a 422 shows each message **under its field only**, with no toast, as decided;
- the icon box gets `border-danger` with its input, so the whole field is outlined;
- **only the API validates** (as decided): neither domain input has `required` any more, so the browser never stops the form with "Please fill out this field". An empty partner domain is sent and the API answers "Enter the partner portal domain." under the field;
- Tenant Config's borrower label lost its `*`, since the borrower domain is optional.

Success and load-failure toasts are unchanged.

## Files changed
- `src/pages/settings/components/TenantDomainConfig.jsx`: no toast on a 422; icon box border; no `required` on either domain.
- `src/pages/partners/components/TenantConfigSection.jsx`: icon box border; no `required` on either domain; no `*` on the borrower label; unused 422 code removed.
- Tests: Vitest in `tests/pages/settings/components/` and `tests/pages/partners/components/`; E2E in `e2e/sidebar/settings/` and `e2e/sidebar/partners/` (details below).

## Testing
- **Vitest,** `TenantDomainConfig.test.tsx` (new, 3 tests) and `TenantConfigSection.test.tsx` (new, 2 tests): the message under the field and no toast; icon box `border-danger` only on the refused field; neither domain is browser-required; no `*` on the borrower label. They failed first and pass after.
- `tests/pages/partners` + `tests/pages/settings`: 139 passed. `npm run typecheck` clean.
- **Browser screenshot (mock):** the red outline covers the icon box and the input.
- **E2E (mock):** `settings-domain-branding.spec.ts` (+2: an invalid borrower domain; an empty partner domain is sent and the API message shows) and `partner-profile.spec.ts` (+1, `not a domain` with an empty borrower domain → message under the field, no toast): 48 passed, 1 failed.
- **The failure is not from this change:** "Sign-in branding › the sign-in screen loads the branding" expects the title "Acme Capital" but gets "Acme Capital | Partner Portal" (portal metadata, 89864db3, 17 Oct).

## Open items
- The sign-in branding title spec needs updating to the "| Partner Portal" title. Separate from BUG-121.
- **QA sheet:** BUG-121 → Fixed after the stage retest.
