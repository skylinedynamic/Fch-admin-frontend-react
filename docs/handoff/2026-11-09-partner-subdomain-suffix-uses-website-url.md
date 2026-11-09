# Partner subdomain suffix uses the website URL

2026-11-09

## Problem

The Partner Subdomain field on `/partners/create` and on a certified partner's edit form showed `.partner.fourcornerfunding.com`, taken from `VITE_BASE_URL`. The API saves the domain as `<subdomain>.<BASE_WEBSITE>` (`PartnerService`, `StorePartnerRequest`), so the form showed a different address from the one saved. The "Partner portal url be like" hint beside Company Name had the same problem.

## Solution

All four places now use one helper, `partnerPortalBaseHost()`, which reads the host from `VITE_WEBSITE_URL`. If that is empty, it uses the current page's host, as the old code did when `VITE_BASE_URL` was empty. It removes the scheme and path the way the API does, so a bare value such as `fourcornerfunding.com` also works.

## Files changed

- `src/modules/partner/logic.ts`: new `partnerPortalBaseHost`
- `src/pages/partners/components/PartnerInformationSection.jsx`: the field suffixes and the hint use it. Still `.jsx`; converting it was out of scope.
- `.env.example`: documents `VITE_WEBSITE_URL`
- `tests/modules/partner/logic.test.ts`: helper cases
- `tests/pages/partners/components/PartnerInformationSection.domainSuffix.test.tsx`: new; create, edit and hint
- `e2e/sidebar/partners/partner-profile.spec.ts`: new create-form spec

## Testing

RESULTS_PLACEHOLDER

## Open items

- `VITE_WEBSITE_URL` must be set in each deployed build and match `BASE_WEBSITE` in `fch-api`. The deploy workflows do not mention it, so its stage and production values were not checked. If it is empty, the form falls back to the page's host.
- Partners already saved keep their stored domain. This change only affects what the form displays.
