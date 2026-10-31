# Client, lead and partner profiles — an id that is not a record loads no counters or activity (BUG-001, round 2)

2026-10-31

## Problem
QA round 2 defect log **BUG-001** (R2-OP-GLOB-03, Medium/P2), Owner portal: opening `/clients/abc` or `/clients/999999999`
- kept the grey skeletons forever with no message,
- fired `POST /common/borrowers-profile-states-details-count/abc` → **500**,
- fired `POST /common/activity-logs/fetch-all-activities` with `borrower_id: "abc"`, and the Activity panel listed unrelated entries (e.g. "Invoice Created by Wanda Romanoff").

The endless skeleton was already fixed on 2026-10-26 by BUG-030 (`e79e7764`: a 404/403 shows "Client Not Found"); QA's run was on 2026-10-21. The counters and the Activity panel, however, were still requested with the URL id before the client had answered.

The same held on the other profiles with an Activity panel:
- **Lead** (`/leads/abc`): Lead Not Found was shown (BUG-030), but the Activity panel was asked for `lead_id: "abc"` first.
- **Partner** (`/partners/abc`): no not-found state at all — an empty form, a "Failed to load partner data" toast, and the counters (500) and activity asked for the bad id.
- Funding Application and Funding Request details were already fine: they render the panel only after their record has loaded. Contact details has the panel commented out.

## Solution
- `ActivitySidebar.jsx`: new `enabled` prop (default `true`, so other callers are unchanged). While `false` it does not fetch and keeps its skeleton. Passing no `entityId` instead was rejected: without an id the list is unfiltered — the bug itself.
- `ClientDetails.tsx`: counters query enabled only once the client has loaded (`useClient().isSuccess`); counter strip shows its skeleton until then; `enabled={clientLoaded}` on the sidebar.
- `LeadDetails.jsx`: `enabled={leadLoaded}` on the sidebar, reusing the page's existing `leadLoaded` (`!id || formData.id != null`).
- `PartnerProfile.jsx`: 404/403 now shows **Partner Not Found** (like clients and leads, BUG-030) instead of the toast; the counters and the sidebar wait for the page's existing `partnerLoaded`.
- The API side (fch-api, same date): every `int`-typed URL id is constrained to digits (404 instead of 500) and the activity list refuses non-numeric id filters (422). See `fch-api/docs/handoff/2026-10-31-client-profile-invalid-id.md`.

## Files changed
- `src/components/Common/Activity/ActivitySidebar.jsx` — `enabled` prop defers the fetch, keeps the skeleton.
- `src/pages/clients/ClientDetails.tsx` — counters and activity wait for the client; counter skeleton while it loads.
- `src/pages/leads/LeadDetails.jsx` — activity waits for the lead.
- `src/pages/partners/PartnerProfile.jsx` — Partner Not Found; counters and activity wait for the partner.
- `tests/pages/clients/ClientDetails.notFound.test.tsx` — `abc` / `999999999`: Client Not Found, no counters/activity call; an existing client still loads both; Activity skeleton while the client loads.
- `tests/pages/leads/LeadDetails.notFound.test.tsx` — `abc`: no activity call; an existing lead's activity (`lead_id: '7'`); skeleton while loading.
- `tests/pages/partners/PartnerProfile.notFound.test.tsx` — new: Partner Not Found without a toast, no counters/activity call; an existing partner loads both; skeleton while loading.
- `e2e/sidebar/clients/client-not-found.spec.ts`, `e2e/sidebar/leads/lead-not-found.spec.ts`, `e2e/sidebar/partners/partner-not-found.spec.ts` (new) — the same flows in the browser, checking no counters/activity request is made.

## Testing
- Every new Vitest case failed first (counters/activity called once, no skeleton, no Partner Not Found), then passed.
- `npx vitest run tests/pages/leads tests/pages/partners tests/pages/clients` — 38 files, 208 passed.
- Full Vitest suite — 325 files, 2357 passed, 2 expected fail.
- `npm run typecheck` — clean.
- Playwright mock project, `e2e/sidebar/{clients,leads,partners}` after `npm run build` — all new specs pass. 4 failures are pre-existing: they fail the same way with these changes stashed (`client-profile-tabs.spec.ts:222` Credit Profile upload, `clients-list.spec.ts:127` partner filter, `leads.spec.ts:143` convert dialog — two "Convert Lead to Borrower" headings, `leads.spec.ts:185` Contact Person required). A few partner specs failed intermittently under the full parallel run and passed when run on their own.

## Open items
- The 4 pre-existing E2E failures above are not part of this change.
- Update BUG-001 in the round-2 defect log once verified on stage.
