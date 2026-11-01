# Credit Accounts — delete selected, status on the details page, form redesign (BUG-042)

2026-10-24

## Problem
QA defect log **BUG-042**: Credit Builder › Credit Accounts had no way to delete or inactivate a card. The list's status badge toggled Active/Inactive on click, with no confirmation and nothing showing it was clickable; `handleDelete()` existed but nothing called it; the edit page had no Status field. The add/edit page mixed card details, eligibility and approval notes in one card with four different field styles.

## Solution
- **List** (`CreditAccountsList.jsx`), following Leads / Capital Access:
  - a checkbox column (with `delete credit accounts`); any card can be ticked. **Delete Selected** with a card a borrower has applied for (`can_delete: false` from the API) shows the shared `DeleteBlockedModal` instead of the confirmation — nothing is deleted; it names those cards ("…so it can't be deleted. Unselect it to delete the others."), hints to switch it to Inactive, and offers **Open card** (one card) or links on each name — as Leads does for converted leads;
  - once rows are checked, **Actions ▾ › Delete Selected** replaces Add Account; the shared `DeleteConfirmationModal`, then one `POST …/credit-accounts/multiple-delete`, a toast and a reload;
  - a refusal (422 `errors.applied`) opens the shared `DeleteBlockedModal` naming the card(s);
  - the status badge is a plain label; the dead `handleDelete` / click-to-toggle code is gone.
- **Add / Edit** (`CreditAccountForm.jsx`) redesigned: **Card Details** · **Eligibility** · **Approval Notes** on the left, **Status** (Active switch, saying what Inactive means for borrowers) and **Card Image** on the right; one field style and height, 4px corners, compact headers (`.credit-account-form*` in `custom.css`). Field ids/names unchanged.
- The API keeps inactive and deleted cards out of Capital Access plays — see fch-api `docs/handoff/2026-10-24-credit-accounts-delete-and-inactive-in-plays.md`.

## Files changed
- `src/pages/credit-builder/credit-accounts/CreditAccountsList.jsx` — selection, Actions › Delete Selected, modals, plain status badge.
- `src/pages/credit-builder/credit-accounts/components/CreditAccountForm.jsx` — redesigned layout, Status switch.
- `src/modules/credit-accounts/services.ts` — `deleteCreditAccounts(ids)`.
- `src/components/Common/Modals/DeleteBlockedModal.tsx` — optional `tone="danger"`: a compact left-aligned dialog — icon and title in a header, the reason and the records (as chips) in a borderless danger alert, a hint line, and a footer with Close / the primary action; 4px corners (`.blocked-modal*` in `custom.css`). Default unchanged, so Leads, Clients, Partners, Lenders and Funding look as before; Credit Accounts uses `danger`.
- `tests/components/Common/Modals/DeleteBlockedModal.test.tsx` — +2 (danger tone; default unchanged).
- `assets/css/custom.css` — form styles.
- `tests/pages/credit-builder/CreditAccounts.delete.test.tsx` — new, 6 tests (incl. ticking a kept card, select all).
- `tests/pages/credit-builder/CreditAccountForm.status.test.tsx` — new, 2 tests.
- `tests/modules/credit-accounts/services.test.ts` — +1.
- `e2e/sidebar/credit-builder/credit-accounts/credit-accounts.spec.ts` — the four click-the-badge tests rewritten for the new behaviour; + delete selected, Delete Selected with a kept card shows why (nothing deleted), Open card goes to the card, refused delete, no checkboxes without permission, status on the details page.

## Testing
- New Vitest tests failed first, pass after. `tests/components/Common/Modals` + `tests/pages/credit-builder` + `tests/modules/credit-accounts`: 36 passed. Full Vitest: 240 files, 1,695 passed. `npm run typecheck` clean.
- E2E `credit-accounts.spec.ts` (mock): 23 passed.
- Checked visually (screenshots of edit, create, list with selection and a kept card).

## Open items
- The two pages are still `.jsx`; a TypeScript conversion is a separate change.
- Mark BUG-042 in the QA defect log back to In Progress, then Fixed after the stage retest.
