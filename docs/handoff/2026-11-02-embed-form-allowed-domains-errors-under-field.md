# 2026-11-02 — Embedded Form: Allowed Domains take a bare host, and refusals show under the field (BUG-035, round 2)

## At a glance

| | |
|---|---|
| **Problem** | R2-OP-EMB-01: the domain box was a URL field, so `x.com` left in it blocked Save with the browser's "Please enter a URL.". A repeat was only toasted and left in the box. The API's 422 ("The allowed_domains.2 field must be a valid URL.") was shown nowhere on the form. |
| **Solution** | A plain text box (`yourwebsite.com`). A repeat is named under the field. Each entry the API refuses (`allowed_domains.<index>`) is named under the field with its chip marked red; no toast. After saving, the list shows what the API stored (bare hosts; fch-api handoff, same date). |
| **Changed** | `src/pages/embed-form/EmbedFormSettings.tsx`, tests (below). |

## 2026-11-02 — Allowed Domains

### Problem
See the table. The API side (normalising, refusing wildcards, localhost, non-domains and repeats) is in `fch-api/docs/handoff/2026-11-02-embed-form-allowed-domains-normalised.md`.

### Solution
- **The domain box:** `type="text"` (was `url`), placeholder `yourwebsite.com`. It turns invalid while a repeat is shown.
- **`handleAddDomain`:** a repeat (case-insensitive, trimmed) shows `"<entry>" is already in the list.` under the field, and the text stays in the box to edit. It is no longer `toast.warning`. The API refuses repeats however they are typed; this only catches the same text.
- **`handleSave`:** `domainRefusals()` picks the `allowed_domains.<index>` errors.
  - Those entries' chips get `allowed-domain-chip--refused` (danger colours, a warning icon instead of the shield), and each message is listed under the chips.
  - Other failures still toast as before.
  - The class is not `.is-invalid`: the theme draws its own warning icon on that class, which overlapped the chip's icon (seen in the browser).
- **Adding or removing a domain** clears the save refusals, because their indexes no longer hold.

### Files
- `src/pages/embed-form/EmbedFormSettings.tsx`.
- `tests/pages/embed-form/EmbedFormSettings.allowedDomains.test.tsx`: new, 5 integration tests (text box takes `x.com`; a repeat under the field with no toast; an API refusal under the field with its chip marked and no toast; removing it clears the message; after saving the list shows what the API stored). All failed first.
- `e2e/sidebar/embedded-form/configuration/configuration.spec.ts`:
  - placeholder updated;
  - "a duplicate domain is refused with a warning" is now "…under the field", asserting no toast;
  - +2: a bare host saved; an API refusal named under the field.

### Verified
- Vitest (new file): 5 passed. `npm run typecheck`: clean.
- E2E `configuration.spec.ts` (dev server :5174, `--workers=2`): 16 passed.
- Looked at in Chromium: the repeat message under the box, and the refused chip red with a single warning icon and its message underneath.

### Status
Done. QA sheet BUG-035 → Fixed in build, pending stage retest.

## Still pending
- `EmbedFormSettings` calls the module's services directly, not query hooks. That predates this change.
- ~~`notification_email` in the config type~~: removed from `src/modules/embed-form/services.ts` (same day). The API dropped the setting and its column (fch-api handoff). `npm run typecheck`: clean.
