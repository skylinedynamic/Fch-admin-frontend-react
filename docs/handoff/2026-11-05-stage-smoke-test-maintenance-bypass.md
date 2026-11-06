# Stage smoke test passes while maintenance is on

2026-11-05

## Problem
Maintenance mode is now switched on and off by hand on the stage server (`sudo fch-maintenance on|off`); while it is on, Nginx answers 503 with the maintenance page. A deploy run during maintenance made the post-deploy smoke test against the partner portal (`admin.skylinedynamic.dev/login`) get 503 instead of 200, so the workflow went red even when the deploy itself was fine.

## Solution
The smoke-test curl sends `X-Maintenance-Bypass` with the value of the new `STAGE_MAINTENANCE_BYPASS` secret. The server's Nginx maintenance snippet lets a request with that header through to the real app, so the smoke test checks the new build while users still see the maintenance page.

The workflow does not turn maintenance on or off; that stays a manual step on the server. Release workflows are unchanged.

## Files changed
- `.github/workflows/deploy-stage.yml`: the smoke-test step gets an `env` entry `MAINTENANCE_BYPASS: ${{ secrets.STAGE_MAINTENANCE_BYPASS }}` and its curl sends `-H "X-Maintenance-Bypass: $MAINTENANCE_BYPASS"`.

## Testing
- No automated tests cover workflows; the edited step was checked by eye for YAML indentation.
- Not yet run on GitHub Actions. First check: the next stage deploy, with maintenance off (smoke test 200 as before) and with maintenance on (smoke test still 200 through the bypass).

## Open items
- Add the repository secret `STAGE_MAINTENANCE_BYPASS` (same value as in the stage server's Nginx snippets). Without it the header is sent empty, does not match, and the smoke test fails while maintenance is on (it still passes while maintenance is off).
- Server setup for maintenance mode is a manual runbook, not in this repo.
