import { expect, type Locator, type Page, type Route, type Request } from '@playwright/test'

/**
 * Shared Playwright helpers for the admin panel e2e suite.
 *
 * The built app calls the backend at an absolute origin (VITE_API_URL), so
 * every backend call is intercepted here - no live backend is required.
 */
export const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'

export const THEME = {
  favicon: null, favicon_full_url: null,
  primary_color: '#2C6ECB', primary_logo: null, primary_logo_full_url: null,
  secondary_color: '#1A1A1A', secondary_logo: null, secondary_logo_full_url: null,
  sidebar_text_color: null, sidebar_icon_color: null,
  sidebar_text_hover_color: null, sidebar_icon_hover_color: null,
  site_name: 'Four Corner Funding', site_slogan: null,
}

export type SessionUser = {
  id?: number
  name?: string
  email?: string
  user_type?: string
  is_host?: number
  partner_id?: number | null
  permissions?: string[]
  [key: string]: unknown
}

export const HOST_USER: SessionUser = {
  id: 1,
  name: 'Host Admin',
  email: 'host@example.test',
  user_type: 'Admin',
  is_host: 1,
  partner_id: null,
  permissions: [],
}

/** Seeds a persisted Zustand auth session (and the session cookie) before the app boots. */
export async function seedSession(page: Page, user: SessionUser = HOST_USER) {
  const merged = { ...HOST_USER, ...user }
  await page.addInitScript(
    ([u]) => {
      window.localStorage.setItem(
        'auth',
        JSON.stringify({ state: { token: 'e2e-fake-token', user: u, rememberMe: true }, version: 0 })
      )
      document.cookie = 'auth_session_active=true; path=/'
    },
    [merged]
  )
}

export function ok(data: unknown = [], message = 'ok', extra: Record<string, unknown> = {}) {
  return { status: true, message, data, ...extra }
}

/**
 * Mirrors ApiResponse::successWithPagination(Additional) in fch-backend-api:
 * `{status, message, data, meta}` with extras such as `statistics` merged at
 * the top level.
 */
export function paginated<T>(items: T[], extra: Record<string, unknown> = {}) {
  return {
    status: true,
    message: 'ok',
    data: items,
    meta: { total: items.length, current_page: 1, last_page: 1, per_page: 10 },
    ...extra,
  }
}

/**
 * Mirrors ApiResponse::error / BaseApiRequest::failedValidation in
 * fch-backend-api: validation errors carry ONE string per field (the first
 * message, not Laravel's default array) and `message` is the first error.
 * Arrays are accepted for convenience and flattened to that real shape.
 */
export function failure(message: string, errors?: Record<string, string | string[]>) {
  if (!errors) return { status: false, message }
  const flat: Record<string, string> = {}
  for (const [field, value] of Object.entries(errors)) flat[field] = Array.isArray(value) ? value[0] : value
  return { status: false, message: Object.values(flat)[0] ?? message, errors: flat }
}


/**
 * Laravel's stock 422 body, for the endpoints whose request class extends
 * plain FormRequest instead of BaseApiRequest (CMS blog/category/tag/SEO and
 * a few others): no `status` flag and an ARRAY of messages per field.
 */
export function laravelFailure(errors: Record<string, string[]>) {
  return { message: Object.values(errors)[0]?.[0] ?? 'The given data was invalid.', errors }
}

export type Handler = {
  method?: string
  /** substring of the path after /api/v1, or RegExp tested against it */
  match: string | RegExp
  body?: unknown | ((req: Request) => unknown)
  status?: number
}

export type RecordedCall = { method: string; path: string; body: string; json: any }

export type ApiMock = {
  calls: RecordedCall[]
  /** calls matching a method + path fragment */
  find: (method: string, fragment: string | RegExp) => RecordedCall[]
  /** prepend a handler (takes priority over earlier ones) */
  add: (handler: Handler) => void
}

function pathOf(url: string) {
  const u = new URL(url)
  return u.pathname.replace(/^\/api\/v1/, '') + u.search
}

function parseBody(req: Request) {
  const raw = req.postData() || ''
  try { return JSON.parse(raw) } catch { /* multipart or empty */ }
  const fields: Record<string, string> = {}
  const re = /name="([^"]+)"\r?\n\r?\n([^\r\n]*)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw))) fields[m[1]] = m[2]
  return Object.keys(fields).length ? fields : null
}

/**
 * Installs one catch-all handler for the API origin. Handlers are matched in
 * reverse registration order (latest wins); anything unmatched gets a harmless
 * `{status:true,data:[]}` so heavy pages boot without hard network failures.
 */
export async function mockApi(page: Page, handlers: Handler[] = []): Promise<ApiMock> {
  const list: Handler[] = [
    { match: '/common/partner-theme', body: ok({ ...THEME, branding: THEME }) },
    ...handlers,
  ]
  const calls: RecordedCall[] = []

  await page.route(`${API_ORIGIN}/**`, async (route: Route) => {
    const req = route.request()
    const method = req.method()
    if (method === 'OPTIONS') return route.fulfill({ status: 204 })
    const path = pathOf(req.url())
    calls.push({ method, path, body: req.postData() || '', json: parseBody(req) })

    for (let i = list.length - 1; i >= 0; i--) {
      const h = list[i]
      if (h.method && h.method.toUpperCase() !== method) continue
      const hit = typeof h.match === 'string' ? path.includes(h.match) : h.match.test(path)
      if (!hit) continue
      const body = typeof h.body === 'function' ? (h.body as (r: Request) => unknown)(req) : h.body
      return route.fulfill({ status: h.status ?? 200, json: body ?? ok([]) })
    }
    return route.fulfill({ json: ok([]) })
  })

  return {
    calls,
    find: (method, fragment) =>
      calls.filter(
        (c) =>
          c.method === method.toUpperCase() &&
          (typeof fragment === 'string' ? c.path.includes(fragment) : fragment.test(c.path))
      ),
    add: (h) => { list.push(h) },
  }
}

/** Waits until at least one matching call was recorded and returns it. */
export async function expectCall(api: ApiMock, method: string, fragment: string | RegExp) {
  await expect.poll(() => api.find(method, fragment).length, { timeout: 10_000 }).toBeGreaterThan(0)
  return api.find(method, fragment)[0]
}

/** Confirms the shared DeleteConfirmationModal ("Yes, Delete It"). */
export async function confirmDelete(page: Page) {
  const dialog = page.locator('.modal.show').filter({ hasText: 'Are you sure?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Yes, Delete It' }).click()
}

/** Dismisses the shared DeleteConfirmationModal with "Close". */
export async function cancelDelete(page: Page) {
  const dialog = page.locator('.modal.show').filter({ hasText: 'Are you sure?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Close' }).click()
  await expect(dialog).toBeHidden()
}

/** Ticks the checkbox of the n-th row of a PrimeReact DataTable. */
export async function selectRow(page: Page, index = 0) {
  await page.locator('.p-datatable-tbody .p-checkbox').nth(index).click()
}

/** Opens the split "Actions" dropdown that list pages show once rows are selected. */
export async function openActionsMenu(page: Page) {
  await page.locator('.dropdown-toggle-split').first().click()
}

/** Picks an option in a PrimeReact <Dropdown> identified by its container locator. */
export async function pickPrime(page: Page, dropdown: Locator, optionName: string | RegExp) {
  await dropdown.click()
  await page.locator('.p-dropdown-panel').getByRole('option', { name: optionName }).first().click()
}
