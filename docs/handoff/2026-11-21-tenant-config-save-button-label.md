# Partner Tenant Config: header button renamed to "Save Tenant Configuration"

2026-11-21

## Problem
On Partner profile › Tenant Config (`/partners/:id?tab=tenantConfig`), the page-header button that saves the tab was labelled **Update**. That is the same label as the partner details save button, and it didn't say what it saves. The other tabs name theirs (Save Mail Notification, Save Commission, Save Configuration).

## Solution
The button now reads **Save Tenant Configuration**, and **Saving...** while the save is in progress (it said "Updating..." before). It still submits `tenant-config-form`, and it still shows only with `update partners`.

## Files changed
- `src/pages/partners/PartnerProfile.jsx`: the Tenant Config header button's label and saving text.
- `e2e/sidebar/partners/partner-profile.spec.ts`: Tenant Config tests renamed; the save test also checks the label.
- `tests/pages/partners/PartnerProfile.tenantConfigTab.test.tsx` (new): the header button is named Save Tenant Configuration, targets `tenant-config-form`, and no Update button is shown.

## Testing
- New Vitest test: failed before the change and passes after it.
- `tests/pages/partners`: 24 files, 158 tests passed. `npm run typecheck` is clean.
- Playwright `partner-profile.spec.ts`, Tenant Config group (mock project, after `npm run build`): 8/8 passed.

## Open items
None.
