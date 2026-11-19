# Partner Mail Notification tab; partner and client tabs on one line

**Date:** 2026-11-19
**Branch:** feature/agreement-builder-modification

## Problem
- The partner profile needed a **Mail Notification** tab holding two emails: **Lead Notification Recipient** and **Client Notification Recipient**.
- The partner profile and client details tab bars wrapped onto a second line on narrower screens. With another tab added, the partner bar would wrap even more.
- After the first version: the tabs showed no pointer cursor on hover (the old markup set `cursor: pointer` inline), and icons weren't wanted.

## Solution
- **`src/components/Common/OverflowTabs.tsx`** (new), a reusable tab bar:
  - The tabs stay on one line. The ones that don't fit go into a **More** button at the end, which shows a count and opens a dropdown (`role="menu"`).
  - Picking a tab from More opens it, and the open tab is always kept on the line.
  - Disabled tabs (those that need a saved record) stay disabled, in the line and in the menu.
  - More closes on Escape or a click outside it.
  - Widths are measured on the real tabs, with no hidden copy, so each tab's text exists once on the page and text queries still find a single element. All tabs and More are laid out and measured once before paint, again when the set of tabs changes or the line widens, and the split is reworked on any resize.
  - The fit logic is the pure `computeVisibleTabs()`, unit-tested on its own.
  - Tabs are `<button type="button" role="tab">` with `aria-selected` and `disabled` / `aria-disabled`.
- **Partner profile** (`PartnerProfile.jsx`):
  - The hand-written tab list is replaced by `OverflowTabs` (tablist "Partner sections"), with the same tabs and visibility rules as before.
  - **Mail Notification** is added last; it is disabled while a partner is being created, and `?tab=mailNotification` opens it.
  - The header's Update button is hidden on the new tab.
  - Tab icons removed.
- **Client details** (`ClientDetails.tsx`): same `OverflowTabs` (tablist "Client sections"), same tabs and rules; the Funding Sequence icon is removed.
- **`PartnerMailNotificationTab.tsx`** (new), wired to fch-api `GET/PUT /admin/partners/{id}/mail-notification` (see the fch-api handoff `2026-11-19-partner-mail-notification-recipients.md`):
  - It draws one `type="email"` field per notification type the API lists (Lead / Client Notification Recipient today, more later with no frontend change), with the API's label and help.
  - The intro names the partner's own email, used for any field left empty.
  - The page header's **Save Mail Notification** button submits it (form id `PARTNER_MAIL_NOTIFICATION_FORM_ID`). It is enabled only after a change.
  - An emptied field is sent as `null`. A success toast confirms the save, and a refused address shows under its field with no toast.
  - Fields show the saved value until edited; the edits are dropped after a save. This avoids a render loop and stale values.
  - `src/config/partnerMailNotification.ts` holds only the tab and form ids.
- **`modules/partner`:**
  - `fetchPartnerMailNotification` / `updatePartnerMailNotification` (services);
  - `usePartnerMailNotification` / `useUpdatePartnerMailNotification` (queries; the save refreshes the cache and the activity sidebar);
  - types `PartnerNotificationRecipient`, `PartnerMailNotificationRecipients`;
  - query key `partner.mailNotification(id)`.
- **E2E helpers** (`e2e/support/helpers.ts`): `openProfileTab(page, name)` clicks a tab on the line or picks it from More; `profileTabNames(page)` lists every tab, line and More. Specs that clicked a tab now under More use them: `agreement-required`, `partner-commissions`, `partner-configuration`, `partner/client-agreement-preview`, `client-profile-tabs`.
- **CSS** (`assets/css/custom.css`):
  - the line doesn't wrap;
  - pointer cursor on tabs, More and menu items;
  - not-allowed cursor on disabled tabs (overriding Bootstrap's `pointer-events: none`);
  - 4px corners on More's dropdown, which sits above the page.

## Files changed
- `src/components/Common/OverflowTabs.tsx`: new one-line tab bar with More.
- `src/config/partnerMailNotification.ts`: tab and form ids.
- `src/pages/partners/components/PartnerMailNotificationTab.tsx`: new tab, loads and saves the recipients.
- `src/modules/partner/{services,queries,types}.ts`, `src/lib/query/queryKeys.ts`: mail notification API.
- `e2e/support/helpers.ts`: `openProfileTab`, `profileTabNames`, `moreTabsButton`; the specs listed above use them.
- `src/pages/partners/PartnerProfile.jsx`: `OverflowTabs`, Mail Notification tab, no tab icons, Update hidden on the tab.
- `src/pages/clients/ClientDetails.tsx`: `OverflowTabs`, no tab icons.
- `assets/css/custom.css`: `.overflow-tabs*`, `.partner-mail-notification__intro`.

## Testing
- Unit: `tests/components/Common/OverflowTabs/computeVisibleTabs.test.ts` (new, 7).
- Integration:
  - `tests/components/Common/OverflowTabs/OverflowTabs.test.tsx` (new, 6; widths mocked since jsdom has no layout);
  - `tests/pages/partners/PartnerProfile.mailNotificationTab.test.tsx` (new, 7: fields from the API, save with null, Save off until changed, inline 422, no Update, disabled while creating);
  - `tests/modules/partner/mailNotification.services.test.ts` (new, 3);
  - `tests/pages/clients/ClientDetails.tabs.test.tsx` (new, 3).
- CSS: `tests/assets/css/overflowTabs.test.ts` (new, 5).
- `tests/modules/partner`, `tests/pages/partners`, `tests/pages/clients`, `tests/components/Common/OverflowTabs` and `tests/assets/css`: **380 passed** (62 files). `npm run typecheck`: clean.
- E2E: `e2e/sidebar/partners/partner-mail-notification-save.spec.ts` (new, 3) covers showing saved values with the partner-email note, saving with null, and an inline 422.
- E2E: `e2e/sidebar/partners/partner-tabs-overflow.spec.ts` (new, 4) and `e2e/sidebar/clients/client-tabs-overflow.spec.ts` (new, 2) check, at 1280px and 2400px widths:
  - the tabs sit on one line;
  - More lists the rest and opens one;
  - Escape closes More;
  - tabs show a pointer;
  - the Mail Notification fields appear.

## Open items
- There is no permission gating on the tab or its API yet (as decided).
- Other pages with long tab bars could use `OverflowTabs` the same way.
- E2E-016 and E2E-025 (in `docs/e2e/ISSUES.md`) were already failing before this change.
