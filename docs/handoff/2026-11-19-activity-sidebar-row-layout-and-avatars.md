# Activity sidebar: two-line rows, email and event details, avatar of who acted

**Date:** 2026-11-19
**Branch:** hotfix

## Problem
In the activity sidebar on the client, partner and lead pages:
- **Email row too long:** a sent email's row read "To: x@y • Subject: … • time".
- **Event row date:** an event's row showed the event's date, not when the entry was created.
- **Badges on extra lines:** the title, reminder status (Dismissed…) and visibility badge (Private…) wrapped onto extra lines.
- **Big buttons:** Edit/Delete were too big.
- **Wrong avatar:** on a partner's activity, every entry showed that partner's image, including the host's own entries. The avatar used `partner_image`/`borrower_image`, which is the record's image and the same on every entry.

## Solution
- **Row layout:**
  - line 1 is the title alone, on one line with an ellipsis;
  - line 2 is "by {name} • {time}" plus the visibility badge, on one line;
  - the reminder status moves into the body ("Reminder: Dismissed");
  - smaller badge text;
  - Edit/Delete shrink from 28px to 22px, with 4px corners.
- **Email and event entries:**
  - The row shows only who created the entry and its created time.
  - Opening the row shows the details (new `ActivityEntryDetails.tsx`), above the message or description:
    - email: To, Subject;
    - event: Type, Date (the event's own date), Assigned to, To.
- **Avatar:** an entry with a causer shows `causer_image`, the image of whoever acted: the host's logo for its admins, the partner's logo for its login, a staff member's photo. A System entry still shows the record's image. Lead entries and email/event/document-style entries keep their own icons as before.

## Files changed
- `src/components/Common/Activity/ActivityEntryDetails.tsx` (new): `entryDetails()`, `isEmailEntry()`, `isEventEntry()`, and the details list.
- `src/components/Common/Activity/ActivitySidebar.jsx`:
  - two-line header;
  - email/event subtitle uses `created_at`;
  - details and reminder status in the body;
  - causer avatar first;
  - smaller action buttons and badges.
- `assets/css/custom.css`: `.activity-entry-details*`, `.activity-entry-text`, `.activity-entry-title`, `.activity-entry-meta`.

## Testing
- **Unit:** `tests/components/Common/Activity/ActivityEntryDetails.test.ts` (new, 4).
- **Integration:**
  - `ActivitySidebar.emailAndEventDetails.test.tsx` (new, 4);
  - `ActivitySidebar.avatar.test.tsx` (new, 2);
  - `ActivitySidebar.twoLineRow.test.tsx` (new, 1);
  - `ActivitySidebar.summaryAndDate.test.tsx`, updated: the row shows the created time, and the event date is in the body.
- **CSS:** `tests/assets/css/activityEntryDetails.test.ts` (new, 3).
- **Vitest:** the activity suites and the CSS test pass, 29 tests. `npm run typecheck` is clean.
- **E2E:** `e2e/sidebar/clients/activity-email-event-details.spec.ts` (new, 4) covers the email and event rows and bodies, the avatar of who acted, the one-line meta, the reminder status in the body, and the small Edit button.
  - With the other activity specs (task-assign, visibility, lead-activity-xss, partner-configuration), 28 passed.

## Open items
- None.
