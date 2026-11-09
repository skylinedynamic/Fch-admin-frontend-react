# Go to Client on Pre-Qualification and Funding Application details

2026-11-09

## Problem

Funding Request Details has a **Go to Client** button, but Pre-Qualification Details (`/intake-review/pre-qualification/:id`) and Funding Application Details (`/intake-review/funding-application/:id`) did not. Staff had to find the client from the Clients list.

## Solution

Added the same button (primary, user icon, first in the header actions) to both pages. It opens `/clients/<borrower_id>`.

It shows whatever the viewer's permissions, like Funding Request Details. It is hidden only when the record has no client: `borrower_id` is nullable on both tables, and the API sends it as is.

The Pre-Qualification header now also wraps (`page-actions-wrap flex-wrap`), because it can hold three buttons.

## Files changed

- `src/pages/applications/pre-qualification/PreQualificationDetails.tsx`: the button; header actions wrap
- `src/pages/applications/funding/FundingApplicationDetails.tsx`: the button
- `src/modules/application/types.ts`: `borrower_id` is `number | null` on both detail types, matching the API
- `tests/pages/applications/pre-qualification/PreQualificationDetails.goToClient.test.tsx`: new
- `tests/pages/applications/funding/FundingApplicationDetails.test.tsx`: new Go to Client block
- `e2e/sidebar/intake-review/pre-qualification/pre-qualification.spec.ts`: new Go to Client block
- `e2e/sidebar/intake-review/funding-application/funding-application-details-r2.spec.ts`: new Go to Client block

## Testing

RESULTS_PLACEHOLDER

## Open items

- `/clients/:id` still requires `view clients`, so a user without it who clicks the button lands back on the dashboard. The same is true on Funding Request Details. The button stays visible by request.
