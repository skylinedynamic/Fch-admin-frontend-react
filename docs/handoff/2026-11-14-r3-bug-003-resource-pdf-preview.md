# R3-BUG-003: Resources PDF preview reads the file through the API

**Date:** 2026-11-14
**Author:** Awlad Hossain

## Problem

Resources (`/resources`, the library that the host and partners both use) › click a PDF resource such as "EIN Overview". The "Resource Hub Preview" window was blank, with the browser's broken-page icon.

Resource files became private, so `file_url` is a signed link:
`https://api…/private-files/resources/ein.pdf?expires=…&signature=…`

1. **Blank preview.** The preview framed that link. The API sends `X-Frame-Options: SAMEORIGIN` and `frame-ancestors 'self'`, so the browser refused to show it inside the portal.
2. **Wrong download name.** The Download button named the file with the "extension" after the last dot of the link, so it saved as `EIN Overview.pdf?expires=…&signature=…`.

## Solution

- **Preview.** It reads the file through the API (`GET /common/resources/download/{id}`, the same access check as Download: everything for the host's team, published partner resources for partners). It then shows the file from a local `blob:` link, released when the window closes.
  - This avoids the frame headers and the link's expiry.
  - The API's security headers stay as they are.
- **Non-PDF files** show "Preview Not Available" and are offered for download. They used to be framed as well.
- **Read failure.** If the file can't be read, the window says "The preview could not be loaded."
- **Download name.** The extension comes from the link's path, through a new `fileExtension()`.
- **Video links.** These still open in the same window as before.

## Files changed

- `src/config/fileTypeConfig.ts`: `fileExtension()` and `PDF_EXTENSION`.
- `src/modules/resource/services.ts`: `fetchResourceFile()` reads the file as a Blob and rejects a JSON error.
- `src/modules/resource/queries.ts`: `resourceKeys.file`, `useResourceFile()`.
- `src/pages/resources/components/ResourceFilePreview.tsx` (new): reads the file, shows the PDF from a `blob:` link, and shows the loading, error and non-PDF states.
- `src/pages/resources/Resource.tsx`:
  - a file uses `ResourceFilePreview`, and a link keeps its iframe
  - the download extension uses `fileExtension()`
- Tests:
  - `tests/config/fileTypeConfig.test.ts` (new, 8)
  - `tests/modules/resource/services.test.ts` (+2)
  - `tests/pages/resources/Resource.test.tsx` (new, 4): the host and a partner see a signed PDF as a `blob:` preview read through the API; a failed read says so; Download saves as "EIN Checklist.pdf"
  - `e2e/sidebar/resources/resources-page.spec.ts`:
    - +2: "Resources page - file preview" for the host and a partner
    - "a resource with a file opens the preview, with a Download button" now looks for the Download **button**, because the preview's note also says "Click Download…"

## Testing

- **Seen failing first:**
  - the 8 `fileExtension` tests
  - the 2 service tests
  - the 4 page tests
  - the 2 new E2E tests, on a build of the old `Resource.tsx`
- **After the change:**
  - `tests/config`, `tests/modules/resource`, `tests/pages/resources`: 37 passed
  - `npm run typecheck`: clean
  - Mock E2E `resources-page.spec.ts` + `resources.spec.ts`: 46 passed

## Open items

- **Deploy together:** deploy together with the client portal change of the same date. fch-api needs no change.
- **Manage Resources:** "View File" still opens the signed link in a new tab. That works, because a tab is not a frame, but the link expires after 60 minutes if the list stays open.
