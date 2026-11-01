# Partner profile › Configuration — Agreement section

2026-10-29

## Problem

Partner profile › Configuration let the host edit a partner's Email, SMS, Branding and Payment settings, but not its agreement. Each partner keeps its own **borrower agreement**, the template its borrowers sign (`AgreementService::checkSignNeed`). Only the partner could edit it, from its own Settings › Agreement Builder. The agreement API also had no way to name another partner: it always used the signed-in user's own `partner_id`.

## Solution

- A new **Agreement** section in Partner › Configuration renders the existing Agreement Builder inside the `ConfigPartnerProvider`, so every call names the partner (`partner_id`), as the Email, SMS and Branding sections already do.
- **Shown for every partner type.** White-label and certified partners both have their own borrower agreement. The certified-partner note now reads "Only its agreement and payment settings are its own."
- **Gated** on `update partner agreement settings`, the host's own Agreement Builder permission, the same way Payment is gated on its settings permission.
- **When showing a partner**, the dashboard shows only the **Borrower Agreement Paper** row. The partner agreement (always the host's) and the global "Agreement Signing Feature" switch (host-wide) are hidden, and the agreement app-config query isn't run.
- `modules/agreement`: services take an optional `partnerId`. Hooks read `useConfigPartnerId()` and cache a partner's templates under their own key. A successful save or toggle for another partner fires `REFRESH_ACTIVITIES_EVENT`, so the change shows in the partner's activity sidebar.
- The builder's `Switch` gets `role="switch"` and `aria-checked`. It was a bare clickable `div`.

API side (fch-api, same branch name): the agreement-template endpoints accept `partner_id`. They allow it only for a **host user holding `manage partner configuration`** (403 otherwise), and log the change on the partner and notify it. See fch-api `docs/handoff/2026-10-29-partner-configuration-agreement.md`.

## Files changed

- `src/config/partnerConfiguration.ts`: `agreement` section id, `AGREEMENT_SETTINGS_PERMISSION`; Agreement offered for every partner type.
- `src/pages/partners/components/PartnerConfigurationSection.tsx`: renders `AgreementBuilder` for the Agreement section; note text.
- `src/pages/settings/components/AgreementBuilder/AgreementDashboard.tsx`: when showing a partner, only the borrower row; no signing switch or app-config read.
- `src/pages/settings/components/AgreementBuilder/CommonUI.tsx`: `Switch` exposes `role="switch"` / `aria-checked`.
- `src/modules/agreement/services.ts`: optional `partnerId` → `partner_id` on list/show/save/status.
- `src/modules/agreement/queries.ts`: partner-aware query keys; shared mutation hook; activity refresh.

## Testing

- Unit: `tests/config/partnerConfiguration.test.ts` (section lists per type/permission), `tests/modules/agreement/services.test.ts` (partner_id sent / not sent).
- Integration: `tests/modules/agreement/queries.test.tsx` (hooks inside a `ConfigPartnerProvider`), `tests/pages/partners/PartnerConfigurationSection.test.tsx` (menu, borrower-only dashboard, toggle and save carry `partner_id`).
- E2E: `e2e/sidebar/partners/partner-configuration.spec.ts`, new agreement flow plus the section list.
- Results: `npm run typecheck` clean; `npx vitest run` 216 files, 1604 passed (+2 expected fail); E2E spec 6/6 passed with `--workers=1`.

## Open items

- With the default parallel workers, the E2E spec flaked twice ("element is not stable" on a click), once in the existing SMS test. Both passed on a single worker. This was not caused by this change.
- The Email/SMS/Branding/Payment endpoints still don't check who names `partner_id` (a documented product decision in fch-api `ResolvesConfigPartner`). The agreement endpoints do check. Consider applying the same check to the others.
- Image uploads from inside the builder still use the signed-in host's File Manager, not the partner's.
