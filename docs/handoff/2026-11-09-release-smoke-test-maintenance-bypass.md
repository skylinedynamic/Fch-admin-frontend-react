# Release smoke test passes while maintenance is on

2026-11-09

## Problem
The stage workflow got a maintenance bypass on 2026-11-05 (`2026-11-05-stage-smoke-test-maintenance-bypass.md`), but the release workflow did not. While `sudo fch-maintenance on` is active on production, Nginx answers 503, so the smoke test against the partner portal (`partner.fourcornerfunding.com/login`) would fail a good deploy.

## Solution
The smoke-test curl sends `X-Maintenance-Bypass` with the value of the new `PROD_MAINTENANCE_BYPASS` secret, the same approach as stage. The workflow still does not turn maintenance on or off.

## Files changed
- `.github/workflows/deploy-release.yml`: the smoke-test step gets an `env` entry `MAINTENANCE_BYPASS: ${{ secrets.PROD_MAINTENANCE_BYPASS }}` and its curl sends `-H "X-Maintenance-Bypass: $MAINTENANCE_BYPASS"`.

## Testing
- No automated tests cover workflows. The edited YAML was parsed successfully.
- Not yet run on GitHub Actions. First check: the next release deploy, with maintenance off and then on.

## Open items
- Add the repository secret `PROD_MAINTENANCE_BYPASS`, with the same value as the production server's Nginx snippets. Without it the header is sent empty and the bypass does not match.
- Confirm the production Nginx snippets are installed. Server setup is a manual runbook, not in this repo.
- **The bypass only takes effect if `PROD_WEB_URL` is set to something other than `https://partner.fourcornerfunding.com/login`.** That URL is both the fallback and the skip condition, so otherwise the smoke test is skipped without checking anything. This existed before this change and is listed in `FCH_PLATFORM_AUDIT_AND_REMEDIATION_PLAN.md` in `fch-api`.
- This curl uses `-L`, so the bypass header would also be sent to any host the URL redirects to. Keep `PROD_WEB_URL` pointing directly at the portal.
