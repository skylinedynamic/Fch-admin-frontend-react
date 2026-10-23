# Partner profile › Configuration tab

**Date:** 2026-10-23
**Branch:** `hotfix` (uncommitted)

## Problem
On a partner's profile (`/partners/:id`) the host could not see or change that partner's Email, SMS, Branding or Payment configuration. Those screens existed only under Settings, and only for the signed-in user's own partner.

## Solution
- **New "Configuration" tab** on the partner profile. It shows only to a **host** user holding `manage partner configuration` (`PARTNER_CONFIGURATION_PERMISSION`, `src/config/partnerConfiguration.ts`), on an existing, non-host partner.
- **Sections follow the partner's type, as on its own Settings page:**
  - white-label: Email Configuration, SMS Configuration, Branding, Payment Integration
  - certified: Payment Integration only, with a note that it uses the platform's email, SMS and branding
- **No copied forms:** the tab reuses the real Settings screens (`MailConfigurationSection`, `SmsConfigurationForm`, `BrandingForm`, `PaymentMethodConfig`) inside a new `ConfigPartnerProvider` (`src/modules/settings/configPartner.tsx`).
  - The settings **services** take an optional `partnerId` and send `partner_id`.
  - The **query hooks** read the provider, and their cache keys include the partner id.
  - Branding and Payment pass it to the services themselves.
- **Outside the provider** (the Settings page) nothing changes.
- The profile's own Save button is hidden on this tab, since each screen saves itself.
- Branding logos picked for a partner go into that partner's folder.
- SMS wording ("Text messages for …") describes the partner being edited.
- Mail verification codes still go to the signed-in host, who enters them.

### Design (follow-up, same day)
- **Tab label:** "Configuration", no icon.
- **Partner details strip** at the top (`section` "Partner details"):
  - initials avatar
  - company name
  - type and status badges
  - contact name, email and phone (only those the partner has)
- **Section menu:** a vertical menu on the left, each item with a one-line description (no icons) and the active item marked with the brand colour. The open section sits in a titled card ("Changes apply to {partner} straight away.") on the right. On tablet and phone the menu stacks above it.
- **Styles:** `.partner-config*` in `assets/css/custom.css`, 4px radius like the rest of the panel.
- The seeder was run again on the local DB (idempotent; 2 roles, 2 users).

### Follow-up (2026-10-24): activity log and notification
- Each change the host saves in this tab is logged on the partner's activity, visible to everyone, and the partner gets a bell notification (live push). The backend does the recording; see fch-api `docs/handoff/2026-10-23-partner-configuration-tab.md`.
- Here: new `LOG_TYPE_PARTNER_CONFIGURATION_UPDATE` (`src/config/appConfig.ts`), with a settings icon in `src/utils/activityIconConfig.ts` and `ActivitySidebar.jsx`. Test: `tests/utils/activityIconConfig.test.ts`.
- The entry's "Show changes" table lists each changed field (Field / Previous / New); credentials read "Changed".
- **Live refresh:** every partner-scoped write in `src/modules/settings/services.ts` (mail save/delete/default/verify, SMS save, branding save, payment config/status) fires `REFRESH_ACTIVITIES_EVENT` (`src/config/appConfig.ts`) after it succeeds, so the activity sidebar reloads without a page reload. Own Settings changes, reads and failed saves do not. Tests: 2 new in `tests/modules/settings/configPartner.services.test.ts`, red before.

## Files changed
- `src/config/partnerConfiguration.ts`: new. Permission, tab id, sections per partner type, `canManagePartnerConfiguration`.
- `src/modules/settings/configPartner.tsx`: new provider and hooks.
- `src/modules/settings/services.ts`: optional `partnerId` on the mail, SMS, app-configuration and payment-provider calls.
- `src/modules/settings/queries.ts`: mail, SMS and app-configuration hooks are partner-aware.
- `src/pages/settings/components/BrandingForm.tsx`, `PaymentMethodConfig/PaymentMethodConfig.tsx`, `PaymentMethodConfig/PaymentMethodConfigForm.tsx`, `SmsConfiguration/SmsConfigurationForm.tsx`: use the provider's partner.
- `src/pages/partners/components/PartnerConfigurationSection.tsx`: new tab panel.
- `src/pages/partners/PartnerProfile.jsx`: tab, panel and Save-button exclusion.
- Tests:
  - `tests/modules/settings/configPartner.services.test.ts`
  - `tests/config/partnerConfiguration.test.ts`
  - `tests/pages/partners/PartnerConfigurationSection.test.tsx`
  - `e2e/sidebar/partners/partner-configuration.spec.ts` (all new)

## Testing
- New unit and integration tests: red before, green after.
- Vitest full suite: **213 files, 1557 passed** (+2 expected fail). `npm run typecheck`: clean.
- Playwright (mock, fresh build): the new spec (5) plus `partner-profile.spec.ts` all pass. `e2e/sidebar/settings` still shows **the same 15 failures as before this change** (pre-existing, e.g. the old "Site Branding" label).

## Open items
- **Backend:** fch-api `docs/handoff/2026-10-23-partner-configuration-tab.md` (permission, resolver, seeder for roles 1 and 2). Deploy the API and run the seeder first.
- **Not in the tab:** the host's own fallback mailbox, Test Mail and Custom Domain.
- Not committed.
