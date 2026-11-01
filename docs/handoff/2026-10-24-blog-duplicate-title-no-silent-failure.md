# CMS Blogs — duplicate title no longer fails silently (BUG-045)

2026-10-24

## Problem
QA defect log **BUG-045**: CMS › Blogs › Create with the title of an existing post → Publish did nothing visible. The API answered 422 on `slug`; `BlogEdit.tsx` stored field errors but only shows them under title, summary, content, meta, category, tags and image — there is no slug field — and it skips the toast whenever a reply has field errors. So the error was swallowed.

## Solution
- A **new post is sent without a slug**; the API makes a unique one from the title (`title-2`, …) — see fch-api `docs/handoff/2026-10-24-blog-duplicate-title-unique-slug.md`. The slug in the form is now only the SEO preview. Editing still sends the post's existing slug (its address does not change).
- **No silent failures**: a `slug` error is shown under **Post Title** ("Another post already uses this title's web address. Change the title a little."); any error on a field the form does not show is toasted. Errors are read as a list per field (Laravel) or a single message (BaseApiRequest).

## Files changed
- `src/pages/cms/BlogEdit.tsx` — no slug on create; slug error under the title; unshown field errors toasted; both error shapes read.
- `tests/pages/cms/BlogEdit.save.test.tsx` — new, 3 tests (CKEditor stood in by a textarea).
- `e2e/sidebar/cms/blogs/blogs.spec.ts` — +3 tests.

## Testing
- New Vitest tests failed first (slug sent; nothing shown; no toast), pass after. `tests/pages/cms`: 8 passed. `npm run typecheck` clean.
- E2E `blogs.spec.ts` (mock): 21 passed.

## Open items
- Mark BUG-045 in the QA defect log back to In Progress, then Fixed after the stage retest.
