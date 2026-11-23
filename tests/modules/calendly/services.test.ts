import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import {
  addAppointmentToCalendly,
  completeCalendlyConnection,
  connectCalendly,
  disconnectCalendly,
  fetchCalendlyAvailableTimes,
  fetchCalendlyBookingOptions,
  fetchCalendlyConnection,
  applyCalendlySync,
  fetchCalendlySyncPreview,
} from '../../../src/modules/calendly/services'
import { CALENDLY_BOOKING_MODES } from '../../../src/modules/calendly/types'

afterEach(() => server.resetHandlers())

describe('Calendly v2 services', () => {
  it('reads the signed-in user\'s own connection', async () => {
    server.use(http.get('*/common/calendly/connection', () => HttpResponse.json({
      status: true, data: { app_configured: true, connected: true, needs_reconnect: false, email: 'me@calendly.test' },
    })))

    const status = await fetchCalendlyConnection()
    expect(status.connected).toBe(true)
    expect(status.email).toBe('me@calendly.test')
  })

  it('asks for the Calendly sign-in link and returns it', async () => {
    server.use(http.post('*/common/calendly/connection', () => HttpResponse.json({ status: true, data: { url: 'https://auth.calendly.com/oauth/authorize?x=1' } })))

    expect(await connectCalendly()).toBe('https://auth.calendly.com/oauth/authorize?x=1')
  })

  it('disconnects with DELETE', async () => {
    let called = false
    server.use(http.delete('*/common/calendly/connection', () => { called = true; return HttpResponse.json({ status: true }) }))

    await disconnectCalendly()
    expect(called).toBe(true)
  })

  it('asks what Sync would bring in and send out for the dates shown, in the browser zone', async () => {
    let body: any = null
    server.use(http.post('*/common/calendly/sync/preview', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ status: true, data: { pull: [], push: [], event_types: [] } })
    }))

    expect(await fetchCalendlySyncPreview({ from: '2026-11-01', to: '2026-11-30' })).toEqual({ pull: [], push: [], event_types: [] })
    expect(body).toMatchObject({ from: '2026-11-01', to: '2026-11-30' })
    expect(typeof body.timezone).toBe('string')
  })

  it('syncs only what was ticked', async () => {
    let body: any = null
    server.use(http.post('*/common/calendly/sync', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ status: true, data: { pull: [{ uri: 'E1', result: 'created' }], push: [{ appointment_id: 7, ok: true }] } })
    }))

    const result = await applyCalendlySync({ from: '2026-11-01', to: '2026-11-30' }, { pull: ['E1'], push: [7], calendly_event_type_uri: 'ET1' })

    expect(result.push[0].ok).toBe(true)
    expect(body).toMatchObject({ from: '2026-11-01', to: '2026-11-30', pull: ['E1'], push: [7], calendly_event_type_uri: 'ET1' })
  })

  it('asks whose Calendly a booking with these people would go into', async () => {
    let body: any = null
    server.use(http.post('*/common/calendly/booking-options', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ status: true, data: { mode: CALENDLY_BOOKING_MODES.THEIRS, host: { user_id: 7, name: 'Sam' }, event_types: [] } })
    }))

    const options = await fetchCalendlyBookingOptions([{ user_id: 7 }])
    expect(options.mode).toBe(CALENDLY_BOOKING_MODES.THEIRS)
    expect(body).toEqual({ attendees: [{ user_id: 7 }] })
  })

  it('asks for the open times of a day', async () => {
    let body: any = null
    server.use(http.post('*/common/calendly/available-times', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ status: true, data: [{ start_time: '2026-11-27T09:00:00Z', local_time: '09:00' }] })
    }))

    const slots = await fetchCalendlyAvailableTimes({ attendees: [{ user_id: 7 }], event_type_uri: 'ET1', date: '2026-11-27', timezone: 'UTC' })
    expect(slots[0].local_time).toBe('09:00')
    expect(body.event_type_uri).toBe('ET1')
  })

  it('adds an existing appointment to Calendly', async () => {
    let body: any = null
    server.use(http.post('*/common/appointments/12/calendly', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ status: true, data: { id: 12, is_calendly: true } })
    }))

    const appointment = await addAppointmentToCalendly(12, { calendly_event_type_uri: 'ET1' })
    expect(appointment.is_calendly).toBe(true)
    expect(body).toEqual({ calendly_event_type_uri: 'ET1' })
  })

  it("hands Calendly's answer to the API and returns where to go next", async () => {
    let body: unknown = null
    server.use(http.post('*/calendly/callback', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ status: true, data: { url: 'https://portal.acme.test/appointments?calendly=connected' } })
    }))

    const url = await completeCalendlyConnection({ code: 'C', state: 'S' })

    expect(body).toEqual({ code: 'C', state: 'S' })
    expect(url).toBe('https://portal.acme.test/appointments?calendly=connected')
  })
})
