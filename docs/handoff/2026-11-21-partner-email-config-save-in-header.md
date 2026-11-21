# Partner Configuration: Email Configuration's Save button in the page header

2026-11-21

## Problem
On Partner profile › Configuration › Email Configuration (`/partners/:id?tab=configuration`), the **Save Configuration** button sat at the bottom of the mail form, below a long list of fields. Every other partner tab with its own form (Mail Notification, Commissions, Tenant Config) puts its save button in the page header, beside **Back** in the breadcrumb row.

## Solution
The page header now renders Email Configuration's **Save Configuration** button beside Back. It works the same way as the other tabs:
- The header button is `type="submit"` and points at the section's form by id, `PARTNER_MAIL_CONFIGURATION_FORM_ID`.
- The form reports whether it can save up to the page, which uses that to enable or disable the button.

How it fits together:
- `MailConfigurationCard` takes two new optional props, `formId` and `onSaveStateChange`. When `onSaveStateChange` is given:
  - the card leaves out its own Save button;
  - it reports `{ canSave, saving }` to the page whenever that changes;
  - it reports `null` when it unmounts, so the header button disappears when another section or tab is opened.
- `canSave` follows the existing rule: if the settings are verified and nothing has been changed, there is nothing to save.
- `MailConfigurationSection` and `PartnerConfigurationSection` pass the props through. `PartnerProfile` keeps the reported state and renders the header button only while it is not `null`.
- **Settings › Email Configuration is unchanged.** It doesn't pass `onSaveStateChange`, so its Save and Test Mail buttons stay at the bottom of the card. The fallback mail card is unchanged too.

An earlier attempt put the button in the card's own header. That was the wrong place: the user wanted it beside Back in the breadcrumb row, so it was reverted.

## Files changed
- `src/config/partnerConfiguration.ts`: adds the `PARTNER_MAIL_CONFIGURATION_FORM_ID` constant.
- `src/pages/settings/components/MailConfiguration/MailConfigurationCard.tsx`:
  - new `formId` / `onSaveStateChange` props and the `MailSaveState` type;
  - the form takes the id;
  - the save-state calculation moved above the early return so the reporting hooks always run;
  - the card's own Save button is hidden when the page provides one.
- `src/pages/settings/components/MailConfiguration/MailConfigurationSection.tsx`: passes `formId` / `onSaveStateChange` to the card.
- `src/pages/partners/components/PartnerConfigurationSection.tsx`: new `onMailSaveStateChange` prop, wired to the mail section along with the form id.
- `src/pages/partners/PartnerProfile.jsx`: adds `mailConfigurationForm` state and the header **Save Configuration** button for the Configuration tab.

## Testing
- **New:** `tests/pages/partners/PartnerProfile.configurationTab.test.tsx`, 4 tests. Before the change, the three header-button tests failed and the section-switch test passed; after the change, all four pass. They check that:
  - the button is in the header beside Back, and the card has none of its own;
  - clicking it posts `partner_id: 21` with the form values;
  - it is disabled while verified settings are unchanged, and enabled after an edit;
  - it disappears from the header when SMS Configuration is opened.
- **New E2E case** in `e2e/sidebar/partners/partner-configuration.spec.ts`: saves from the header button beside Back with `partner_id`, and the button goes away on SMS. 8/8 pass (mock project, after `npm run build`).
- `e2e/mail-configuration.spec.ts` (Settings page, unchanged behaviour): 6/6 pass.
- Full Vitest suite: 480 files, 3656 passed, 2 expected failures. `npm run typecheck` is clean.

## Open items
- The partner Configuration tab's SMS, Branding, Agreement and Payment sections still keep their save buttons inside their forms. The same `formId` / state-reporting pattern can move them to the header if wanted.
