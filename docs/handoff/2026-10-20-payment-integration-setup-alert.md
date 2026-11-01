# Payment Integration: warn on a method's page when it is not set up

**Date:** 2026-10-20
**Branch:** bugfix/all-bugfix
**Author:** Awlad Hossain

## Problem
- A payment method could be switched on without being set up for its mode: Stripe without usable keys, or Bank Transfer without a bank account. Payers were still offered it.
- With Stripe, the invoice payment modal then showed "Initializing secure payment gateway..." forever.
- Nothing on Settings → Payment Integration told the partner anything was wrong.

## Solution
This depends on the fch-api change of the same date, which now offers payers only the methods that are set up and adds `setup_issues` to `GET /common/partner-payment-providers`.
- **Settings → Payment Integration list** (`PaymentMethodConfig.tsx`): an **active** method with issues gets a "Not configured" badge on its row. There is no warning box on the list (the user asked for it only on each method's page). Switched-off methods are never flagged, and an API that sends no `setup_issues` shows nothing.
- **A method's own page** (`PaymentMethodConfigForm.tsx`, using the new `PaymentSetupAlert.tsx`):
  - While the method is active and has issues, a warning under Active Status lists what is missing.
  - For a method payers can't use (Stripe without usable keys, Bank Transfer without an account; `can_take_payments: false`) the warning says "<Method> can't take payments yet. Payers aren't offered <Method> until it's set up."
  - For a gateway paid by reference number that is missing credentials (Square, Authorize.Net, Ecrypt; still offered to payers) it says "<Method> isn't fully set up. Add what is missing below and save."
  - If the API doesn't send `can_take_payments`, the method is treated as one payers can't use.
  - It reads `setup_issues` from the details endpoint and updates from the save and status-toggle responses, so it goes away as soon as a save fixes the problem.
- **The Stripe form** (`PaymentMethodConfigForm.tsx`): when the API refuses keys after asking Stripe (`configuration.<mode>.publishable_key` or `secret_key`), the message appears under that key field as well as in the toast. Editing the field clears it.
- **Invoice payment modal** (`PaymentProviderSelector.jsx`): an empty list now reads "Online payment isn't available for this invoice right now. Please contact support to arrange payment."

## Files changed
- `src/modules/settings/services.ts`: `PartnerPaymentProvider.setup_issues`.
- `src/modules/settings/services.ts`: also `PartnerPaymentProviderConfig.setup_issues`.
- `src/pages/settings/components/PaymentMethodConfig/PaymentMethodConfig.tsx`: the "Not configured" badge.
- `src/pages/settings/components/PaymentMethodConfig/PaymentSetupAlert.tsx` (new): the warning shown on a method's page.
- `src/pages/settings/components/PaymentMethodConfig/PaymentMethodConfigForm.tsx`: the warning, kept current after save and status toggle; Stripe key errors from the API shown on their fields.
- `src/pages/invoices/components/PaymentProviderSelector.jsx`: the empty-list message.

## Tests
- Added `tests/pages/settings/components/PaymentMethodConfig/PaymentMethodConfig.test.tsx` (6):
  - the badge only on active methods that need setup;
  - no warning on the list;
  - nothing flagged when all methods are ready or the method is switched off;
  - the row opens the method's page, which shows what is missing;
  - an older API response without `setup_issues`.
- Added `tests/pages/settings/components/PaymentMethodConfig/PaymentMethodConfigForm.setup.test.tsx` (7): the warning on the method's page, none when set up or switched off, it follows the save response (gone, or the remaining issues), the Square wording, and an older API without `can_take_payments`.
- Added `tests/pages/settings/components/PaymentMethodConfig/PaymentMethodConfigForm.stripe.test.tsx` (3): a rejected secret or publishable key appears under its field, and editing clears it.
- Added `tests/pages/invoices/components/PaymentProviderSelector.test.tsx` (2): the offered methods, and the empty-list message.
- Added E2E `e2e/sidebar/settings/payment-integration-setup.spec.ts` (5):
  - the badge, with no warning on the list;
  - nothing flagged when all methods are set up;
  - Stripe's rejection under the key on the method's page;
  - the method's page shows what is missing and the warning clears after a save that fixes it;
  - Square with no credentials is marked on the list, and its page says what is missing without saying payers can't use it.
- Updated E2E `e2e/sidebar/invoices/invoice-payment.spec.ts`: the new empty-list message.
- Results:
  - `npm run typecheck` is clean.
  - `npx vitest run`: 1507 passed, 2 expected fail.
  - Playwright (mock): `payment-integration-setup` + `server-format-fields` 8/8; `invoice-payment` passed in the earlier run.
  - `e2e/sidebar/settings/settings.spec.ts` has 14 failures that predate this change: it expects a "Test Mail" section and a "Site Branding" breadcrumb that the current settings page no longer has. This change doesn't touch `SettingsForm.tsx` or `settingsSections.ts`.

## Open / follow-up
- A Stripe error for the mode that isn't on screen (for example the Sandbox keys while Production is shown) appears only in the toast, because the form shows one mode's fields at a time.
