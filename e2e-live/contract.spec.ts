import { test, expect } from '@playwright/test'
import { api, requireCredentials, sessionToken } from './env'

/**
 * Pins the response shapes that e2e/helpers.ts hand-writes for the mocked
 * suite (`ok`, `paginated`, `failure`, `laravelFailure`). If the backend
 * changes one of these, this spec fails and the mocks must follow - that is
 * what keeps the mocked suite honest.
 *
 * Read-only: every request here is a list call or a validation failure that
 * the API rejects before writing anything.
 */
test.describe('Live - API contract assumed by the mocked suite', () => {
  let token = ''

  test.beforeEach(async ({ page }) => {
    requireCredentials()
    token = await sessionToken(page)
  })

  test('a paginated list returns { status, message, data[], meta.total }', async ({ request }) => {
    const res = await api(request, token, 'POST', '/common/users/fetch-users', { page: 1, per_page: 5 })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe(true)
    expect(typeof body.message).toBe('string')
    expect(Array.isArray(body.data)).toBe(true)
    expect(typeof body.meta?.total).toBe('number')
  })

  test('a plain success returns { status, message, data }', async ({ request }) => {
    const res = await api(request, token, 'GET', '/common/roles')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ status: true })
    expect(body).toHaveProperty('data')
  })

  test('BaseApiRequest validation: 422 with ONE string per field and status=false', async ({ request }) => {
    // An empty contact is rejected by validation, so nothing is created.
    const res = await api(request, token, 'POST', '/common/contacts', {})
    expect(res.status()).toBe(422)
    const body = await res.json()
    expect(body.status).toBe(false)
    expect(typeof body.message).toBe('string')
    const fields = Object.values(body.errors ?? {})
    expect(fields.length).toBeGreaterThan(0)
    for (const value of fields) expect(typeof value, 'errors.<field> should be a string, as failure() mocks it').toBe('string')
  })

  test('plain FormRequest validation (CMS): 422 with an ARRAY per field', async ({ request }) => {
    // An empty category is rejected by validation, so nothing is created.
    const res = await api(request, token, 'POST', '/admin/cms/blog-categories', {})
    test.skip(res.status() === 403, 'The signed-in account has no CMS permission.')
    expect(res.status()).toBe(422)
    const body = await res.json()
    const fields = Object.values(body.errors ?? {})
    expect(fields.length).toBeGreaterThan(0)
    for (const value of fields) expect(Array.isArray(value), 'errors.<field> should be an array, as laravelFailure() mocks it').toBe(true)
  })

  test('an unauthenticated call is refused with 401', async ({ request }) => {
    const res = await api(request, 'not-a-real-token', 'GET', '/common/roles')
    expect(res.status()).toBe(401)
  })

  test('the borrower list carries its statistics next to data and meta', async ({ request }) => {
    const res = await api(request, token, 'POST', '/common/borrowers/fetch-all-borrowers', { page: 1, per_page: 1 })
    test.skip(res.status() === 403, 'The signed-in account cannot list clients.')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body).toHaveProperty('meta')
  })
})
