# Embed code builder in Embed Form Settings; Apply page code in Site Settings

**Date:** 2026-11-08

## Problem
- **Partners could not change the embed code.** Embedded Form > Configuration showed one fixed code box: an 800px iframe with the form's own header, footer, grey page and card. Partners could not fit it to their sites.
- **The website needed the same code.** Our own website's `/apply` page should be set up the same way, by pasting that code; there was nowhere to paste it.

## Solution
- **New "Embed on Your Website" card** (`pages/embed-form/components/EmbedSnippetBuilder.tsx`). It is full width, below the settings, and replaces the old code box in the "Embed & Share" sidebar card.
  - **Look:** switches for the header, the footer and the card frame, and a choice of background (light grey, white or transparent).
  - **Size:** automatic height (adds the API's `embed.js`, recommended) or a fixed height (400–3000px), plus a corner radius slider (0–24px).
  - **Code and copy:** a read-only code box and "Copy Embed HTML".
  - **Live preview** of the form with the chosen options, on a checkered background so a transparent background shows.
  - **The direct link** is not changed by any option.
- **The options** go into the code's link as parameters (`header`, `footer`, `bg`, `frame`), and only those that differ from the defaults are added. Nothing is saved: to change the look, the partner copies the code again.
  - The names, values and bounds are in `src/config/embedFormDisplay.ts`, mirroring fch-api `EmbedFormDisplay` and `EmbedSnippet`.
  - The code is built by `src/utils/embedSnippet.ts`, which escapes attribute values.
- **CMS > Site Settings** has a new "Apply Page Form Code" field (`pages/cms/components/ApplyFormCodeField.tsx`).
  - The code copied from the builder is pasted here for the website's `/apply` page.
  - The API checks it, and a refusal shows under the field, not in a toast.
- **Types:** `EmbedFormConfig` was added to `modules/embed-form/types.ts`, with `embed_script_url`, and `apply_form_embed_code` to `SiteSettingsData`.

## Files changed
- `src/config/embedFormDisplay.ts`: new; option names, values, defaults and bounds.
- `src/utils/embedSnippet.ts`: new; `buildEmbedUrl()` and `buildEmbedSnippet()`.
- `src/pages/embed-form/components/EmbedSnippetBuilder.tsx`: new; the builder card.
- `src/pages/embed-form/EmbedFormSettings.tsx`: renders the builder and drops the old code box from the sidebar.
- `src/modules/embed-form/types.ts`: the `EmbedFormConfig` type.
- `src/pages/cms/components/ApplyFormCodeField.tsx`: new; the paste field.
- `src/pages/cms/SiteSettings.tsx`: renders the field.
- `src/modules/cms/types.ts`: `apply_form_embed_code`.

## Testing
- **New unit tests:** `tests/utils/embedSnippet.test.ts` (9): only changed options are added, the script is added only for automatic height, bounds are kept, values are escaped, and `&amp;` is used in the markup.
- **New integration tests:**
  - `tests/pages/embed-form/components/EmbedSnippetBuilder.test.tsx` (6)
  - `tests/pages/embed-form/EmbedFormSettings.embedBuilder.test.tsx` (3)
  - `tests/pages/cms/SiteSettings.applyFormCode.test.tsx` (3)
- **Updated:** `tests/pages/embed-form/EmbedFormSettings.allowedDomains.test.tsx` (fixture gets `embed_script_url`).
- **E2E:** `e2e/sidebar/embedded-form/configuration/configuration.spec.ts` has a new test for the options, the code, the preview, Copy, and the direct link staying unchanged. All 17 tests pass. They were run against the dev server on :5174 with `--workers=1`, because with parallel workers the dev server's first page loads time out.
- **Checks:** the embed-form, cms and utils Vitest suites pass (76 and 30 tests), and `npm run typecheck` is clean.
- **Full `npx vitest run`:** 2762 passed and 1 failed. The failure is `AgreementBuilder.test.tsx` › "shows the editor only with the blocks it keeps", which timed out after 8.9s under the full parallel load. That file is not touched by this change, and it passes on its own (32/32).
- **Screenshot:** the builder was checked visually with a live preview of the local form.

## Open items
- **Data calls:** `EmbedFormSettings.tsx` still calls `services.ts` directly rather than through query hooks. This was not changed here.
- **Preview:** it stays blank when a partner's Allowed Domains do not include the admin site; the help text says so.
- **Live E2E:** there is no live spec for automatic height on a real partner page. It was checked by hand against the local API, described in fch-api `docs/handoff/2026-11-08-embed-code-display-options.md`.
- Not committed.

## Follow-up (same day): colour-code background
- **Background "Colour code":** shows a colour picker and a text box for `#rrggbb`.
  - A valid code goes into the link without the `#` (`bg=f5f7fa`).
  - An invalid one is marked under the box ("Enter a six-digit colour code…") and left out of the code, so the form keeps its default.
  - `EMBED_BACKGROUND.CUSTOM`, `EMBED_COLOUR_PATTERN` and `DEFAULT_EMBED_BACKGROUND_COLOUR` are in `src/config/embedFormDisplay.ts`.
- **Tests:**
  - `tests/utils/embedSnippet.test.ts`: 2 new tests.
  - `EmbedSnippetBuilder.test.tsx`: 2 new tests.
  - The e2e test "the embed code follows the chosen options…" now also sets a colour code. It passes.
  - The embed-form Vitest suites pass (67 tests), and `npm run typecheck` is clean.

## Follow-up (same day): primary colour, and the admin dropdown for Background
- **Primary colour:** a new switch, "Use my site's primary colour (buttons, steps and links)", with a colour picker and a `#rrggbb` box.
  - When on, a valid code is added as `color=rrggbb`.
  - When off, nothing is added and the form keeps the brand colour. The typed colour is kept, so turning it back on restores it.
- **New shared field:** `ColourCodeField.tsx` (picker plus box, with an inline error) serves both the background and the primary colour.
- **Background** now uses the admin's own `CustomDropdown` instead of a native `<select>`, as the user asked.
  - `CustomDropdown` gains an optional `id` prop on its toggle button, so the "Background" label names it. The change only adds a prop; other uses are unaffected.
- **Config:** `EMBED_PARAM.PRIMARY`, `DEFAULT_EMBED_PRIMARY_COLOUR` and `primaryColor` in `EmbedDisplayOptions`.
- **Tests:**
  - `embedSnippet.test.ts`: 2 new tests.
  - `EmbedSnippetBuilder.test.tsx`: primary colour on and off, an invalid primary colour, the dropdown showing the chosen option, and the background tests now use the dropdown.
  - The e2e test sets the background through the dropdown and adds a primary colour.
- **Results:** Vitest for `tests/pages/embed-form`, `tests/components` and utils passes (400 tests). The e2e spec passes (17), and `npm run typecheck` is clean.

## Follow-up (same day): Site Settings spacing, the embed guide, and the key modal
- **Site Settings spacing.** The cards were pulled up under the page header by `mt-n3` on the form (and on its loading placeholder): the "General Information" card started 4px above the breadcrumb's bottom.
  - `mt-n3` was removed and the row got `g-4`. The gap is now 12px, the same as SEO Settings, and the two columns have the usual gutter.
  - New e2e test: `site-settings.spec.ts` › "the cards sit below the page header with the usual gap". It failed at -4px first and now passes (7/7).
- **"How to add the form to your website" guide** (`EmbedInstructions.tsx`), at the top of Embed on Your Website. It was redesigned after "this design is not good".
  - **Steps:** four numbered step cards (Choose the look, Copy the code, Paste it on your page, Allow your domain).
  - **Where to paste it:** tiles for WordPress, Wix, Squarespace, Webflow, Shopify and any other site.
  - **Tips:** a box with three tips (keep both lines together; copy again after a change or a new key; the direct link is unaffected).
  - **Hide guide / Show guide** collapses it.
  - The design uses 4px radii and the theme's own colours. On a phone everything stacks, with no sideways scroll.
- **Regenerate Public Key** now opens the app's confirmation modal (`RegenerateKeyModal.tsx`) instead of `window.confirm`.
  - It says what stops working: embeds using the current code, and the current direct link, including links already sent.
  - It says what to do next, including the Apply Page Form Code in CMS > Site Settings.
  - The confirm button is a red "Yes, regenerate key".
  - `GlobalModal/ConfirmationModal` gained two optional props, `children` and `confirmClassName` (default `btn-primary`). They only add to it; existing uses are unchanged.
- **Tests:**
  - New: `tests/pages/embed-form/EmbedFormSettings.regenerateKey.test.tsx` (3 tests, using `tests/mocks/fakeBootstrapModal`).
  - Updated: the builder tests (the guide's steps, platforms and tips; hide/show).
  - The two e2e regenerate tests now use the modal and check that no browser dialog appears.
  - Vitest for embed-form, cms and components passes (422 tests), the e2e spec passes (17), and `npm run typecheck` is clean.

## Follow-up (same day): warning box in the key modal; one general paste instruction
- **Regenerate key modal:** what will happen is now in an `alert alert-warning` box (`role="alert"`) with a warning icon, instead of a plain bordered list.
- **Guide:** the per-platform "Where to paste it" tiles (WordPress, Wix and the rest) were removed, as the user asked. One general instruction replaces them: open the page in your website's editor, add an "HTML", "Code" or "Embed" block where the form should appear, paste and publish; on a hand-built site, paste into the page's HTML.
- **Tests:** the builder test now checks the general instruction and that no platform names are shown, and the modal test checks the warning box. Both failed first. Vitest for embed-form and components passes (392 tests), the e2e spec passes (17), and typecheck is clean.

## Cleanup (same day)
- **Removed:** the unused `EmbedFormConfig` type from `modules/embed-form/types.ts`, so the file is back to its original contents. `isColourCode` is no longer exported.
- **Fixtures:** `embed_snippet` was removed from the test and e2e fixtures, because the API no longer sends it.
- **Results:** Vitest for embed-form, cms, components, utils and the embed-form module passes (448 tests), the e2e specs pass (24), and typecheck is clean.
