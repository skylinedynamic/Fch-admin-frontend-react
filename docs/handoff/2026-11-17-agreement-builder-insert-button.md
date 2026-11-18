# Agreement Builder: the + between blocks didn't insert

2026-11-17

## Problem
Settings › Agreement Builder › Edit Agreement. Hovering the gap between two blocks (e.g. under the intro paragraph, above THE COMPANY) showed the dashed line and the round **+** button, but clicking the + did nothing. No block could be added between two sections that way.

There were two stacking bugs in `assets/css/agreement-builder.css`:
1. An earlier fix made the insert line float over the gap (`.ab4-iz-line { position: absolute; transform: translateY(-50%) }`). The `transform` makes the line its own stacking context, so the button's `z-index: 2` only applied inside it. The gap's invisible hover area (`.ab4-iz::after`, `z-index: 1`, ±8px) then sat above the whole line and took the click.
2. Every gap stacks at `z-index: 10`, so gaps later in the page painted over the open block picker. Clicking an item such as "Heading" was swallowed the same way.

## Solution
CSS only, placed right after the rule that caused it:
- `.ab4-iz-line { z-index: 2; pointer-events: none; }` puts the line above the hover area. Clicks beside the button pass through to the gap, which keeps the hover alive.
- `.ab4-iz-btn, .ab4-iz-picker { pointer-events: auto; }` so the button and picker take clicks.
- `.ab4-iz.ab4-iz--active { z-index: 11; }` lifts the open gap and its picker above the gaps after it.

## Files changed
- `assets/css/agreement-builder.css`: the three rules above.
- `tests/assets/css/agreementBuilderInsertButton.test.ts` (new): line above the hover area, pointer-events, active gap above the others.
- `e2e/sidebar/settings/agreement-builder.spec.ts`: new test "adds a section between two blocks from the + between them". It hovers the gap under the intro, clicks +, picks Heading, saves, and checks the heading lands between the intro and THE COMPANY.

## Testing
- New CSS unit test: red (3 failing assertions across the two bugs), then green, 3/3.
- New E2E test: red before the fix (`.ab4-iz intercepts pointer events` on the +, then on the picker item), green after.
- `agreement-builder.spec.ts`: 15/15 passed (`--workers=1`, fresh build on `vite preview` :4174).
- Vitest `tests/assets/css` + `tests/pages/settings/components/AgreementBuilder`: 20 files / 192 tests passed. `npm run typecheck` clean.

## Open items
- There is no one-click "Section" block (Heading + Text). A section is still two inserts.
- The + is hidden until the gap is hovered, so it's easy to miss. Consider a faint always-visible marker.
- Running the spec with several workers on this machine timed out at `page.goto` for unrelated tests (load, not this change). The full run was done with one worker.
