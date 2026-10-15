# 2026-10-15 — QA: host cannot edit a partner's application, "Take Me There" scroll, Funding Type search

Branch `bugfix/qa-fixes-2026-10-15` (from `stage`). The backend half (403 for host writes, catalogue order) is in `fch-backend-api` on the same branch; the plan is `fch-backend-api/docs/QA_ISSUES_2026-10-15_PLAN.md`.

## At a glance

| Problem | Solution | Files |
|---|---|---|
| The host saw **Edit Funding Application** on a white-label partner's application (`/intake-review/funding-application/82`), and **Process / Edit** on a partner's funding request. Product decision: only the owning partner edits. | `ownsApplication(user, partnerId)` gates both pages; the API now refuses host writes too (403). | `src/utils/applicationOwnership.ts`, `src/pages/applications/funding/FundingApplicationDetails.tsx`, `src/pages/applications/funding-request/FundingRequestDetail.tsx` |
| The AI assistant's **Take Me There** closed the chat but did nothing when the target was the open page (e.g. Dashboard while scrolled down); a new page could open part-way down. | `revealRoute()` after `navigate()`: smooth scroll to the top and the active sidebar link into view. | `src/utils/revealRoute.ts`, `src/components/Common/ChatWidget/SupportChatWidget.tsx` |
| **Funding Type** on `/funding/create` had no search. | `filter` + `filterBy="name"` on its Dropdown. | `src/pages/funding/components/FundingSequencingForm.tsx` |

## Host cannot edit a partner's application
- **Problem:** `canEditApplication` checked only the request and application status, never ownership.
- **Solution:** `ownsApplication()` compares the user's `partner_id` with the application's, as strings, because the store holds ids as string or number. Applied to Edit on the application details page, and to Process Application and Edit on the funding request page. Process also writes the application, and the API now refuses it for the host. A host who opens `/fund-application/:id` directly gets the API's 403 message as the global toast.
- **Tests added/updated:**
  - `tests/utils/applicationOwnership.test.ts` (unit)
  - `tests/pages/applications/funding/FundingApplicationDetails.test.tsx`: host on a partner's application has no Edit; the owning partner has it
  - new `tests/pages/applications/funding-request/FundingRequestDetail.test.tsx`: confirmed failing with the check disabled
  - E2E: `e2e/sidebar/intake-review/funding-application/funding-application.spec.ts` (details page Edit, host vs owner) and `e2e/sidebar/intake-review/funding-request/funding-request-details.spec.ts` (Process/Edit, host vs owner)
- **Status:** done.

## Take Me There scroll
- **Tests:** `tests/utils/revealRoute.test.ts`; `tests/Assistant/ChatWidget/SupportChatWidget.test.tsx` (Take Me There to `/` scrolls to the top).
- **Status:** done.

## Funding Type search
- **Note:** the Funding Type dropdown lists the lenders' **product categories** (`/admin/lenders/product-categories`). The backend now returns those newest first, so the dropdown shows the newest first too.
- **Tests:** `e2e/sidebar/funding-sequence/funding.spec.ts`. Funding Type and Funding Group can be searched (Funding Type failed before the fix; Group already passed). The spec's base mocks now include product categories, because the form loads them.
- **Status:** done.

## Verified
- `npm run typecheck` and `npm run typecheck:e2e`: clean.
- `npx vitest run`: 172 files, **1247 passed**, 2 expected-fail (existing markers), 0 failed.
- E2E (mock): funding-sequence `funding.spec.ts` 27 passed; `funding-request-details.spec.ts` + `funding-application` folder 19 passed; `funding-application.spec.ts` 7 passed.

## Still pending
- The admin `FUNDING_REVIEW_GUIDELINE_CARDS` still contain the same wording QA flagged on the borrower side ("Admin can reviewing the request."). That is a host-facing page; not changed here.
- Not committed.


## 2026-10-15 — Client funding hover card: Banking Activity reason
- **Problem:** On a client's Funding tab, the hover card read "Banking Activity: Missing / Required: Uploaded".
- **Solution:** `ClientFundingSequences` shows the API's `reason` and "Required: {requirement}" when present. Figure checks keep their numbers.
- **Tests:** new `tests/pages/clients/ClientFundingSequences.test.tsx`. Vitest **1249 passed**, 2 expected-fail; typecheck and typecheck:e2e clean.
- **Status:** done.


## 2026-10-15 — Request documents listed; audit history without stored files or passwords
- **Problem:**
  - Intake & Review → Funding Request listed every document as "Not Uploaded".
  - The audit history showed the plain-text download password.
- **Solution:**
  - No page change was needed for the documents: the API sends each attached file with `document_id: null`, so the page downloads it by URL.
  - `FundingApplicationAuditHistory`: the "Document Password Used" block is removed, and a record without a file says "Downloads are not kept on the server…".
- **Tests:**
  - `FundingRequestDetail.test.tsx` (lists every attached file)
  - new `tests/pages/applications/funding/FundingApplicationAuditHistory.test.tsx`
  - Vitest **1251 passed** (2 expected-fail); typecheck and typecheck:e2e clean.


## Reverted (2026-10-15, product decision)

**Reverted:**
- Funding request and application documents kept apart from the borrower library. That covers the migration, `FundingRequestDocumentService`, wizard changes, request → application copy, Banking Activity counting request files, the backfill command and the resource.
- The admin request page "Not Uploaded" eager-load fix.
- The application wizard same-name upload fix.
- Pending shown as "Submitted".
- The Edit Application alignment CSS.

The funding request and application document flow is back to how it was on `stage`.

**Kept:**
- Pre-qualification notification
- Host cannot edit a partner's application
- Take Me There
- Lender / Funding Group order and Funding Type search
- Bank statement messages and Under Review passing
- Funding request status description ("What happens next")
- Downloads streamed, not saved, password never stored
