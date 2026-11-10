# Column filter popup uses the theme primary colour

**Date:** 2026-11-06

## Problem
A table's column filter popup (match mode dropdown, value input, **Clear** / **Apply**) used a PrimeReact theme colour, not the app's theme. Here it was indigo `#6366F1` (from `lara-light-indigo`, imported by `pages/cms/SiteSettings.tsx` and `pages/resources/ResourceForm.tsx`, whose `.p-button` rules then apply app-wide), while the theme primary (`--vz-primary`, from tenant branding) is navy `#001F3F`. The user asked for it to follow the theme primary on every table at once, in both the admin and client portals.

## Solution
A global block in `assets/css/custom-datatable.css` (loaded on every page from `index.html`), scoped to `.p-column-filter-overlay`:
- Apply: filled with `var(--vz-primary)`, text `var(--brand-on-primary, #fff)`.
- Clear (`.p-button-outlined`): transparent, with `--vz-primary` text and border. On hover it gets a faint `rgba(var(--vz-primary-rgb), .08)` background.
- Small buttons: 4px radius, 0.8125rem text, weight 500 and `0.35rem 0.85rem` padding (about 30px tall). The overlay has 8px radius and a soft shadow.
- The match-mode dropdown and the value input share one size: full width and 36px tall. Before, the dropdown was 135px against a 368px input.
- No focus or hover styling on those two fields: the border keeps its colour (`--vz-input-border-custom`, falling back to `#ced4da`), with no ring. The buttons have no focus ring either.
- These sizing and focus rules were the user's follow-up, the same day.

The selectors are more specific than the PrimeReact theme rules, so the result does not depend on CSS load order. Because the colour comes from `--vz-primary`, a tenant's branding colour carries through. The same block is in both the admin and client portals.

## Files changed
- `assets/css/custom-datatable.css`: the popup block.
- `e2e/sidebar/payments/column-filter-popup.live.spec.ts` (new). Red first: Apply was `rgb(99, 102, 241)`, expected `rgb(0, 31, 63)`. Now green. Run with `E2E_BASE_URL=http://localhost:5174 npx playwright test --project=live`.

## Testing
- E2E as above. It checks:
  - Apply's background, and Clear's text and border, equal the computed `--vz-primary`, and Clear's background is transparent;
  - the match-mode dropdown and the value input have the same width and height;
  - the Apply button is at most 32px tall;
  - focusing the value input leaves its border colour unchanged and adds no box-shadow.
- The follow-up checks were red first (dropdown 135 vs input 368; button 34px), then green.
- The first version of these checks used `.p-dropdown` / `.p-inputtext`. That also matched PrimeReact's hidden operator dropdown (0×0), so it passed falsely; it now targets `.p-column-filter-matchmode-dropdown` and `input.p-column-filter`.
- Checked visually on the Payments popup in both portals (local dev).

## Open items
- `lara-light-indigo` is imported by two pages and restyles every PrimeReact component in the app (buttons and inputs elsewhere too), not only this popup. Removing those imports would change those two pages, so it was not done here.
- Only the colours and shape were changed. The popup's labels ("Contains", "Clear", "Apply") and layout come from PrimeReact and are unchanged.
