import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  bulkDismissReminders,
  dismissAllReminders,
  dismissReminder,
  fetchDueReminders,
  snoozeReminder,
} from '../../../src/modules/reminders'

describe('reminders services', () => {
  let calls: Array<{ method: string; path: string; body: unknown }>

  beforeEach(() => {
    calls = []
    const record = (method: string) => async ({ request }: { request: Request }) => {
      const body = method === 'GET' ? null : await request.text().then((t) => (t ? JSON.parse(t) : null))
      calls.push({ method, path: new URL(request.url).pathname, body })
      return HttpResponse.json({ status: true, message: 'ok', data: { reminders: [{ id: 1 }], count: 2 } })
    }
    server.use(
      http.get('*/common/reminders/due', record('GET')),
      http.post('*/common/reminders/:id/dismiss', record('POST')),
      http.post('*/common/reminders/dismiss-all', record('POST')),
      http.post('*/common/reminders/bulk-dismiss', record('POST')),
      http.post('*/common/reminders/:id/snooze', record('POST'))
    )
  })

  it('returns the due reminders list itself', async () => {
    expect(await fetchDueReminders()).toEqual([{ id: 1 }])
  })

  it('posts to the dismiss, dismiss-all and bulk-dismiss endpoints and returns the API body', async () => {
    expect((await dismissReminder(9)).message).toBe('ok')
    expect((await dismissAllReminders()).data.count).toBe(2)
    await bulkDismissReminders([3, 4])

    expect(calls.map((c) => c.path)).toEqual([
      expect.stringMatching(/\/common\/reminders\/9\/dismiss$/),
      expect.stringMatching(/\/common\/reminders\/dismiss-all$/),
      expect.stringMatching(/\/common\/reminders\/bulk-dismiss$/),
    ])
    expect(calls[2].body).toEqual({ ids: [3, 4] })
  })

  it('sends a snooze or a reschedule as given', async () => {
    await snoozeReminder(9, { minutes: 30, note: null })
    await snoozeReminder(9, { reschedule_at: '2030-11-05 14:00:00', lead_minutes: 30, note: 'Friday' })

    expect(calls[0].body).toEqual({ minutes: 30, note: null })
    expect(calls[1].body).toEqual({ reschedule_at: '2030-11-05 14:00:00', lead_minutes: 30, note: 'Friday' })
  })
})
