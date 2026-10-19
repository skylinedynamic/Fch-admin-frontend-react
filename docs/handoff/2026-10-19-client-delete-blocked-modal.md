# Clients: "Client Cannot Be Deleted" modal instead of an error toast

**Date:** 2026-10-19
**Branch:** `fix/client-delete-paid-invoice-message` (from `release`) - same branch name in `fch-backend-api`
**Author:** arafat-invento

## Problem
Deleting a client that has a paid invoice asked "Are you sure?", then showed a red toast "Failed to delete borrower(s)." The user was not told why, or what to do instead.

## Solution
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

## Files changed
- `src/components/Common/Modals/DeleteBlockedModal.tsx` — shared "cannot be deleted" modal
- `src/modules/leads/services.ts`, `src/pages/leads/Leads.jsx` — bulk lead delete, converted-lead modal
- `tests/modules/leads/services.test.ts`, `tests/pages/leads/Leads.bulkDelete.test.tsx` — from `stage`, plus converted-lead tests
- `src/pages/clients/components/ClientDeleteBlockedModal.tsx` — new modal
- `src/pages/clients/Clients.tsx` — check before confirming; 422 opens the modal
- `src/modules/client/services.ts` — `checkClientsDeletable()`

## Tests
- Added: `tests/pages/clients/Clients.delete.test.tsx` — blocked client opens the modal (no confirmation, no delete, no toast); text per line; Go to Client opens the client (Close light beside it); cross and Close close it; several blocked clients are listed and linked; one blocked among several; hidden Go to Client without `update clients` (Close becomes the main button); names are plain text without `update clients`; flip modal on `<body>`; 422 from the delete opens the modal; an unblocked client is confirmed and deleted.
- Suites run: `npx vitest run` — all passed; `tsc --noEmit` clean.

## Partners and lenders (same branch)
- **Partners:** Delete Selected first calls `POST /admin/partners/check-deletable`. A partner with a paid invoice (or clients/users under it) opens **"Partner Cannot Be Deleted"** - same modal, wording and buttons as clients (cross, Close, Go to Partner -> `/partners/{id}`, only for one blocked partner and only with `update partners`). A 422 from the delete (`errors.blocked`) opens the same modal. Files: `src/pages/partners/Partners.jsx`, `src/pages/partners/components/PartnerDeleteBlockedModal.tsx`, `src/modules/partner/services.ts` (`checkPartnersDeletable`).
- **Lenders:** the page sent one DELETE per selected lender at once, so a refused lender left the others deleted. It now checks with `POST /admin/lenders/check-deletable` and deletes with one `POST /admin/lenders/multiple-delete` (all or none). A lender assigned to a funding request (or in a funding sequence) opens **"Lender Cannot Be Deleted"** (Go to Lender needs `update lenders`). Files: `src/pages/lenders/LendersList.tsx`, `src/pages/lenders/components/LenderDeleteBlockedModal.tsx`, `src/modules/lender/services.ts` (`deleteLenders`, `checkLendersDeletable`).
- **Tests:** `tests/pages/partners/Partners.delete.test.tsx`, `tests/pages/lenders/LendersList.delete.test.tsx` - blocked opens the modal (no confirmation, no delete, no toast); Go to opens the record; cross and Close close it; several blocked are listed and linked; one blocked among several; Go to hidden without the update permission (Close becomes the main button); 422 opens the modal; an unblocked selection is confirmed and deleted (lenders: in one call, no per-lender DELETE).
- Suites run: `npx vitest run` - 833 passed; `tsc --noEmit` clean for these files.

## Funding sequences (same branch)
- The page deleted a selection with one DELETE per sequence at once, so a refused one left the others deleted. It now checks with `POST /admin/funding-sequencings/check-deletable` and deletes with one `POST /admin/funding-sequencings/multiple-delete` (all or none). A sequence used by a funding request opens **"Funding Sequence Cannot Be Deleted"** - same modal and wording, with Go to Funding Sequence (always shown: the page has no edit permission of its own). Files: `src/pages/funding/FundingList.tsx`, `src/pages/funding/components/FundingSequenceDeleteBlockedModal.tsx`, `src/modules/funding/services.ts`.
- Tests: `tests/pages/funding/FundingList.delete.test.tsx`. Suites: `npx vitest run` - 841 passed.

## Open / follow-up
- Needs the API from the same branch in `fch-backend-api` (message, `errors.blocked`, the subscription-delete fix). Deploy both together.
