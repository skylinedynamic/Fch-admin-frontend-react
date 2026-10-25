# Task & Reminders — the list says it shows today, and Show all dates is one click (BUG-056)

2026-10-24

## Problem
QA defect log **BUG-056** (OP-REM-05): Task & Reminders "hid" older reminders — the first load said "No reminders found" although reminders existed, page 1 showed only the two just created, and Status = Dismissed found nothing.

The list opens with the Date Range filter set to **today** (`ReminderList.tsx`), and every filter — Dismissed included — applies on top of that date. The API and data were right; nothing on the page said the list was limited to today, so an empty day read as "no reminders". (The page-2 rows QA saw were not reproduced; with the date set, page 2 is empty — most likely the date had been cleared at that point.)

## Solution
Today stays the default (as decided), but the page now says so:
- A line above the table: **"Showing reminders for today."** (or the picked dates) with a **Show all dates** button that drops the date and lists every reminder — older and dismissed ones included. Hidden when no date is set.
- The empty table says **"No reminders for today."** (or the picked dates) instead of "No reminders found"; with no date set it still says "No reminders found".
- `describeDateRange()` in `src/config/reminders.ts` names the range: "today", one date, or "start – end".

## Files changed
- `src/pages/reminders/ReminderList.tsx` — date line with Show all dates; empty message names the dates.
- `src/config/reminders.ts` — `describeDateRange()`.
- `tests/pages/reminders/ReminderList.dateFilter.test.tsx` — new, 3 tests.
- `tests/config/reminders.describeDateRange.test.ts` — new, 4 tests.
- `tests/pages/reminders/Reminders.list.test.tsx` — empty text is now "No reminders for today.".
- `e2e/sidebar/task-reminders/reminders.spec.ts` — empty-state text updated; +1 test (the date line, Show all dates drops `start_date`).

## Testing
- New page tests failed first (no date line; "No reminders found"; no Show all dates), pass after. Full Vitest: 244 files, 1711 passed. `npm run typecheck` clean.
- E2E (mock) `e2e/sidebar/task-reminders`: 24 passed.

## Open items
- Locally the Task & Reminders menu is missing because the reminder permissions were never seeded on this production-copy DB: `php artisan db:seed --class=TaskReminderPermissionSeeder` (fch-api). Check stage/production have them too.
- Mark BUG-056 in the QA defect log back to In Progress, then Fixed after the stage retest; note that the list opens on today by design.
