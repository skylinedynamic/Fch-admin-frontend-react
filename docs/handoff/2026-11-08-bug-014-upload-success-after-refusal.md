# BUG-014 retest: no "uploaded successfully" after a refused file

2026-11-08

## Problem
BUG-014 was retested on 08-Nov-26 in Host > My Profile > picture > Select Files > Upload. A fake PNG (a PNG header followed by zeros, 200 KB) was refused by the API, and the toast correctly said "This file is not a valid image." But the same upload window also said "Files Uploaded Successfully – Your files have been added to the folder."

The cause was in `useFileManager.handleUploadFile`, which caught the refusal and showed the toast but resolved as if the upload had worked. The upload window (`CustomFileManager.processUploadQueue`) could not tell, so it always set `uploadComplete` and showed the success screen.

## Solution
- **`handleUploadFile` reports the outcome.** It now resolves `true` when the API took the file and `false` when the API refused it (the reason is still shown as a toast).
- **The upload window counts what went in:**
  - If no file was added, there is no success screen. The window goes back to the picker, with the refused file still listed.
  - If some files were refused, the window says "N of M files uploaded" and "The others were not added; the reason is shown in the message."
  - Only when every file was added does it say "Files Uploaded Successfully".
- **The file list stays current.** The list used to refresh after the last file only. If that last file was refused, the window now refreshes the list itself.

## Files changed
- `src/components/FileManagerModal/useFileManager.ts`: `handleUploadFile` returns `Promise<boolean>`.
- `src/components/FileManagerModal/CustomFileManager.tsx`:
  - `onUploadFile` now resolves to a boolean.
  - The upload loop counts the files that went in and keeps the result.
  - No success screen when nothing was added.
  - The list is refreshed when the last file was refused.
- `src/components/FileManagerModal/Modals.tsx`:
  - New `UploadResult` type.
  - `UploadModal` shows "N of M files uploaded" for a partial upload.

## Testing
- **Unit:** `tests/components/FileManagerModal/useFileManager.upload.test.ts`, 2 new tests: a refused file reports false, an accepted one true.
- **Integration:** new `tests/components/FileManagerModal/FileManagerModal.uploadResult.test.tsx`. It renders the real FileManagerModal with MSW and covers three cases: the only file refused (reason shown, no success text, back to the picker), every file added (success), and a partial upload ("1 of 2 files uploaded").
- Both test files failed first and pass now (8/8). `npm run typecheck` is clean.
- **E2E:** `e2e/topbar/profile/profile-picture-upload-limits.live.spec.ts` now also checks that no success text appears after the fake PNG is refused, and that the picker is back. It passes against the local API.

## Open items
- **Defect Log:** not updated. BUG-014 needs QA to retest it.
- **Not retested:** setting a real PNG as the profile picture, and the 12 MB file (the browser tool caps files at 10 MB). Neither was touched here.
