import type { ReactElement } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { renderWithProviders } from '../test-utils'
import { useAuthStore } from '../../src/store/auth'

/**
 * Shared plumbing for route-level (feature) tests: sign a user in, mount one
 * page inside a router, and answer its API calls.
 */

export type TestUser = {
  id?: number
  name?: string
  is_host?: number | boolean
  entity_type?: string
  partner_id?: number | null
  partner_type?: string
  role_name?: string
  permissions?: string[]
  [key: string]: unknown
}

/** Puts a user in the auth store. Guards and usePermissions read it from there. */
export function signIn(user: TestUser = {}) {
  useAuthStore.setState({
    token: 'test-token',
    user: { id: 1, name: 'Host Admin', is_host: 1, entity_type: 'Partner', partner_id: 1, permissions: [], ...user },
  } as never)
}

export function signOut() {
  useAuthStore.setState({ token: null, user: null } as never)
}

/** Shows where the router ended up, so navigation can be asserted. */
function Landing({ name }: { name: string }) {
  const location = useLocation()
  return (
    <div data-testid="landing">
      {name}:{location.pathname}
      {location.search}
    </div>
  )
}

/**
 * Mounts `element` at `path` and visits `route`. Every other URL renders a
 * marker (`landing`) with the path it received, so "navigates to X" is a
 * text assertion instead of a second real page.
 */
export function renderPage(element: ReactElement, { path, route }: { path: string; route?: string }) {
  return renderWithProviders(
    <Routes>
      <Route path={path} element={element} />
      <Route path="*" element={<Landing name="navigated" />} />
    </Routes>,
    { route: route ?? path }
  )
}

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'
export type Seen = { calls: number; bodies: any[]; urls: string[] }

async function readBody(request: Request) {
  const type = request.headers.get('content-type') || ''
  if (type.includes('application/json')) return request.clone().json().catch(() => null)
  if (type.includes('multipart/form-data')) {
    const form = await request.clone().formData().catch(() => null)
    if (!form) return null
    const fields: Record<string, unknown> = {}
    form.forEach((value, key) => { fields[key] = value })
    return fields
  }
  return null
}

/** Answers one endpoint and records the requests it received. */
export function api(method: Method, path: string, body: unknown = { status: true, message: 'ok', data: [] }, status = 200): Seen {
  const seen: Seen = { calls: 0, bodies: [], urls: [] }
  server.use(
    http[method](`*${path}`, async ({ request }) => {
      seen.calls += 1
      seen.urls.push(request.url)
      if (method !== 'get') seen.bodies.push(await readBody(request))
      return HttpResponse.json(body as never, { status })
    })
  )
  return seen
}

/**
 * Heavy pages fire a dozen background calls (lookups, stats, notifications).
 * Call this FIRST in a test: it answers anything not stubbed afterwards with a
 * harmless empty success, so a test only spells out the calls it is about.
 * (MSW checks the most recently added handler first.)
 */
export function allowBackgroundCalls() {
  server.use(http.all('*', () => HttpResponse.json({ status: true, message: 'ok', data: [] })))
}

export const paginated = <T,>(rows: T[], extra: Record<string, unknown> = {}) => ({
  status: true,
  message: 'ok',
  data: rows,
  meta: { total: rows.length, current_page: 1, last_page: 1, per_page: 10 },
  ...extra,
})

/** BaseApiRequest validation failure: one string per field. */
export const invalid = (errors: Record<string, string>) => ({
  status: false,
  message: Object.values(errors)[0] ?? 'Validation Error',
  errors,
})
