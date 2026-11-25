# R3-BUG-063: Partial upload shows "Files Uploaded Successfully"

2026-11-24

## Problem
File Manager › Upload Files. QA reproduced it from Profile › avatar camera icon › Select Files › Upload (folder `partners/1`), but every File Manager behaves the same.

QA chose a small JPG and a 6 MB JPG together and pressed Upload (2):
- The browser refused the 6 MB picture (toast `File "qa-r3-sec08-6mb.jpg" exceeds 5MB limit.`).
- Only the small file was sent.
- The window still showed the green tick "Files Uploaded Successfully – Your files have been added to the folder." It should have said "1 of 2 files uploaded".

(QA Round 3, R3-BUG-063, Reopened after the 18-Nov retest. It is the admin counterpart of R3-BUG-060 in the client portal.)

Cause: `CustomFileManager.handleUpload` drops a file the browser refuses (size or type) before it reaches the upload queue. The result is counted from the queue alone (`{ uploaded, total: attempted }`), so the refused file never counted and the result was "1 of 1". The BUG-014 fix counted only files the API refuses.

## Solution
- **Counting:** a ref, `refusedBeforeUpload`, counts the files of a batch that the browser refused. The result is `total: attempted + refused`, so the window shows "1 of 2 files uploaded". The count is reset when the batch finishes.
- **Every file refused:** nothing is queued and the count is not kept. The toasts say why, and the next upload starts its count afresh. This was already the behaviour: the window stays on the picker.
- **Bug from R3-BUG-064, fixed here:** `handleUpload`'s `useCallback` had `[]` dependencies, but since R3-BUG-064 it reads `entityType`. It now lists `[entityType]`, so a file manager whose folder changes checks against the current folder.

## Files changed
- `src/components/FileManagerModal/CustomFileManager.tsx`: `refusedBeforeUpload` ref, `total` includes files refused in the browser, `handleUpload` dependencies.
- `tests/components/FileManagerModal/FileManagerModal.uploadResult.test.tsx`: 3 new tests.
  - a file refused for its size counts as not uploaded ("1 of 2");
  - a file refused for its type counts the same way;
  - a refused file does not carry into the next upload's count.
- `e2e/topbar/profile/profile.spec.ts`: new mock spec. Profile › camera › Upload a small JPG with a 6 MB one: shows the toast and "1 of 2 files uploaded", no success message, and one upload request.

## Testing
- New tests written first: the 2 counting tests failed (no "1 of 2"); the carry-over test is a guard and passed before and after. All pass now.
- `tests/components/FileManagerModal` + `tests/modules/filemanager`: 5 files, 28 passed.
- `npm run typecheck`: clean.
- Playwright mock, `profile.spec.ts` + `partner-configuration.spec.ts`: 19 passed, 2 failed. The 2 failures are the pre-existing "Agreement" tab strict-mode failures in `partner-configuration.spec.ts`, which also fail without these changes (see `2026-11-24-r3-bug-064-svg-logo-upload.md`).

## Open items
- Not retested on admin-stage yet.
- The client portal's counterpart, R3-BUG-060, is a separate fix in `client-fch`.
