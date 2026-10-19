# "Cannot Be Deleted" modal for leads, clients, partners, lenders and funding sequences

**Date:** 2026-10-19
**Branch:** `fix/client-delete-paid-invoice-message` (from `release`) - same branch name in `fch-backend-api`
**Author:** arafat-invento

## Summary
Five list pages now share one delete flow: Delete Selected first asks the API whether the selection can be deleted; if any record is still in use, a "... Cannot Be Deleted" modal opens instead of "Are you sure?" and nothing is deleted; otherwise the confirmation shows and the whole selection is deleted in **one** call (all or none). A 422 from the delete opens the same modal, not an error toast. The rules themselves live in the API (see its handoff, same date and branch).

| Page | Blocked when | Modal buttons |
|---|---|---|
| Leads | converted | cross, Close |
| Clients | a paid invoice | cross, Close, Go to Client (`update clients`) |
| Partners | a paid invoice, or clients/users under it | cross, Close, Go to Partner (`update partners`) |
| Lenders | assigned to a funding request, or in a live funding sequence | cross, Close, Go to Lender (`update lenders`) |
| Funding sequences | used by a funding request | cross, Close, Go to Funding Sequence (always - the page has no edit permission) |

**Modal design** (`src/components/Common/Modals/DeleteBlockedModal.tsx`, shared by all five): the cross sits in the top-right corner; 80px warning icon in a soft circle; bold title; message capped at 360px with balanced line breaks; buttons 140px minimum and the same width; Close is the main (dark) button when alone and light next to a "Go to" action; buttons stack full width on phones.

## Clients

### Problem
Deleting a client that has a paid invoice asked "Are you sure?", then showed a red toast "Failed to delete borrower(s)." The user was not told why, or what to do instead.

### Solution
- **Delete Selected** first calls `POST /common/borrowers/check-deletable`. If any selected client has a paid invoice, the "Are you sure?" confirmation is skipped and **"Client Cannot Be Deleted"** opens instead:
  - one short message (two lines): "This client has related records and cannot be deleted. Please change the client's status instead." (several selected: the blocked client's name, or a list of names)
  - when other clients were selected too: a note to unselect the blocked one(s) to delete the others.
  - Plain wording on purpose: no invoice detail, nothing in bold.
- Buttons: a cross (top right), **Close**, and **Go to Client** (opens `/clients/{id}`, only for one blocked client and only with `update clients`). Same look as "Lead Cannot Be Deleted": both buttons the same width; Close is light next to Go to Client and the main (dark) button when it is alone. With several blocked clients, each name links to that client.
- If the check fails, the normal confirmation shows; a 422 from the delete (with `errors.blocked`) opens the same modal instead of a toast.
- Built like `DeleteConfirmationModal`: a Bootstrap `modal fade flip` portalled to `<body>`, so it flips open the same way and is not clipped by the page layout; buttons stack on phones.
- A client without a paid invoice: unchanged - confirm, delete (the API deletes their unpaid invoices too).

## Leads (same branch)
- **Problem:** on `release` the Leads page deleted with `DELETE /common/leads/{id}`, a route the API removed, so every delete failed with 405 ("The DELETE method is not supported..."). A converted lead could be deleted too.
- **Solution:** `deleteLeads(ids)` posts the selection to `/common/leads/multiple-delete` in one call (ported from `stage`, commit `45d22b24`). A selection holding a converted lead (`convert_to` set) skips the confirmation and opens **"Lead Cannot Be Deleted"** ("This lead has already been converted and cannot be deleted."; several: listed by name; others selected: a note to unselect it). A 422 from the API (`errors.converted`) opens the same modal. Nothing else changes. The confirmation now reads "The selected leads will be deleted." - only the lead is deleted.
- The client modal's Bootstrap part moved to `src/components/Common/Modals/DeleteBlockedModal.tsx`, shared by clients and leads.

## Files changed (clients and leads; partners, lenders and funding are listed in their sections)
- `src/components/Common/Modals/DeleteBlockedModal.tsx` — shared "cannot be deleted" modal
- `src/modules/leads/services.ts`, `src/pages/leads/Leads.jsx` — bulk lead delete, converted-lead modal
- `tests/modules/leads/services.test.ts`, `tests/pages/leads/Leads.bulkDelete.test.tsx` — from `stage`, plus converted-lead tests
- `src/pages/clients/components/ClientDeleteBlockedModal.tsx` — new modal
- `src/pages/clients/Clients.tsx` — check before confirming; 422 opens the modal
- `src/modules/client/services.ts` — `checkClientsDeletable()`

## Tests (clients and leads)
- Leads: `tests/pages/leads/Leads.bulkDelete.test.tsx` - several leads deleted in one call; one lead through the same call; a converted lead opens the modal and deletes nothing (Close is the main button); a converted lead among several is named with the unselect note; a 422 from the API opens the modal.
- Added: `tests/pages/clients/Clients.delete.test.tsx` — blocked client opens the modal (no confirmation, no delete, no toast); text per line; Go to Client opens the client (Close light beside it); cross and Close close it; several blocked clients are listed and linked; one blocked among several; hidden Go to Client without `update clients` (Close becomes the main button); names are plain text without `update clients`; flip modal on `<body>`; 422 from the delete opens the modal; an unblocked client is confirmed and deleted.

## Partners and lenders (same branch)
- **Partners:** Delete Selected first calls `POST /admin/partners/check-deletable`. A partner with a paid invoice (or clients/users under it) opens **"Partner Cannot Be Deleted"** - same modal, wording and buttons as clients (cross, Close, Go to Partner -> `/partners/{id}`, only for one blocked partner and only with `update partners`). A 422 from the delete (`errors.blocked`) opens the same modal. Files: `src/pages/partners/Partners.jsx`, `src/pages/partners/components/PartnerDeleteBlockedModal.tsx`, `src/modules/partner/services.ts` (`checkPartnersDeletable`).
- **Lenders:** the page sent one DELETE per selected lender at once, so a refused lender left the others deleted. It now checks with `POST /admin/lenders/check-deletable` and deletes with one `POST /admin/lenders/multiple-delete` (all or none). A lender assigned to a funding request (or in a funding sequence) opens **"Lender Cannot Be Deleted"** (Go to Lender needs `update lenders`). Files: `src/pages/lenders/LendersList.tsx`, `src/pages/lenders/components/LenderDeleteBlockedModal.tsx`, `src/modules/lender/services.ts` (`deleteLenders`, `checkLendersDeletable`).
- **Tests:** `tests/pages/partners/Partners.delete.test.tsx`, `tests/pages/lenders/LendersList.delete.test.tsx` - blocked opens the modal (no confirmation, no delete, no toast); Go to opens the record; cross and Close close it; several blocked are listed and linked; one blocked among several; Go to hidden without the update permission (Close becomes the main button); 422 opens the modal; an unblocked selection is confirmed and deleted (lenders: in one call, no per-lender DELETE).

## Funding sequences (same branch)
- The page deleted a selection with one DELETE per sequence at once, so a refused one left the others deleted. It now checks with `POST /admin/funding-sequencings/check-deletable` and deletes with one `POST /admin/funding-sequencings/multiple-delete` (all or none). A sequence used by a funding request opens **"Funding Sequence Cannot Be Deleted"** - same modal and wording, with Go to Funding Sequence (always shown: the page has no edit permission of its own). Files: `src/pages/funding/FundingList.tsx`, `src/pages/funding/components/FundingSequenceDeleteBlockedModal.tsx`, `src/modules/funding/services.ts`.
- Tests: `tests/pages/funding/FundingList.delete.test.tsx` - same cases as lenders (no permission case: Go to Funding Sequence is always offered); the selection goes in one call, no per-sequence DELETE.

## Verification (final run, 2026-10-19)
- `npx vitest run` - 841 passed (131 files), 0 failed.
- `tsc --noEmit` (whole project) - 0 errors.
- Coverage of the new modal components: lines 100%, statements 96.9%, branches 94.5%.
- Manual, local browser: partner delete only. Lead, client, lender and funding sequence delete not yet checked by hand.

## Before merging
- Dry-run merge (`git merge-tree`): clean into `release`; into `stage` one conflict in `tests/pages/leads/Leads.bulkDelete.test.tsx` (the file was also added on `stage`) - keep both sides' tests. `src/modules/leads/services.ts` and `tests/modules/leads/services.test.ts` are identical to `stage`.
- Needs the API from the same branch in `fch-backend-api` (messages, `errors.blocked`, the new lender and funding-sequence routes, the subscription-delete fix). Deploy both together, `stage` first for QA, then `release`.

## Open / follow-up
- User delete (Users page) was not changed - its API still has open issues (O60, O61 in the API's `docs/test-findings.md`).
