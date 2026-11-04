# File manager: 5 MB pictures, 20 MB other files, refusals say why (BUG-014, round 2)

2026-11-01

## Problem
QA round 2 **BUG-014**. Profile, avatar camera, Upload accepted `qa-12mb.png`, a 12 MB file that was the PNG signature followed by zeros. It could then be set as the profile picture, although the form says "Maximum size: 1 MB".

The file manager capped every file at 20 MB, with no lower cap for pictures. When an upload failed it only said "Failed to upload file", and a refused profile picture only said "Something went wrong". The API now refuses these files (see `fch-api/docs/handoff/2026-11-01-upload-size-limits-and-profile-picture.md`).

## Solution
- `FILE_MANAGER_CONFIG` gains `MAX_PICTURE_SIZE` (5 MB) and `PICTURE_EXTENSIONS`. `maxUploadSizeFor(fileName)` gives 5 MB for a picture and 20 MB for anything else. `CustomFileManager` refuses a larger file before sending it ("File "x" exceeds 5MB limit.").
- `useFileManager.handleUploadFile` shows the API's reason, using the new `apiErrorMessage()` in `src/utils/formUtils.ts`. A 413 from Nginx shows "This file is too large to upload."
- `Profile.tsx` shows the API's reason when a picked picture is refused.
- The partner and employee picture notes and checks now say 5 MB instead of 1 MB, using `FILE_MANAGER_CONFIG.MAX_PICTURE_SIZE`. This covers `PersonalInfoSection.jsx`, `EmployeeDetails.jsx`, `PartnerInformationSection.jsx` and `PartnerProfile.jsx`.

## Files changed
- `src/modules/filemanager/config.ts`: picture limit, `maxUploadSizeFor`.
- `src/components/FileManagerModal/CustomFileManager.tsx`: per-file limit.
- `src/components/FileManagerModal/useFileManager.ts`: the API's reason, and the 413 message.
- `src/utils/formUtils.ts`: `apiErrorMessage()`.
- `src/pages/auth-profile/Profile.tsx`: the API's reason for a refused picture.
- `src/pages/employees/components/form-sections/PersonalInfoSection.jsx` and `src/pages/partners/components/PartnerInformationSection.jsx`: the note now says 5 MB.
- `src/pages/employees/EmployeeDetails.jsx` and `src/pages/partners/PartnerProfile.jsx`: the size check is now 5 MB.
- Tests:
  - `tests/modules/filemanager/config.test.ts`: limits.
  - `tests/components/FileManagerModal/useFileManager.upload.test.ts`: new (422 reason, 413, other failures).
  - `tests/pages/auth-profile/Profile.test.tsx`: refused picture shows the API's reason. The file manager is mocked here and only hands back the picked path.
  - `tests/pages/employees/components/form-sections/PictureLimit.test.tsx`: new, both notes.
  - `tests/pages/employees/EmployeeDetails.picture.test.tsx`: new, 3 MB is taken and over 5 MB is refused.
- `e2e/topbar/profile/profile-picture-upload-limits.live.spec.ts`: new, live. QA's 12 MB fake PNG is refused before it is sent, and a 50 KB fake PNG is refused by the API with "This file is not a valid image." Writes nothing.

## Testing
- New tests failed first (no helper, generic messages, 1 MB), then passed.
- Full Vitest: 334 files, 2392 passed (2 expected fail). `npm run typecheck` is clean.
- Playwright live: the new spec passed (2/2 with setup).

## Open items
- `src/pages/filemanager/config.ts` is an older copy of the file manager config, still with `svg`. Nothing imports it, so it could be deleted.
- A 413 from Nginx carries no CORS headers, so the browser may report a network error instead of 413. The portal's own size check stops such files first.
