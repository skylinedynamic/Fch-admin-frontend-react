# R3-BUG-043: Embedded Form Configuration subtitle no longer mentions notifications

2026-11-25

## Problem
Embedded Form › Configuration: the Form Configuration card's subtitle read "Configure the title, notifications, and security for your embedded form". The Notification Email setting had been removed, and the page has only Form Title, Form Status and Allowed Domains. (QA Round 3, R3-BUG-043, Low / P3.)

## Solution
The subtitle now names what the card holds: "Configure the title, status, and allowed domains for your embedded form".

## Files changed
- `src/pages/embed-form/EmbedFormSettings.tsx`: the subtitle.
- `tests/pages/embed-form/EmbedFormSettings.subtitle.test.tsx` (new): the subtitle names the title, status and allowed domains, and nothing on the page says "notification".
- `e2e/sidebar/embedded-form/configuration/configuration.spec.ts`: new mock spec for the same check, scoped to the card, since the topbar has its own notifications bell.

## Testing
- The new Vitest test failed first, then passed. `tests/pages/embed-form`: 11 files, 70 passed.
- `npm run typecheck`: clean.
- Playwright mock, `configuration.spec.ts`: 18 passed (after `npm run build`).

## Open items
- Not retested on admin-stage yet.
