# Excuse one partner or client from signing the agreement

2026-11-05

## Problem
The host could turn agreement signing on or off only for groups: globally, for all partners, or for all of one partner's clients. There was no way to excuse one specific partner or client. Also, a partner's or client's Agreement tab appeared only after they had signed.

## Solution
- **New tab component.** `AgreementTab` (TypeScript) now backs the Agreement tab on Partner Profile and Client Details.
- **What the host sees.** A host viewer gets an "Agreement signing" card with a switch, "Require this partner/client to sign the …". It calls the new `POST /common/agreement-sign/required/{userId}` through the agreement module (`setAgreementRequired` / `useSetAgreementRequired`), toasts the result, and updates in place. It keeps the saved value and passes it to the page (`onRequiredChange` → `setFormData`), which loads neither the details nor the stats again. Before this, every switch reloaded the stats skeletons and the client details, and on a partner whose `full_name` was already loaded the switch could jump back to its old value. A failed change toasts the server message and leaves the switch as it was. The switch is disabled when the record has no login yet.
- **Design.** The card is in the portal's primary (brand) colour (`--brand-primary`, falling back to the theme primary), with its styles (`.agr-req*`) in `assets/css/custom.css`. It has an icon tile, a "Required" / "Waived" pill, and a large switch labelled with its state. Below that, until the agreement is signed, a status strip reads "Awaiting signature" or "No signature needed". Once signed, the existing `AgreementSection` shows below the card.
- **Follows Settings › Agreement.**
  - The card asks the API, through `useAgreementRequirement(userId)` (`GET /common/agreement-sign/required/{userId}`), whether the switch can be changed. It used to read only the global app configuration.
  - The switch can be changed only while signing is on **and** the agreement this person would sign is active: the host's partner agreement for a partner, the client's partner's borrower agreement for a client.
  - **While locked,** the switch shows off and is disabled. The pill reads "Off for everyone" when signing is off globally, otherwise "Agreement off". A warning strip shows the API's `locked_reason` and where to turn it on.
  - The switch stays locked until the status has loaded.
  - A saved change is written into that query's cache (`useSetAgreementRequired`), so nothing is fetched again.
- **Once signed, there is no switch.** After the agreement is signed, the requirement card is not shown; only the signed agreement (`AgreementSection`) is. The card's border radius is 4px.
- **When the tab shows.** For a host viewer it now appears before signing too, so the host can excuse someone. It is still never shown on the host's own partner profile. Non-host viewers still see it only once there is a signed agreement.
- **Constants.** `AGREEMENT_SIGNER` (`partner` / `client`) lives in the agreement module's `types.ts`.

- **The partner's sign modal asks again while the portal is open.**
  - **Before:** `AgreementSignModal` called `/agreement-sign/check` only once, when the app loaded. When the host required the agreement, the partner's next call ran `refresh-user`, which correctly still said `is_agreement_signed: false`, but nothing asked `/check` again, so the modal appeared only after a full reload.
  - **Now:** `refreshUser()` fires `USER_REFRESHED_EVENT` after storing the fresh user. The modal listens and asks again:
    - it opens when signing is now needed;
    - it closes when signing was waived or turned off;
    - it keeps what was filled in when the wording is unchanged.

## Files changed
- `src/modules/agreement/types.ts`: `AGREEMENT_SIGNER`, `AgreementSigner`, `SetAgreementRequiredPayload`, `AgreementRequirement`, `AgreementRequirementStatus`.
- `src/modules/agreement/services.ts`: `setAgreementRequired`, `fetchAgreementRequirement`.
- `src/modules/agreement/queries.ts`: `useSetAgreementRequired` (writes the saved value into the requirement cache), `useAgreementRequirement`.
- `src/lib/query/queryKeys.ts`: `agreement.requirement(userId)`.
- `src/config/appConfig.ts`: `USER_REFRESHED_EVENT`.
- `src/lib/auth/authApi.ts`: `refreshUser()` fires `USER_REFRESHED_EVENT`.
- `src/components/Common/Modals/AgreementSignModal.tsx`: asks `/check` again on `USER_REFRESHED_EVENT`; closes when no longer needed.
- `src/modules/client/types.ts`: `has_sign`, `agreement_required` on `Client`.
- `src/pages/partners/components/AgreementTab.tsx` (new), styles at the end of `assets/css/custom.css`: the requirement card (following Settings › Agreement, hidden once signed), the signature status and the signed agreement.
- `src/pages/partners/components/PartnerForm.jsx`: renders `AgreementTab`; new `isHostViewer` and `onAgreementRequiredChange` props.
- `src/pages/partners/PartnerProfile.jsx`: tab gate (signed, or the host viewing a non-host partner); passes `isHostViewer`, and `handleAgreementRequiredChange` (patches `formData`).
- `src/pages/clients/components/ClientForm.tsx`: renders `AgreementTab`; new `onAgreementRequiredChange` prop.
- `src/pages/clients/ClientDetails.tsx`: tab gate (signed, or the host on a saved client); `handleAgreementRequiredChange` patches `formData`.

## Testing
- **New:**
  - `tests/pages/partners/components/AgreementTab.test.tsx` (11): default on; excuse posts, toasts and updates in place (no `onRefresh`); excused state and re-require; failure keeps the switch; disabled without a login; hidden from non-host; once signed, only the signed agreement (no switch); locked while signing is off, while the partner agreement is off, and while a client's partner's borrower agreement is off, each with its reason and hint; locked until the status loads.
  - `tests/pages/clients/ClientDetails.agreementTab.test.tsx` (3): includes the in-place switch, which does not fetch the client again.
  - `tests/pages/partners/PartnerProfile.agreementTab.test.tsx` (3): includes the in-place switch, which does not fetch the partner again and stays off after a tab change. Both page tests now answer `GET /common/agreement-sign/required/{userId}`.
- **Updated:** `tests/modules/agreement/services.test.ts` (+2) and `queries.test.tsx` (+4); `tests/components/Common/Modals/AgreementSignModal.test.tsx` (+2: opens after a refresh once required, closes once waived).
- **E2E:** `e2e/agreement-required.spec.ts` (5, mock project): the host excuses a partner, requires a partner again, and sees the switch locked while signing is off and while the partner agreement is off. On the partner's side, the sign modal opens after their next page change, with no full reload. Passed, with `E2E_BASE_URL=` cleared and the built preview. `test-reports/api-calls-mock.ndjson` was restored afterwards.
- **Suite:** full Vitest 2376 passed, 2 expected fail. `npm run typecheck` clean.

## Open items
- **Borrower portal (`client-fch`).** Same fix done there on the same branch: see `client-fch/docs/handoff/2026-11-06-agreement-prompt-follows-host-without-reload.md`.
- **API dependency.** Needs the `fch-api` change, including its migration, from the same branch name.
- **Branch base.** The branch `feature/agreement-required` was cut from `release`, not `stage`.
- **Client portal.** No change: it prompts only when `/check` says `needs_sign`, which the API now answers `false` for an excused client.
