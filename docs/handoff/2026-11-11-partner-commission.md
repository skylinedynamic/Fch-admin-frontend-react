# Partner profile › Commissions tab

**Date:** 2026-11-11

## Problem
The host had no place to set a partner's commission. When a partner client's funding application was closed, the success-fee split (Closed (Completed) modal) always opened at Admin 100% / Partner 0%.

## Solution
- **New Commissions tab** on Partner profile (`/partners/:id`).
  - Shown only when all of these are true: the profile is an existing partner, the viewer is on the host's team, the partner is not the host, and the viewer has `view commission`.
  - The tab sets the partner's share (%) of the success fee and shows the default split it gives (Partner X% / Admin 100−X%), with a worked example.
  - The tab saves itself through `PUT /admin/partners/{id}/commission`. The page's general Update button is hidden on it.
  - Without `update commission` the rate is shown read-only.
  - Values outside 0–99 are refused before any request is sent. API errors on the field are shown under it.
- **Design (final, chosen by the user from six rendered options: "E · Donut"):** `assets/css/partner-commission.css`.
  - **Left:** "Partner commission" with a status pill ("Current: X%", "Unsaved changes" or "Not set"), a one-line description, the standard Partner Commission (%) field (`form-label` / `input-group material-shadow` / `form-control` / `input-group-text`) and its help text. A "View only" line shows without `update commission`.
  - **Right** (light panel): a donut of the split (CSS `conic-gradient`, partner share in the brand colour, % in the centre) and a legend. "On a $10,000 success fee" (`PARTNER_COMMISSION_EXAMPLE_FEE`) is followed by Partner and Admin rows, each with % and $. It updates as you type.
  - **Save** is the page header's top-right **Save Commission** button. It submits the tab's form (`PARTNER_COMMISSION_FORM_ID`), is disabled until the rate changes, shows a spinner while saving, and is hidden without `update commission`.
  - Layout follows the tab's own width: the form is the container and `.pcm__card` the grid. Below 680px the panels stack, and below 420px the legend drops under the donut. Checked at 1600px, 1920px and 390px.
  - The earlier designs (revenue-share blocks, settings list, slider, hero banner, payout breakdown) were reviewed and not used.
- **Activity:** each save that changes the rate adds an entry to the partner's Activity sidebar: "Commission added", "Commission updated" or "Commission removed".
  - The entry has its own percent icon (`LOG_TYPE_PARTNER_COMMISSION_UPDATE`, `activityIconConfig.ts`).
  - Its "View changes" table shows Commission old → new.
  - A successful save fires `REFRESH_ACTIVITIES_EVENT` (in `useUpdatePartnerCommission`), so the entry appears straight away.
- **Commission split** (`FundedAmountModal`) has a new prop, `defaultPartnerCommissionRate`. On a partner client with no saved split, the rates open at that partner's rate once a success fee is typed. A saved split still wins, and host clients still have no split.
- `FundingApplicationDetails` passes the API's new `partner_default_commission` field to the modal.
- Data layer: `updatePartnerCommission` (service), `useUpdatePartnerCommission` (query, invalidates the partner detail), and `PartnerCommissionPayload`/`PartnerCommissionResponse` (types).
- Constants live in `src/config/partnerCommission.ts`: the tab id, both permissions, the 0–99 range and the range error message.

## Files changed
- `src/config/partnerCommission.ts`: new constants.
- `src/modules/partner/{services,queries,types}.ts`: commission endpoint, mutation hook and types.
- `src/pages/partners/components/PartnerCommissionTab.tsx`: the new tab.
- `assets/css/partner-commission.css`: the tab's styles.
- `src/pages/partners/PartnerProfile.jsx`: tab link, rendering, `canViewCommission`, generic Save hidden on the tab.
- `src/components/Common/Modals/FundedAmountModal.tsx`: `defaultPartnerCommissionRate`.
- `src/pages/applications/funding/FundingApplicationDetails.tsx`: passes `partner_default_commission`.
- `src/modules/application/types.ts`: `partner_default_commission`.
- `src/config/appConfig.ts`: `LOG_TYPE_PARTNER_COMMISSION_UPDATE`.
- `src/utils/activityIconConfig.ts`, `src/components/Common/Activity/ActivitySidebar.jsx`: percent icon for the commission entry.

## Testing
- New: `tests/pages/partners/PartnerProfile.commissionsTab.test.tsx`. 12 tests: shows the rate and split, Save in the page header and enabled only once the rate changes, the split amounts on a $10,000 fee, the activity refresh, the "Not set" state, saves, clears, range check, API error, read-only, hidden without permission, hidden on the host.
- The commissions tab test also checks that the activity sidebar is told to reload after a save.
- New: `tests/components/Common/Activity/ActivitySidebar.partnerCommission.test.tsx` (2 tests: an updated and an added entry, with icon and changes table). `tests/utils/activityIconConfig.test.ts`: +1.
- `tests/components/Common/Modals/FundedAmountModal.test.tsx`: +3 tests (opens at the partner's rate, a saved split wins, host client ignores the rate).
- `tests/pages/applications/funding/FundingApplicationDetails.test.tsx`: +1 test (the page passes the rate, and save-commission is sent with 70/30). It fails with the page change reverted.
- Full Vitest run: 398 files, 3004 passed. `npm run typecheck` is clean.
- E2E, mocked: new `e2e/sidebar/partners/partner-commissions.spec.ts` (4 tests) passes, as does `partner-save-stays-on-tab.spec.ts`.
- E2E, live: new `e2e/sidebar/partners/partner-commissions-save.live.spec.ts` passes against the local API, including the activity entry appearing without a reload. It restores the original value afterwards.
- `partner-configuration.spec.ts` has 2 failures that this change did not cause (E2E-025).
- `partner-profile.spec.ts` doesn't load locally because `VITE_WEBSITE_URL` is not set.

## Open items
- E2E-025: two tabs named "Agreement" on a partner profile break 2 Configuration specs.
- API side: `fch-api/docs/handoff/2026-11-11-partner-commission.md`.
