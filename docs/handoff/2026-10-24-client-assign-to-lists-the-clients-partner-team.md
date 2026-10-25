# Clients — "Assign to" lists the client's partner's team (BUG-055)

2026-10-24

## Problem
QA defect log **BUG-055**: Clients › client profile, "Assign to" listed the signed-in user's team. `ClientInfoSection.tsx` called `allUsers()` with no partner, so the host opening a partner's client was offered the host's staff — and could save one of them on that partner's client.

The other half of the report — the host choosing another partner on Add Client — works as intended: the host's Add Client is for its own clients.

## Solution
- "Assign to" asks `common/get-all-users` for the **client's partner** (`partner_id` from the client record) once the client has loaded; Add Client asks without a partner, i.e. your own team (the new client is filed under your partner). Same approach as the lead's Lead Owner.
- An assignee saved before this, outside the partner's team, is still shown — as "Name (not on this partner's team)" — instead of a blank field, so opening and saving the client does not clear it. The API keeps the current assignee too.
- The API now refuses an assignee from outside the client's partner team (422 on `assign_id`, shown under the field) — see fch-api `docs/handoff/2026-10-24-client-assignee-from-the-partners-team.md`.

## Files changed
- `src/pages/clients/components/ClientInfoSection.tsx` — team fetched for the client's partner; kept assignee added to the options.
- `tests/pages/clients/components/ClientAssignTo.test.tsx` — new, 3 tests.
- `e2e/sidebar/clients/client-assignee-team.spec.ts` — new, 3 tests.

## Testing
- New Vitest tests: the partner's client asks for that partner's team and lists it; Add Client asks for your own; an old assignee outside the team shows, marked. The two client-profile tests failed first (request had no `partner_id`; field blank), pass after. Full suite: 242 files, 1704 passed. `npm run typecheck` clean.
- E2E (mock): `client-assignee-team.spec.ts` 3 passed; `lead-owner-team.spec.ts` passed. `clients-list.spec.ts` › "partner filter sends the partner id" fails with or without this change (existing test drift, one of the known 26).

## Open items
- Mark BUG-055 in the QA defect log back to In Progress, then Fixed after the stage retest; note the partner-picker half as works-as-intended.
