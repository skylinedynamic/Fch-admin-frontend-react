# Embed preview note after the frame-ancestors fix

2026-11-08

## Problem
Embed Form Settings > Embed on Your Website warned: "If your Allowed Domains do not include this admin site, the preview stays blank". On stage the preview did go blank ("skylinedynamic.dev refused to connect") once Allowed Domains was set.

## Solution
fch-api now always lets the partner's own admin panel frame its form (see fch-api `docs/handoff/2026-11-08-embed-preview-frame-ancestors.md`):
- `BASE_PARTNER_PORTAL` for the host partner
- `partner_domain`/`partner_subdomain` for any other partner

The note under the preview now says: "The preview always works here; on other sites only your Allowed Domains can show the form."

## Files changed
- `src/pages/embed-form/components/EmbedSnippetBuilder.tsx`: the preview note.
- `tests/pages/embed-form/components/EmbedSnippetBuilder.test.tsx`: a test for the new note (red first).

## Testing
- `tests/pages/embed-form`: 7 files, 49 tests passed.
- `npm run typecheck`: clean.
- No e2e spec asserted the old note.

## Open items
- **Deploy order:** deploy together with the fch-api change. Without it, the note is wrong again.
- **Not deployed:** not committed or pushed yet.
