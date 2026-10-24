# Format checks server-side only; a lead's full SSN; bank routing number

**Date:** 2026-10-19
**Branch:** bugfix/all-bugfix
**Author:** Awlad Hossain

## Problem
- **Contacts → Add/Edit** refused a mobile number in the browser with its own regex (`Please enter a valid mobile number…`). Formats are meant to be checked by the API only, through its `App\Rules` classes.
- **`components/errors/validation.js`** still carried `validatePhone` and `validateSSN`. Nothing used them except an import in `EmployeeDetails`, where client validation was already switched off, and an unused import in `PartnerProfile`.
- **Leads → Contact Info** had an "SSN Last 4" number box. The API now keeps a lead's **full** SSN, encrypted, the same way as a client's (fch-api `2026-10-19-format-rules-and-full-ssn`).
- **Settings → Payment Integration → Bank Transfer:** the routing number had no input mask. When the API refused it, the message only appeared in a toast.

## Solution
- **ContactDetails:** the phone regex check was removed. "Mobile number is required" stays, and the `(XXX) XXX-XXXX` mask stays. A refused number shows the API's message on the field.
- **validation.js:** `validatePhone` and `validateSSN` were removed, along with their imports.
- **LeadDetails (Contact Info):** "Social Security Number" works the same way as on Client → Profile.
  - The field is prefilled from `ssn`, written XXX-XX-XXXX as it's typed (`formatSSN`), and sent as nine digits.
  - A cleared field is sent as `null`, which removes the SSN on file.
  - `modules/leads/types.ts`: `ssn` replaces `ssn_last_4`.
- **PaymentMethodConfigForm:** the routing number is kept to digits only, nine at most; this is only how the number is written. A 422 on `bank_details.N.field` now lands under that row's field, in addition to the toast.

## Files changed
- `src/pages/contacts/ContactDetails.jsx`: phone format check removed.
- `src/components/errors/validation.js`: `validatePhone` and `validateSSN` removed.
- `src/pages/employees/EmployeeDetails.jsx`, `src/pages/partners/PartnerProfile.jsx`: imports updated.
- `src/pages/leads/LeadDetails.jsx`: full SSN field.
- `src/modules/leads/types.ts`: `ssn`.
- `src/pages/settings/components/PaymentMethodConfig/PaymentMethodConfigForm.tsx`: routing number mask; server errors on the bank fields.

## Tests
- **Added:**
  - `tests/pages/leads/LeadDetails.ssn.test.tsx` (4)
  - `tests/pages/settings/components/PaymentMethodConfig/PaymentMethodConfigForm.routing.test.tsx` (2)
- **Updated:** `tests/pages/contacts/ContactDetails.test.tsx`. An incomplete mobile number is now sent to the API, and the API's answer is shown.
- **E2E:** added `e2e/server-format-fields.spec.ts` (3, mocked API), covering:
  - lead SSN;
  - contact mobile refused by the API;
  - bank routing number.
- **Run:**
  - `npm test`: 190 files, 1393 passed (+2 expected fail).
  - `npm run typecheck`: clean.
  - `npx playwright test e2e/server-format-fields.spec.ts --project=mock`: 3 passed.

## Open / follow-up
- `dist/` was rebuilt with the normal `.env` after the e2e build.
- The API's lead migration has to run before this ships: `php artisan migrate` in fch-api.

## Follow-up (same day): formats shown on load, and one SSN field
- **EIN shown as XX-XXXXXXX everywhere, on load as well as while typing.**
  - The new `displayEIN()` in `utils/formatters.js` formats only a digits/hyphen value; any other text (old free-text tax IDs) is shown as is, so a save never blanks it.
  - Applied in:
    - Client → Profile (load);
    - the client details modal;
    - Lead → Contact Info (it was a `type="number"` box);
    - Partner → Tax ID (mask and display).
- **Lead D-U-N-S:** now a text box with digits only, nine at most, so a leading zero is kept.
- **CMS Site Settings phone:** formatted on load; the placeholder is now `(555) 555-5555` instead of `+1 234 567 890`.
- **One SSN field:** `components/Common/SsnInput.tsx` is ported from borrower-fch.
  - It shows `***-**-1234` at rest and dots while editing, with the digits on the eye button.
  - Used on Client → Profile, Lead → Contact Info, Fund Application Ownership step and Co-Borrower modal.
- **Not changed:** Client → Credit Profile (the parsed bureau report's personal info). Its SSN is the report's own text, often already masked, and the host edits it as text.
- **Tests:**
  - `tests/utils/formatters.test.ts` (displayEIN)
  - `tests/components/Common/SsnInput.test.tsx`
  - `tests/pages/applications/fundapplication/components/ssnFields.test.tsx`
  - `tests/pages/clients/components/ClientEinFormat.test.tsx`
  - `tests/pages/leads/LeadDetails.formats.test.tsx`; `LeadDetails.ssn.test.tsx` updated
  - `tests/pages/partners/components/PartnerTaxId.test.tsx`
  - `tests/pages/cms/SiteSettings.phone.test.tsx`
  - `e2e/server-format-fields.spec.ts` updated (masked SSN, EIN/DUNS)
- **Run:**
  - `npm test`: 196 files, 1416 passed (+2 expected fail).
  - typecheck: clean.
  - e2e `server-format-fields`: 3 passed.

## Follow-up 2 (same day): SSN shown read-only, and the co-borrower modal
- **Funding Applications → Details → Ownership Information:** the SSN was written 3-3-3 (`325-555-555`) by a formatter of the page's own.
  - It now uses `components/Common/SsnValue.tsx`: masked `***-**-5555`, with `325-55-5555` on the eye button.
  - The co-borrower SSN uses it too. The co-borrower card also showed Home Phone and Date of Birth twice; the duplicate rows are removed.
- **Client details modal:** the SSN is now `SsnValue` (it was shown in full).
- **Embed submission details:** the last four now read `***-**-1234` (they were `•••-••-1234`).
- **Fund Application (`/fund-application/:id`):**
  - The Ownership step crashed (a blank page) when an application had co-borrowers and the country list had not loaded: `getDefaultCountry().name`. It now uses `?.`, as the borrower portal already did.
  - Phone placeholders now read `(555) 555-5555`. The old `(123) 456-7890` is not a valid US number, because an area code never starts with 1.
  - Co-Borrower modal: Date of Birth is now full width. `custom.css` got the `.flatpickr-wrapper { display:block; width:100% }` rule the borrower portal has. A field's validation error now clears once that field is edited, so an emptied Home Phone no longer keeps its old error.
- **Tests:**
  - `tests/components/Common/SsnValue.test.tsx`
  - `FundingApplicationDetails.test.tsx` (Ownership SSN)
  - `ClientEinFormat.test.tsx` (modal SSN)
  - `EmbedFormSubmissionDetails.test.tsx` (last four)
  - `ssnFields.test.tsx` (country-list crash, placeholders)
  - `e2e/fund-application-ownership-ssn.spec.ts` (owner SSN; modal SSN, placeholders, date width)
- **Run:**
  - `npm test`: 197 files, 1426 passed (+2 expected fail).
  - typecheck: clean.
  - e2e (`server-format-fields`, `fund-application-ownership-ssn`, `fund-application-funding-request`): 8 passed.
