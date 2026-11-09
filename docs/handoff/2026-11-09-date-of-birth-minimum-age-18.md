# 2026-11-09 — Date of birth: minimum age 18, calendars open 18 years back

## At a glance

| Problem | Solution | Changed |
|---|---|---|
| Every date of birth could be any past date (a 10-year-old could be saved); empty calendars opened on today's month, so finding a birth year meant a long scroll; under-age dates were only refused (if at all) after save. On a narrow calendar "November" wrapped onto two lines. | Platform minimum age 18, the same rule as the API (`fch-backend-api` `App\Rules\DateOfBirth`). Every date-of-birth calendar offers every year up to today, opens an empty field 18 years back (Nov 2008 on 9 Nov 2026, Mar 2009 on 15 Mar 2027), opens a saved date on that date, and shows "You must be at least 18 years old to continue." with a red border as soon as an under-age date is picked. The API returns the same message on save. Month label no longer wraps. | `src/utils/dateOfBirth.ts` (new); Client (`ClientInfoSection.tsx`), Employee (`PersonalDetailsSection.jsx`), funding application owner (`OwnershipInformationStep.tsx`) and co-borrower (`CoBorrowerModal.tsx`); `assets/css/primereact-calendar.css`, `assets/css/flatpickr-fix.css` |

## 2026-11-09 — Date of birth fields

**Problem.** Client, Employee, funding application owner and co-borrower dates of birth had `maxDate` today and no age check, so an under-18 date was only refused by the API after save (Client/Employee: not at all before the API change). Empty calendars opened on the current month. The Employee field's API error was never visible (`.invalid-feedback` with no `.is-invalid` sibling). Flatpickr fields with an error showed the message but no red border: react-flatpickr only puts the class on the hidden input, not on the visible alt input.

**Solution.**
- `utils/dateOfBirth.ts`: `MINIMUM_AGE` (18), `latestDateOfBirth()` (today minus 18 years, local midnight, 29 Feb → 28 Feb), `dateOfBirthError()` (minimum-age / future message, the API's wording), `openOnLatestDateOfBirth` (Flatpickr `onOpen`: empty field jumps 18 years back). Worked out from today's date, so the year moves on by itself.
- PrimeReact calendars (Client, Employee): `maxDate` today, `viewDate` = 18 years back only while the field is empty (memoised so a re-render does not move the calendar), `inputClassName="is-invalid"` and the message under the field when there is one; the API's message wins when both exist.
- Flatpickr calendars (owner, co-borrower): `maxDate: 'today'`, `onOpen: openOnLatestDateOfBirth`, `is-invalid` + message from `dateOfBirthError`.
- CSS: `input[type="hidden"].is-invalid + input.form-control` draws the invalid border on Flatpickr's visible input; `.p-calendar .p-inputtext.is-invalid` for PrimeReact; month dropdown takes the free width, year a fixed 76px, labels `nowrap`.

**Tests added / updated.**
- `tests/utils/dateOfBirth.test.ts` (new): cutoff, moves with the year (2026/2027/2030), 29 Feb, messages, onOpen.
- `tests/components/Calendar/CalendarWrapper.test.tsx`: empty DOB calendar opens Nov 2008, saved date opens on itself, every year to 2026 offered.
- `tests/pages/clients/components/ClientDateOfBirth.test.tsx` (new): Add Client opens Nov 2008 (Mar 2009 in 2027); picking 1 Nov 2026 shows the message + `is-invalid`; turning 18 today shows neither; Client → Profile opens on the saved date.
- `tests/pages/employees/components/form-sections/PersonalDetailsDateOfBirth.test.tsx` (new).
- `tests/pages/applications/fundapplication/components/datePickers.test.tsx`: owner/co-borrower open 18 years back; under-18 shows message + `is-invalid`.

**Verified.** `npx vitest run` on utils, Calendar, fundapplication, clients, employees: 176 passed. `tsc --noEmit`: no errors in the changed files.

**Status.** Done.

## Pending
- Not checked in a real browser: the CSS (month width, red border). Worth a look on Add Client and the funding application.
- Admin › Client › Credit Profile "dob" box is the date on a parsed credit report, not the client's date of birth - left as is.
- "Today" is the browser's date; the API uses UTC, so for a few hours around midnight they can differ by a day (backend `docs/test-findings.md` D18).
