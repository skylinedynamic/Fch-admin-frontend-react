# R3-BUG-064: An SVG logo can't be uploaded from the Branding logo picker

2026-11-24

## Problem
Partners › partner 89 › Configuration › Branding › Logos › Choose › Upload › an `.svg` file. The page showed the toast `File type "svg" not allowed for "qa-r3rt-ui-logo.svg".` and sent nothing, even though the Branding hint says a logo may be "PNG, JPG, SVG or WebP". (QA Round 3, R3-BUG-064, Reopened. The 18-Nov retest marked it "Partially Fixed".)

The API side was already fixed. `POST filemanager/upload` into a public folder such as `partners/89` takes an SVG and strips its scripts (`UploadFileRequest` → `SafeUpload::image()` → `SvgSanitizer`). A private (documents) folder still refuses SVG with a 422.

Cause: the file manager's browser check used one list for every folder, `FILE_MANAGER_CONFIG.ALLOWED_EXTENSIONS`. That list leaves out SVG on purpose (BUG-015: documents), so a logo was refused before the request was ever sent.

## Solution
Decision 2026-11-24: allow SVG logos, following the API's rule, rather than dropping SVG from the Branding hint.
- **`src/modules/filemanager/config.ts`:**
  - New `PRIVATE_FILE_MANAGER_FOLDERS`, a copy of fch-api `config/files.php` `private_folders`.
  - New `allowedExtensionsFor(folder)`: the usual types, plus `svg` when the folder is public. A private folder, or no folder at all, gets no SVG.
  - `ALLOWED_EXTENSIONS` itself is unchanged and still has no SVG.
- **`CustomFileManager`:** takes the folder it opens (`entityType`) and checks each file against `allowedExtensionsFor(entityType)`. `FileManagerModal` passes `entityType` down.
- **Result:** a logo or branding upload (`partners`, `site-settings`, `blogs`, …) accepts SVG. Documents (`partner-documents`, `borrowers`, `resources`, …) still refuse it in the browser and in the API.

## Files changed
- `src/modules/filemanager/config.ts`: `PRIVATE_FILE_MANAGER_FOLDERS`, `allowedExtensionsFor()`.
- `src/components/FileManagerModal/CustomFileManager.tsx`: new `entityType` prop; the extension check is per folder.
- `src/components/FileManagerModal/FileManagerModal.tsx`: passes `entityType` to `CustomFileManager`.
- `tests/modules/filemanager/config.test.ts`: 4 new unit tests.
  - SVG is allowed into a public folder;
  - refused into private folders;
  - refused when the folder is unknown;
  - the usual types are allowed everywhere and HTML never is.
- `tests/components/FileManagerModal/FileManagerModal.svgLogo.test.tsx` (new): 2 integration tests.
  - an SVG uploads into `partners`;
  - an SVG into `partner-documents` gets the toast and is not sent.
- `e2e/sidebar/partners/partner-configuration.spec.ts`: new mock spec. Branding › Choose › Upload an SVG sends `POST filemanager/upload`.

## Testing
- New tests written first: 4 unit tests and 1 of 2 integration tests failed before the change. All pass now.
- Every Vitest file that touches the file manager or Branding: 17 files, 147 passed.
- `npm run typecheck`: clean.
- Playwright mock, the new SVG logo spec: passed.
- `partner-configuration.spec.ts` has 2 specs that **fail before and after** this change (checked with the change stashed): "a host with the permission sees the tab…" and "the partner's borrower agreement is switched…". In both, `getByRole('tab', { name: 'Agreement' })` matches 2 tabs (strict mode). Not caused by this change, and not fixed here.

## Open items
- `PRIVATE_FILE_MANAGER_FOLDERS` must stay in step with fch-api `config/files.php` `private_folders`. If a folder is added there without being added here, the browser would let an SVG through and the API would refuse it with a 422, which is safe but confusing.
- QA left two test files in `partners/89`: `qa-r3rt-logo-plain_1794976581.svg` and `qa-r3rt-script_1794976581.svg`.
- The 2 pre-existing "Agreement" tab spec failures above.
- Not retested on admin-stage yet.
