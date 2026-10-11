# End-to-end tests

Two Playwright suites. Pick one at run time.

| Command | Suite | Needs |
|---|---|---|
| `npm run test:e2e` | **mock** (`e2e/`) | nothing but a build |
| `npm run test:e2e:live` | **live** (`e2e-live/`) | the real API + a login |
| `npm run test:e2e:all` | both, mock first | as above |
| `npm run test:e2e:ui` | mock, in Playwright's UI | nothing but a build |

Extra arguments go to Playwright: `npm run test:e2e -- e2e/users.spec.ts -g "bulk delete"`.

The mode is the `E2E_MODE` environment variable (`mock` | `live` | `all`, default `mock`); the
npm scripts set it through `e2e/run.mjs` so they work the same on Windows and POSIX. In CI you
can set it directly: `E2E_MODE=live npx playwright test`.

`npm run typecheck:e2e` type-checks both suites (they are outside the app's `tsconfig.json`).

Both suites run the **production build** (`npm run build` first), served by `npm run preview`
on port 4174.

## Mock suite (`e2e/`)

Every request to the API is intercepted by `mockApi()` in `helpers.ts`, so no backend is needed
and error cases (500s, validation failures, permission combinations) are easy to force.

- `seedSession(page, user)` signs a user in by seeding the persisted auth store. Route guards
  read permissions straight off that user, so grant exactly what the test needs.
- `mockApi(page, handlers)` answers API calls and records them: `api.find('POST', '/path')`,
  `expectCall(api, 'POST', '/path')`. Unmatched calls get a harmless `{status:true,data:[]}`.
- Response builders mirror `fch-backend-api`:
  - `ok()` / `paginated()` - `ApiResponse::success` / `successWithPagination`
  - `failure()` - `BaseApiRequest::failedValidation`: **one string per field**
  - `laravelFailure()` - plain `FormRequest` (CMS blog/category/tag/SEO): **an array per field**

URLs and payloads are asserted against what the app really sends. Response bodies are
hand-written; the live suite's `contract.spec.ts` is what keeps those shapes true.

A test marked `test.fail()` documents a known application bug. It passes while the bug exists
and starts failing once the bug is fixed - remove the marker then.

## Live suite (`e2e-live/`)

Talks to the real `fch-backend-api`.

1. Copy `.env.e2e.example` to `.env.e2e` and fill in the accounts (see *Personas* below). The host account alone is enough for everything except the access matrix.
2. Start the API and make sure the build points at it (`VITE_API_URL` is baked in at build time,
   so rebuild after changing it). `E2E_API_URL` must be the same URL.
3. `npm run test:e2e:live`

What it covers:

- `auth.setup.ts` - one real login per configured persona; the sessions are reused by the other specs.
- `auth.spec.ts` - wrong password, empty submit, signed-out redirect.
- `smoke.spec.ts` - every list screen loads real data with no 5xx along the way.
- `contract.spec.ts` - the response shapes the mocked suite assumes (read-only).
- `contacts.crud.spec.ts` - create -> search -> edit -> delete through the UI.
- `persona-access.spec.ts` - the access matrix: every persona x every screen (see below).

Safety:

- Without credentials every live test **skips** with a message; nothing fails.
- Screens the account cannot open are skipped, not failed.
- Anything that writes runs only with `E2E_LIVE_ALLOW_WRITES=1`. Use that only against a
  disposable database - never stage or production. Write specs clean up after themselves.
- `.env.e2e` and `e2e-live/.auth/` are git-ignored.

### Personas

Six kinds of account use the panel. Each has its own pair of variables in `.env.e2e`; any left blank is skipped.

| Persona | Variables | Must be |
|---|---|---|
| Host | `E2E_HOST_*` | `is_host`, the partner account itself |
| White-label partner | `E2E_WL_PARTNER_*` | non-host partner account, type White-Label |
| Certified partner | `E2E_CERTIFIED_PARTNER_*` | non-host partner account, type Certified |
| Host user | `E2E_HOST_USER_*` | an employee of the host |
| White-label partner user | `E2E_WL_USER_*` | an employee of a white-label partner |
| Certified partner user | `E2E_CERTIFIED_USER_*` | an employee of a certified partner |

`persona-access.spec.ts` first checks that each account really is that persona, then for every screen in `routes.ts`:

1. works out what the route guards in `App.jsx` must do for that account, from the permissions the API actually gave it, and checks the router does exactly that (opens it, shows access-denied, or sends the user home);
2. for a screen the account may open: it renders, nothing returns 5xx, and the API does not refuse the screen's own list call;
3. for a screen the UI blocks: whether the API blocks it too. An API that still answers is not a test failure (some reads are legitimately shared) but is written to `e2e-live/.results/access-findings.json` for review - hiding a screen is not access control.

The mocked suite runs the same matrix (`e2e/persona-access.spec.ts`) from a snapshot of those permission profiles in `e2e/fixtures/personaProfiles.ts`, plus hand-written rules such as "the website CMS is host-only". Refresh the snapshot when roles or permissions are re-seeded.

When a route is added to `App.jsx`, add it to `e2e-live/routes.ts`; both matrices pick it up.

### A disposable backend for write tests

In `fch-backend-api`, point a separate env file at an empty database, then:

```
php artisan migrate:fresh --seed --env=e2e
php artisan serve --env=e2e --port=8001
```

Build this app with `VITE_API_URL=http://127.0.0.1:8001/api/v1`, set `E2E_API_URL` to the same
value and `E2E_LIVE_ALLOW_WRITES=1`.
