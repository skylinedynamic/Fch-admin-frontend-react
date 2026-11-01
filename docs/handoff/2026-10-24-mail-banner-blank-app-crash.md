# Mail-not-verified banner no longer blanks the whole app

2026-10-24

## Problem
For any user holding `update email configuration settings`, the admin panel rendered a **blank page** — no layout, no message — whenever `GET /common/mail-configurations` answered without a `fallback` object (an empty or unexpected reply, an older API). `MailNotVerifiedBanner` (in the layout, on every page) read `data.data.fallback.from_address` and threw `TypeError: Cannot read properties of undefined (reading 'from_address')`; there is no error boundary, so React unmounted everything.

It showed up as ~259 E2E failures (`sidebar/menu/persona-access`, `sidebar/settings`, `topbar/contacts`): 30 s timeouts waiting for `#layout-wrapper`, because those specs do not mock that call and the default mock answers `data: []`. It was first taken for machine load; a single test on one worker still failed, and the browser console showed the TypeError. Logged as E2E-014 in `docs/e2e/ISSUES.md`.

## Solution
The banner shows only when the reply says `uses_own_configuration: false` **and** carries `fallback`; anything else hides it — a malformed reply is no evidence that mail is unverified, and must never take the page down.

## Files changed
- `src/components/Layout/MailNotVerifiedBanner.tsx` — guards the reply's shape; hides the banner when it is not the expected one.
- `tests/components/Layout/MailNotVerifiedBanner.test.tsx` — +3 tests: an empty list, no `fallback`, `data: null` → no banner, page still renders.
- `docs/e2e/ISSUES.md` — E2E-014.

## Testing
- The 3 new tests failed first with the same `TypeError`, pass after: 7/7 in the file.
- `npm run typecheck` clean.
- E2E rerun of the previously failing specs: see the session report.

## Open items
- An error boundary around the layout's optional widgets (banners, bell, reminders) so one bad reply can never blank the app again.
