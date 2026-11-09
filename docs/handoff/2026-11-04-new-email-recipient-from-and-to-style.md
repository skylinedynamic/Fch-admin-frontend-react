# New Email: the client's email is selected, a host-only From section with a sender switch, and To looks like Subject

**Date:** 2026-11-04
**Branch:** bugfix/round-2

## Problem
In Clients › a client › Activity › New Email (as the host):
1. **To stays empty.** The client's email was in the activity context (`borrowerEmail`), but the modal's open handler only filled To for a host from `partnerEmail`. `ClientDetails` passes `undefined` for `partnerEmail`, so To stayed empty.
2. **To looks different from Subject.** `assets/css/custom.css` styles every Choices.js box with `!important`: 6px corners, 38px height, and on focus a blue border (`#80bdff`) with a blue glow. Subject has 4px corners, 37.5px height, and a light primary border on focus with no glow.
3. **The tag's × was not red (user request).**
4. **The sender was not shown (user request).** The modal did not say which address the email goes out from.

## Solution
- **Recipient:** the open logic moved to `initialEmailRecipient(ctx)` in `src/utils/emailRecipient.ts`, a unit-tested TS helper.
  - A host with no partner email in the context now gets the client's email.
  - The other cases behave as before: partner, funding request, a partner user's own client, and the host fallback.
  - The FCH support address is now the constant `FCH_SUPPORT_EMAIL` in `config/appConfig.ts`, no longer hard-coded twice.
- **To style:** the To box has the class `acm-tags--like-input`. Its rules override `custom.css` with `!important`, only inside this modal:
  - the Subject corners, height and border
  - the Subject focus border
  - no glow
  - the danger border when invalid
- **Red ×:** inside `acm-tags--like-input`, the remove button draws the Choices cross as a CSS mask over `var(--vz-danger)`.
- **From section (host only, user request):** `EmailFromSection.tsx` sits at the top of the modal body as a "Sending from" warning panel.
  - **Panel:** a light warning ground, a warning edge on the left, and theme text colours. It holds an icon tile, the name in bold and the address muted under it, and a note strip when the address is the fallback.
  - **Switch:** the same control as New Event's "Set Reminder" (`acm-option__switch`), with its label first. This was a user request: the switch did not match.
  - **Where it shows:** everywhere New Email opens, for the host: Client, Lead, Partner, Funding Request, Funding Application, Contact and Employee. The host is the signed-in user (`getAuthState().user.is_host`); not every page puts `isHost` in the activity context. On a Partner page, that partner is the record's partner (`entityId`). Elsewhere the record's partner is the context's `partnerId`, and a page with none (Contact, Employee) gets the host option only, with no switch.
  - It shows the address the email goes out from, read from fch-api's `GET common/activity-logs/email-sender?partner_id=` for the record's partner.
  - By default it is the client's partner's mail settings. A switch, "Send from the host's email", changes it to the host's own.
  - An option without email settings of its own shows the fallback address, with a note saying so. With no address at all, it warns that no email account is set up.
  - A host record (the host's own client) has no switch.
  - The modal sends `send_from` (`ACTIVITY_EMAIL_SENDER_PARTNER` or `ACTIVITY_EMAIL_SENDER_HOST`) with the email, so it really goes out from the shown address.
  - A partner user does not see the section, and nothing is requested.
  - The words live in `src/config/emailComposeConfig.ts`; the constants in `modules/activity-log/constants.ts`.

## Files changed
- `src/utils/emailRecipient.ts`: new; `initialEmailRecipient`.
- `src/config/appConfig.ts`: `FCH_SUPPORT_EMAIL`.
- `src/config/emailComposeConfig.ts`: new; `EMAIL_COMPOSE_TEXT`.
- `src/components/Common/Modals/EmailComposeModal.jsx`:
  - uses the helper and the constant
  - renders `EmailFromSection` for the host only
  - keeps `send_from` and sends it
  - adds the To class
- `src/components/Common/Modals/email-compose/EmailFromSection.tsx`: new.
- `src/components/Common/Modals/activity-create/activityCreateModal.css`: the From styles, the To-like-Subject overrides and the red cross.
- `src/modules/activity-log/{constants,types,services,queries}.ts`:
  - `ACTIVITY_EMAIL_SENDER_*`
  - `ActivityEmailSenders` and `ActivityEmailSenderOption`
  - `getActivityEmailSender(partnerId)`
  - `useActivityEmailSender(partnerId, enabled)`

## Testing
- **Unit:**
  - `tests/utils/emailRecipient.test.ts` (7). It failed first, because the module did not exist.
  - `tests/modules/activity-log/services.test.ts` (+2): the sender choices are sent with `partner_id`; a host record sends none.
- **Integration:** `tests/components/Common/Modals/EmailComposeModal.test.tsx`, run before the fix to watch the new cases fail.
  - **To:**
    - With a stand-in Choices, the host on a client has the client's email in To. This failed first, with To as `[]`.
    - To carries the class that matches Subject.
  - **From:**
    - The client's partner's address shows by default, in a warning box above To.
    - The switch shows the host's address, and the email is sent with `send_from=host`. By default it is sent with `send_from=partner`.
    - The fallback note shows; so does the "no email account" warning.
    - A host record has no switch.
    - A partner does not see the section, and nothing is requested.
    - These failed first: 7 failures before the code.
- **Integration, everywhere (+5):** a host on a lead, with the lead's partner and the switch; a host on a partner's page, where that partner is the record's; a host on an employee, with the host only and no switch; a partner user on a lead, who sees nothing; the switch is New Event's control. These failed first: 4 failures.
- **E2E (live), Lead and Partner:**
  - `e2e/sidebar/leads/lead-new-email.live.spec.ts`: lead 236 (`E2E_PARTNER_LEAD_ID`).
  - `e2e/sidebar/partners/partner-new-email.live.spec.ts`: partner 53 (`E2E_PARTNER_ID`).
  - Each checks that "Sending from" is the record's partner, and the host after the switch.
- **E2E (live), Client:** `e2e/sidebar/clients/client-new-email.live.spec.ts` (4), against the local API:
  - The client's email is selected in To.
  - From, on a partner's client (164, `E2E_PARTNER_CLIENT_ID`), is in a warning box above To, with the partner's address by default and the host's after the switch.
  - To looks like Subject, at rest and focused.
  - The × is red.
- **Results:**
  - Vitest (`tests/modules/activity-log`, `tests/components/Common`, `tests/utils/emailRecipient.test.ts`): 298 passed.
  - `npm run typecheck`: clean.
  - Live spec: 4 passed, with the setup step making 5.

## Open items
- **Stale context:** Employee's New Email button sets no activity context, so a context left from a page visited before is still read. It only affects which partner the switch offers.
- **Opened too early:** opening New Email before a lead or partner has loaded gives no record partner. It then shows the host option only.
- **Duplicate modal:** each detail page also mounts its own `EmailComposeModal`, so pages like Client have two `#emailComposeModal` elements, the global one first. Both behave the same, but the duplicate id is worth removing separately.
- **Other Choices boxes:** they keep the `custom.css` look. Only New Email's To was changed.
