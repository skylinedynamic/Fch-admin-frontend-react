import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { fetchReminders } from '../../../src/modules/reminders'

afterEach(() => server.resetHandlers())

describe('fetchReminders', () => {
  it('posts the filters in the request body and returns the paginated list', async () => {
    let method: string | null = null
    let body: unknown = null
    server.use(
      http.post('*/common/reminders/fetch-reminders', async ({ request }) => {
        method = request.method
        body = await request.json()
        return HttpResponse.json({
          status: true,
          data: { reminders: { data: [{ id: 1, summary: 'Call Jane' }], meta: { total: 7 } } },
        })
      })
    )

    const result = await fetchReminders({ status: 'dismissable', per_page: 1 })

    expect(method).toBe('POST')
    expect(body).toEqual({ status: 'dismissable', per_page: 1 })
    expect(result.data.map((r) => r.id)).toEqual([1])
    expect(result.total).toBe(7)
  })

  it('leaves out filters that are not set', async () => {
    let body: unknown = null
    server.use(
      http.post('*/common/reminders/fetch-reminders', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ status: true, data: { reminders: { data: [], meta: { total: 0 } } } })
      })
    )

    await fetchReminders({ page: 2, per_page: 10, search: '', reference_type: undefined, status: '' })

    expect(body).toEqual({ page: 2, per_page: 10 })
  })
})
