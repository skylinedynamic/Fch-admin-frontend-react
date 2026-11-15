# R3-BUG-016: the status note says who sees it, and starts empty

Date: 2026-11-14

## Problem

Intake & Review › Funding Application › details › Application Status. The "Status Notes" box gave no sign that the borrower sees the note word-for-word in their Activity. It was also pre-filled with the last note, so an old note could be re-sent by accident.

## Solution

- **"Visible to client" switch** under the note, off by default.
  - Off: "Off: only your team sees this note. The client sees the status change only."
  - On: "On: the client sees this note in their application's Activity."
  - The page sends `status_note_visible_to_client` with every status update, both the confirm modal and the Closed (Completed) modal. The API (fch-api, same date) keeps an off note out of the client's Activity and data.
- **The box starts empty.** It is no longer pre-filled from `app.status_note`.
  - The last note is shown above it, read-only, with a "Visible to client" or "Internal" badge.
  - After a save, the box and the switch are cleared.
- **"Status is unchanged"** now means the same status and an empty box.
- **Partner read-only view** shows the saved note directly.
- **Texts** live in `STATUS_NOTE_VISIBILITY_TEXT` (`src/config/borrower.ts`). The switch and the last-note block are in `components/StatusNoteVisibility.tsx`, so the page doesn't grow.

## Files changed

- `src/pages/applications/funding/FundingApplicationDetails.tsx`: no pre-fill, the switch state, the payloads, the reset after save, the last note.
- `src/pages/applications/funding/components/StatusNoteVisibility.tsx` (new): `StatusNoteVisibility`, `LastStatusNote`.
- `src/config/borrower.ts`: `STATUS_NOTE_VISIBILITY_TEXT`.
- `src/modules/application/types.ts`, `services.ts`: `status_note_visible_to_client`.
- `tests/pages/applications/funding/FundingApplicationDetails.statusNoteVisibility.test.tsx` (new, 7):
  - the box starts empty and the last note is shown with its badge
  - an internal badge
  - off by default, with the hint
  - internal unless ticked
  - ticked sends `true`, with the hint
  - a status-only change doesn't resend the last note
  - cleared after a save
- `tests/pages/applications/funding/FundingApplicationDetails.test.tsx`: the character-count test now types the note, since the box starts empty.
- `e2e/sidebar/intake-review/funding-application/funding-application-status-note.spec.ts` (new, 3): the last note and the empty box, an internal note by default, a ticked note.

## Testing

- **Seen failing first:** all 7 new page tests.
- **Full Vitest suite:** 435 files, 3,236 passed (2 expected fail).
- **`npm run typecheck`:** clean.
- **Mock E2E `intake-review/funding-application`:** 25 passed, 3 failed. The 3 new tests passed. The 3 failures fail the same way without this change:
  - R2 BUG-038 funded amount
  - R2 BUG-036 Success Fee
  - the list's status filter

## Open items

- **The 3 older E2E failures** are not part of this bug.
- **Pre-qualification details** still pre-fill their Status Notes. That isn't in this bug.
- **client-fch** needs no change: it shows the Activity the API sends.
