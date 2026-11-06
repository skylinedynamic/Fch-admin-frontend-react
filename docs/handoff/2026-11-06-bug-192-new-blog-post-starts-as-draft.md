# BUG-192: a new blog post starts as a draft

**Date:** 2026-11-06

## Problem
On CMS → Blogs → Add Post (`/cms/blogs/create`):
- Publish Status was on ("Published") when the form opened.
- The action button said "Publish" even after switching to Draft.

A half-written post went live on the public website if the author forgot the switch. Decision D7: new posts default to Draft, and the button reads "Save Draft" when Draft is chosen.

## Solution
In `src/pages/cms/BlogEdit.tsx`:
- **Default:** a new post starts with `is_published: false`. Editing a post still loads its saved status.
- **Button:** on a new post it reads "Publish" when Published is chosen and "Save Draft" when Draft is chosen. On edit it still reads "Update".
- **Label:** the "Publish Status" label is now tied to its switch (`htmlFor="isPublishedSwitch"`), so the switch has an accessible name.

The API needed no change. `BlogController::store` already saves a post sent without `is_published` as a draft, and `CmsBlogAdminApiTest::a_blog_post_is_written_published_and_deleted` covers that. The `blogs.is_published` column still defaults to `true`, but the controller always sets the value.

## Files changed
- `src/pages/cms/BlogEdit.tsx`: Draft default, button text, label `htmlFor`.
- `tests/pages/cms/BlogEdit.save.test.tsx`:
  - 4 new tests: opens as Draft with "Save Draft"; the button follows the switch; an untouched save sends a draft; publishing sends published.
  - The existing save helper now clicks "Save Draft".
- `e2e/sidebar/cms/blogs/blog-new-post-draft.live.spec.ts` (new): against the real API, checks the Draft default and the button following the switch, then saves an untouched post. It reads the post back as `is_published: false` with no `published_at`, then deletes it.

## Testing
- **Vitest** `tests/pages/cms/`:
  - The new tests failed before the fix: no "Save Draft" button, and the switch had no name.
  - After the fix: 31/31 passed.
- **Live spec:** failed on the old code (the switch was checked) and passed after. With the other live and mock blog specs: `e2e/sidebar/cms/blogs/` live 5/5, mock 21/21.
- `npm run typecheck`: clean.
- **DB check:** the post the live run created was stored as a draft and is now soft-deleted, as the list's own delete does.

## Open items
- Not committed.
