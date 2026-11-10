# BUG-190: public form step errors (live E2E)

**Date:** 2026-11-06

## Problem
On the public application form, typing a bad value (a 4-digit ZIP) and clicking Continue straight away showed only that field's error. The other empty required fields showed nothing until a second click.

## Solution
The fix is in fch-api's Blade form (`docs/handoff/2026-11-06-bug-190-public-form-continue-click.md`). Leaving the field drew its message, which pushed Continue down before the mouse was released, so the click was lost. The buttons now keep the focus until the click lands.

This repo adds the live check.

## Files changed
- `e2e/sidebar/embedded-form/public-form/step-errors.live.spec.ts` (new). It reads the host's public key from Embedded Form → Configuration, opens `http://127.0.0.1:8000/form/<key>`, types `1234` in the ZIP field and clicks Continue straight away. It then expects:
  - the ZIP message
  - "This field is required."
  - more than 5 invalid fields

## Testing
- Before the fch-api fix: failed. After: passed.
- `E2E_BASE_URL=http://localhost:5174 npx playwright test --project=live e2e/sidebar/embedded-form/`: 6/6 passed.

## Open items
- The form URL is fixed to the local API origin (`127.0.0.1:8000`), like the other live specs' API.
- Not committed.
