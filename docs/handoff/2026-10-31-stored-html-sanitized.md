# Stored HTML is sanitized before it is rendered — Activity panel XSS (BUG-004, round 2)

2026-10-31

## Problem
QA round 2 defect log **BUG-004** (R1 OP-SEC-06, High/P1), Owner portal: a lead with Organization Name `R2-XSS <img src=x onerror=console.log("xss")>` — opening the lead (`/leads/192`) and expanding "Lead Created" in the Activity panel showed a broken image after "Lead profile created for R2-XSS" and logged `xss`: the `onerror` ran. List, form and dashboard showed the name as text.

`ActivitySidebar.jsx` rendered `activity.description` with `dangerouslySetInnerHTML`, unsanitized, and the API writes names into those descriptions as is. The defect log showed the bug as **Fixed**, but no fix existed on any branch. The same unsanitized render was in the reminder details, the appointment modal and upcoming list, a client's funding option description, funding application disclosures and the read-only agreement snapshot.

## Solution
- `src/utils/sanitizeHtml.ts` — DOMPurify with its defaults: formatting and ordinary links stay; `<script>`, `on*` handlers, `javascript:` URLs, iframes and objects go. Links with `target="_blank"` get `rel="noopener noreferrer"`. HTML stays HTML because activity notes are rich text written in the editor.
- Every `dangerouslySetInnerHTML` in `src/` with stored or API HTML now passes it through `sanitizeHtml()`. This also covers HTML already stored (QA's lead 192).
- `tests/utils/sanitizeHtml.usage.test.ts` fails, naming file and line, when a new `dangerouslySetInnerHTML` does not use `sanitizeHtml()`. Static markup the code writes itself goes in its `ALLOWED` list with the reason (today: the Activity sidebar's `<style>`, the agreement signer-name chip).
- `dompurify` ^3.4.15 is now a direct dependency (3.4.15 was already installed through `html2pdf.js`; the lockfile gains only the root entry).
- The API now also escapes names in the descriptions it writes (`fch-api/docs/handoff/2026-10-31-stored-html-sanitized.md`); the borrower portal has the same render fix.

## Files changed
- `package.json`, `package-lock.json` — `dompurify` ^3.4.15.
- `src/utils/sanitizeHtml.ts` — new.
- `src/components/Common/Activity/ActivitySidebar.jsx`, `src/components/Common/Modals/ReminderViewModal.tsx`, `src/components/Common/Modals/AppointmentModal.jsx`, `src/pages/appointments/Appointments.jsx`, `src/pages/clients/components/ClientFundingDetail.tsx`, `src/pages/applications/fundapplication/components/shared/DisclosureModal.tsx`, `src/pages/settings/components/AgreementBuilder/BlockComponents.tsx` (read-only snapshot only; the editable block is unchanged) — render through `sanitizeHtml()`.
- Tests: `tests/utils/sanitizeHtml.test.ts`, `tests/utils/sanitizeHtml.usage.test.ts`, `tests/components/Common/Activity/ActivitySidebar.xss.test.tsx`, `tests/pages/settings/components/AgreementBuilder/TextBlock.readOnlyXss.test.tsx` (new); BUG-004 cases added to `ReminderViewModal.test.tsx`, `AppointmentModal.test.tsx`, `Appointments.test.tsx`.
- `e2e/sidebar/leads/lead-activity-xss.spec.ts` — new: the lead's Activity panel shows the name, has no `onerror` element, and `window.__xss` stays unset.

## Testing
- Each new test failed first (`<img onerror>` / `<script>` still in the DOM), then passed. The guard was checked against a temporary unsanitized file (it named it), which was then removed.
- Full Vitest suite — 329 files, 2372 passed, 2 expected fail.
- `npm run typecheck` — clean.
- Playwright mock project, `lead-activity-xss.spec.ts` after `npm run build` — 1 passed.

## Open items
- Update BUG-004 in the round-2 defect log: it was marked Fixed before any fix existed. Lead 192 can be retested as is.
- The agreement editor's editable block still sets `innerHTML` itself (not through `dangerouslySetInnerHTML`); its content is written by the host's own staff.
