# Clients: date of birth picker 18–120, negative amounts no longer flipped (BUG-005, BUG-006, round 2)

2026-11-01

## Problem
QA round 2 defect log:

- **BUG-005**: Clients › Add/Edit Client accepted any past date of birth. A client aged 17 (01 Jan 2009) and a client aged 106 (01 Jan 1920) were both saved. The picker only had `maxDate={new Date()}`.
- **BUG-006**: Business Financials saved a Current Business Debt of -500 as 500. `formatNumber` in `BusinessFinancialsSection.tsx` ran `replace(/[^0-9.]/g, '')` on every keystroke, so the minus sign was dropped before the API saw the value. The API also had no ceiling on amounts and no range on profit margin; that is fixed in fch-api, see `fch-api/docs/handoff/2026-11-01-client-dob-and-financials-bounds.md`.

## Solution
- The date of birth picker (`ClientInfoSection`, used by both Add and Edit Client) offers 18 to 120 years old only:
  - `minDate`/`maxDate` come from `dateOfBirthBounds()`.
  - When no date is set, it opens on the latest allowed month.
  - The bounds are memoised, because a new `viewDate` each render would reset an open picker.
  - The year dropdown already narrows itself to `minDate`/`maxDate` (`CalendarWrapper`).
- `BORROWER_AGE = { MIN: 18, MAX: 120 }` is in `src/config/borrower.ts`. `dateOfBirthBounds()` is in `src/utils/dates.ts`: the 18th birthday as the latest date, and the day after the 121st birthday as the earliest, the same as the API. 29 Feb is kept inside the month.
- Money fields keep a leading minus. A negative amount is sent as typed; the API refuses it ("Enter an amount of 0 or more.") and the existing 422 handling shows the message under the field. Profit margin was already `type="number"`, so a negative margin, which is now allowed, is sent as typed.

## Files changed
- `src/config/borrower.ts`: `BORROWER_AGE`.
- `src/utils/dates.ts`: `dateOfBirthBounds()`.
- `src/pages/clients/components/ClientInfoSection.tsx`: DOB picker bounds and `viewDate`.
- `src/pages/clients/components/BusinessFinancialsSection.tsx`: `formatNumber` keeps the minus sign.
- `tests/utils/dates.test.ts`: `dateOfBirthBounds` cases.
- `tests/pages/clients/components/ClientDateOfBirthPicker.test.tsx`: new. The picker opens on October 2008 for 21 Oct 2026; the 21st can be picked and the 22nd is disabled.
- `tests/pages/clients/components/BusinessFinancialsSection.test.tsx`: new cases. The minus is kept and sent; the API's 422 message shows under the field; a negative amount is formatted; a negative margin is sent.
- `e2e/sidebar/clients/client-financials-bounds.live.spec.ts`: new, live. QA's revenue, margin and -500 return 422 with each message on its field, and nothing changes after a reload. Writes nothing.
- `e2e/sidebar/clients/client-date-of-birth-bounds.live.spec.ts`: new, live. The picker's years run from 120 to 18 years ago. Writes nothing.

## Testing
- New Vitest cases failed first: the minus was dropped, the picker opened on 2026, and `dateOfBirthBounds` was missing. They then passed.
- Full Vitest: 331 files, 2383 passed (2 expected fail). `npm run typecheck` is clean.
- Playwright live, against the local API with the fch-api change: the two new specs and `client-credit-scores.live.spec.ts` passed, 4/4 with setup.

## Open items
- Typing only "-" in a money field sends "-", which the API refuses as not numeric. This is acceptable, but could be cleaned up client-side.
- The funding-application ownership and co-borrower DOB pickers were not changed (not in the QA report).
