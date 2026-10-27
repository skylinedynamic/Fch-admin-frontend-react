# 2026-10-27 — Login footer without a brand name (BUG-118)

| | |
|---|---|
| **Problem** | QA defect log BUG-118 (OP-PART-35): the login page of a new Certified partner's subdomain read "(c) 2026 . All rights reserved." for about an hour. |
| **Solution** | The API: a partner domain's cached owner is now cleared when it changes (fch-api `docs/handoff/2026-10-27-partner-domain-cache-cleared-on-change.md`). The portal: the footer leaves out the name, not just the text, when the branding has none. |
| **Files** | `src/components/Layout/Auth.jsx`, `tests/components/Layout/AuthFooter.test.tsx`, `e2e/auth/auth.spec.ts` |

## 2026-10-27 — Footer leaves no gap without a name

**Problem:** `Auth.jsx` printed `© {year} {siteName}. All rights reserved.` even when `siteName` was missing: the branding request failed, or the domain resolved to no partner. The result was "(c) 2026 . All rights reserved."

**Solution:** the name and its leading space are printed only when there is a name. Without one the footer reads "(c) 2026. All rights reserved."

**Files:** `src/components/Layout/Auth.jsx`.

**Tests added:**
- `tests/components/Layout/AuthFooter.test.tsx` (integration, the real `SignIn` page with branding through MSW): with a name; with a `null` or `''` name; with a failed branding request. The 3 no-name cases failed first; the named case passed throughout.
- `e2e/auth/auth.spec.ts`, 2 tests: footer with a name; footer when branding fails (500). The failure case failed on the old code (source stashed and rebuilt) and passes after.

**Verified:** full Vitest suite 263 files, 1842 passed (+2 expected fail). `npm run typecheck` clean. `e2e/auth` (mock, `--workers=1`) 23 passed.

**Status:** done, not committed.

## Pending
- Re-test BUG-118 on stage after the fch-api change is deployed.
