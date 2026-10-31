# File manager: SVG is no longer an allowed upload (BUG-015, round 2)

2026-10-31

## Problem
QA round 2 defect log **BUG-015** (R2-CP-DOC-01, High/P1): an SVG holding a `<script>` was accepted as an upload and ran when opened from `/storage` on the API's domain. SVG was on the file manager's allowed list here too (`src/modules/filemanager/config.ts`), and the API checked no type at all.

## Solution
- The API now checks every upload itself: documents and attachments never SVG or HTML; logos and images may be SVG, stripped of scripts (`fch-api/docs/handoff/2026-10-31-upload-type-allow-list.md`).
- `svg` is removed from `FILE_MANAGER_CONFIG.ALLOWED_EXTENSIONS`, which `CustomFileManager` checks before uploading.

## Files changed
- `src/modules/filemanager/config.ts` — `svg` removed, with the reason.
- `tests/modules/filemanager/config.test.ts` — new: SVG not allowed; PDF/JPG/PNG/DOCX/XLSX still allowed; HTML not.

## Testing
- The SVG case failed first, then passed (2/2).
- Full Vitest suite — 330 files, 2374 passed, 2 expected fail. `npm run typecheck` — clean.

## Open items
- `src/pages/filemanager/config.ts` is an unused copy of the same config (only `pages/filemanager/types` is imported anywhere); it still lists `svg`. Left as is; worth deleting.
