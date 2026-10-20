# End-to-end tests

One Playwright tree, laid out like `fch-borrower-react/e2e` — **one folder per sidebar menu item**:

```
e2e/
  auth.setup.ts                 real login as the host, once, for the live specs
  auth/                         login, forgot / reset password (guest)
  sidebar/
    menu/                       the sidebar itself + the persona access matrix
    dashboard/  partners/  leads/  clients/
    intake-review/{pre-qualification,funding-request,funding-application,change-requests,credit-profile-requests}/
    capital-access/  lenders/  funding-sequence/
    credit-builder/{manage-tier,verification-center,credit-accounts}/
    commissions/  invoices/  payments/  subscriptions/  upcoming-billings/
    appointments/  task-reminders/  notification/  resources/
    employees/  users/  payment-method/  plan-fee/  roles-permissions/
    cms/{site-settings,blogs,seo-settings}/
    embedded-form/{configuration,loan-applications}/
    settings/
  topbar/{profile,contacts,my-subscription,notification-bell,logout,menu}/
  support/
    helpers.ts                  mock API, session seeding, response builders
    routes.ts, navigation.ts    the route-guard table the access matrix reads
    apiCallLog.ts               which endpoints a run reached
    live/env.ts, live/fixtures.ts   real-API settings and helpers
  fixtures/personaProfiles.ts   permission snapshots of the six personas
```

Detail, create and edit pages opened from a menu screen live in that menu's folder
(e.g. `sidebar/commissions/commission-details.spec.ts`).

## Two kinds of spec

| File | Runs against | Command |
|---|---|---|
| `<name>.spec.ts` | **mocked API** — every call is intercepted, no backend needed | `npm run test:e2e` |
| `<name>.live.spec.ts` | **the real local `fch-backend-api` and database** | `npm run test:e2e:live` |

Extra arguments go to Playwright: `npm run test:e2e -- e2e/sidebar/users -g "bulk delete"`.

Both run the **production build** served by `npm run preview` on `:4174` (run `npm run build`
first), unless `E2E_BASE_URL` points at an app that is already served, such as the dev server on
`:5174`. Settings come from the environment or the git-ignored `.env.e2e` (see `.env.e2e.example`).
`npm run typecheck:e2e` type-checks the tree.

### Mocked specs

- `seedSession(page, user)` signs a user in by seeding the persisted auth store. Route guards
  read permissions straight off that user, so grant exactly what the test needs.
- `mockApi(page, handlers)` answers API calls and records them: `api.find('POST', '/path')`,
  `expectCall(api, 'POST', '/path')`. Unmatched calls get a harmless `{status:true,data:[]}`.
- Response builders mirror `fch-backend-api`: `ok()` / `paginated()`, `failure()` (one string per
  field), `laravelFailure()` (an array per field, plain `FormRequest`).
- Response bodies are hand-written, so keep them to the real shape — the live specs are what
  catch a mock the real API would never send.
- A test marked `test.fail()` documents a known bug; remove the marker when the bug is fixed.
- They run in parallel (`50%` of the cores); the full suite takes about 10 minutes.

### Live specs (real API)

Like the borrower suite:

1. Start MySQL and the API (`php artisan serve` in `fch-backend-api`, `http://127.0.0.1:8000`).
   The build must point at the same API (`VITE_API_URL`) as `E2E_API_URL`.
2. Put the host account in `.env.e2e`: `E2E_HOST_EMAIL`, `E2E_HOST_PASSWORD` (locally:
   `craig.rice@fourcornerfunding.com`).
3. `npm run test:e2e:live`

- `auth.setup.ts` logs in once through the login page and saves the session to `e2e/.auth/host.json`.
- `support/live/fixtures.ts` fails a test on any **5xx API response or uncaught page error**.
- Every screen is opened by **clicking its sidebar item** (`openFromSidebar`), checking the URL and
  the active highlight. List screens share `listScreenTests()`: heading and columns, a search
  with no match empties the table and clearing it restores the rows, the first row opens its
  details.
- They run one at a time: `php artisan serve` answers one request at a time.
- They are read-only. Login with a wrong password uses an address that does not exist, so runs
  cannot lock the real account; logout logs in a separate session first.

## Results page and API coverage

`npm run test:report` builds `test-reports/verification-report.html` from the mocked suite's
JSON results (`PLAYWRIGHT_JSON_OUTPUT_NAME=test-reports/e2e-mock.json npm run test:e2e -- --reporter=json`)
and the Vitest results (`npx vitest run --reporter=json --outputFile=test-reports/vitest.json`).
Live results are in the Playwright HTML report (`npx playwright show-report`).

`node e2e/api-coverage.mjs` lists every endpoint `src/` calls and whether the mocked e2e specs
or the unit/feature tests reach it.
