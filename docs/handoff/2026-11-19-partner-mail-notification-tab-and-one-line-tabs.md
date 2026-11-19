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
- **`PartnerMailNotificationTab.tsx`** (new): the two `type="email"` fields with labels and help text. Field names and labels live in `src/config/partnerMailNotification.ts`.
- **CSS** (`assets/css/custom.css`):
  - the line doesn't wrap;
  - pointer cursor on tabs, More and menu items;
  - not-allowed cursor on disabled tabs (overriding Bootstrap's `pointer-events: none`);
  - 4px corners on More's dropdown, which sits above the page.

## Files changed
- `src/components/Common/OverflowTabs.tsx`: new one-line tab bar with More.
- `src/config/partnerMailNotification.ts`: new tab id and the two fields.
- `src/pages/partners/components/PartnerMailNotificationTab.tsx`: new tab content.
- `src/pages/partners/PartnerProfile.jsx`: `OverflowTabs`, Mail Notification tab, no tab icons, Update hidden on the tab.
- `src/pages/clients/ClientDetails.tsx`: `OverflowTabs`, no tab icons.
- `assets/css/custom.css`: `.overflow-tabs*`, `.partner-mail-notification__intro`.

## Testing
- Unit: `tests/components/Common/OverflowTabs/computeVisibleTabs.test.ts` (new, 7).
- Integration:
  - `tests/components/Common/OverflowTabs/OverflowTabs.test.tsx` (new, 6; widths mocked since jsdom has no layout);
  - `tests/pages/partners/PartnerProfile.mailNotificationTab.test.tsx` (new, 5);
  - `tests/pages/clients/ClientDetails.tabs.test.tsx` (new, 3).
- CSS: `tests/assets/css/overflowTabs.test.ts` (new, 5).
- `tests/components/Common/OverflowTabs`, `tests/pages/partners`, `tests/pages/clients` and the CSS test: **264 passed** (43 files). `npm run typecheck`: clean.
- E2E: `e2e/sidebar/partners/partner-tabs-overflow.spec.ts` (new, 4) and `e2e/sidebar/clients/client-tabs-overflow.spec.ts` (new, 2) check, at 1280px and 2400px widths:
  - the tabs sit on one line;
  - More lists the rest and opens one;
  - Escape closes More;
  - tabs show a pointer;
  - the Mail Notification fields appear.

## Open items
- **The Mail Notification fields are not saved or used.** There is no fch-api field for them and no Save button. Values typed are lost on leaving the page. Next steps:
  - add the two columns and validation to fch-api (server-side email validation);
  - add a save;
  - decide whether these addresses replace or add to the partner's main email for lead/client notifications (`LeadService`, `DocumentService` and others send to the host's or partner's email today).
- Other pages with long tab bars could use `OverflowTabs` the same way.
