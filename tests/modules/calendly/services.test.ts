import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  bookCalendlyAppointment,
  disconnectCalendly,
  fetchCalendlyAvailableTimes,
  connectCalendly,
  fetchCalendlyEventTypes,
  fetchCalendlyStatus,
  syncCalendly,
} from '../../../src/modules/calendly/services'

afterEach(() => server.resetHandlers())

/** The company Calendly account: /common/calendly/* */
describe('calendly services', () => {
  it('fetchCalendlyStatus unwraps the status', async () => {
    server.use(http.get('*/common/calendly/status', () => HttpResponse.json({ status: true, data: { connected: true, can_manage: true } })))

    await expect(fetchCalendlyStatus()).resolves.toEqual({ connected: true, can_manage: true })
  })

  it('connectCalendly sends your own app keys and returns the Calendly sign-in link', async () => {
    let body: unknown
    server.use(http.post('*/common/calendly/connect', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ status: true, data: { url: 'https://auth.calendly.com/oauth/authorize?x=1' } })
    }))

    await expect(connectCalendly({ client_id: 'id', client_secret: 's', webhook_signing_key: 'k' })).resolves.toBe('https://auth.calendly.com/oauth/authorize?x=1')
    expect(body).toEqual({ client_id: 'id', client_secret: 's', webhook_signing_key: 'k' })
  })

  it('disconnectCalendly DELETEs the connection', async () => {
    let called = false
    server.use(http.delete('*/common/calendly/connection', () => { called = true; return HttpResponse.json({ status: true }) }))

    await disconnectCalendly()
    expect(called).toBe(true)
  })

  it('syncCalendly returns how many meetings were synced', async () => {
    server.use(http.post('*/common/calendly/sync', () => HttpResponse.json({ status: true, data: { synced: 4 } })))

    await expect(syncCalendly()).resolves.toBe(4)
  })

  it('fetchCalendlyEventTypes unwraps the list', async () => {
    server.use(http.get('*/common/calendly/event-types', () => HttpResponse.json({ status: true, data: [{ uri: 'u1', name: '30 Minute Meeting', duration: 30 }] })))

    await expect(fetchCalendlyEventTypes()).resolves.toEqual([{ uri: 'u1', name: '30 Minute Meeting', duration: 30 }])
  })

  it('fetchCalendlyAvailableTimes posts the event type, day and zone', async () => {
    let body: unknown = null
    server.use(http.post('*/common/calendly/available-times', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ status: true, data: [{ start_time: '2026-11-20T15:00:00Z', local_time: '2026-11-20 09:00:00', label: '9:00 AM' }] })
    }))

    const slots = await fetchCalendlyAvailableTimes({ event_type_uri: 'u1', date: '2026-11-20', timezone: 'America/Chicago', assigned_for: 5 })

    expect(body).toEqual({ event_type_uri: 'u1', date: '2026-11-20', timezone: 'America/Chicago', assigned_for: 5 })
    expect(slots).toHaveLength(1)
  })

  it('bookCalendlyAppointment posts the booking', async () => {
    let body: unknown = null
    server.use(http.post('*/common/calendly/book', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ status: true, message: 'Meeting booked in Calendly.', data: { id: 9, is_calendly: true } })
    }))

    const response = await bookCalendlyAppointment({ event_type_uri: 'u1', start_time: '2026-11-20T15:00:00Z', timezone: 'UTC', assigned_for: 5 })

    expect(body).toEqual({ event_type_uri: 'u1', start_time: '2026-11-20T15:00:00Z', timezone: 'UTC', assigned_for: 5 })
    expect(response.data.id).toBe(9)
  })
})
