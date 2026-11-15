# Funding Completed card — header and border match the design

2026-11-15

## Problem
On Funding Application details, a Closed (Completed) application shows the "Funding Completed" summary card (`ClosedApplicationSummary`). It didn't match the other cards:
- **Card shadow:** it set its own heavy shadow (`0 4px 18px`) with no border.
- **Inner border:** the commission lines used Bootstrap's `.border` / `.border-bottom`, which render darker than the theme's light border.
- **Header:** a 10%-alpha mint background that was hard to see.

## Solution
- **Card:** a light shadow only (`0 1px 2px rgba(56, 65, 74, .15)`) and 4px corners. Even the theme's own card shadow read heavy under this card.
- **Header:**
  - the theme's subtle success background (`--vz-success-bg-subtle`);
  - edged on **every side** in `--vz-success-border-subtle`;
  - title in `--vz-success-text-emphasis`, subtitle in body text;
  - a solid success icon and "Completed" badge.
- **Inner boxes** (the host's commission lines and the partner's "Your commission" box): a 1px `--vz-border-color` border, and the same colour between rows.

## Files changed
- `src/pages/applications/funding/components/ClosedApplicationSummary.tsx`: card, header and inner-box styles.

## Testing
- `tests/pages/applications/funding/ClosedApplicationSummary.test.tsx`, new "look" and "header" cases:
  - a light-shadow card;
  - light inner borders;
  - the subtle success header edged on every side.
- **11 passed.** With `FundingApplicationDetails.test.tsx`: 85 passed.
- `npm run typecheck`: clean.
- Checked in the browser (production build, mocked API): screenshot of the host view.

## Open items
- None.
