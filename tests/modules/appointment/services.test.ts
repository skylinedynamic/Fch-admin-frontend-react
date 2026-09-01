import { afterEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { fetchAppointmentById, createAppointment, deleteAppointment, checkAvailability } from '../../../src/modules/appointment/services'

afterEach(() => server.resetHandlers())

describe('appointment services', () => {
  it('fetchAppointmentById unwraps the data object', async () => {
    server.use(http.get('*/common/appointments/7', () => HttpResponse.json({ status: true, data: { id: 7, subject: 'Consult' } })))
    await expect(fetchAppointmentById(7)).resolves.toEqual({ id: 7, subject: 'Consult' })
  })

  it('createAppointment posts the payload', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/appointments', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, data: { id: 1 } })
      })
    )
    await createAppointment({ subject: 'New Meeting' } as any)
    expect(receivedBody).toEqual({ subject: 'New Meeting' })
  })

  it('deleteAppointment DELETEs by id', async () => {
    server.use(http.delete('*/common/appointments/3', () => HttpResponse.json({ status: true, message: 'Cancelled' })))
    await expect(deleteAppointment(3)).resolves.toEqual({ status: true, message: 'Cancelled' })
  })

  it('checkAvailability posts the assignee/time payload', async () => {
    let receivedBody: unknown = null
    server.use(
      http.post('*/common/appointments/check-availability', async ({ request }) => {
        receivedBody = await request.json()
        return HttpResponse.json({ status: true, data: { available: true } })
      })
    )
    await checkAvailability({ assigned_for: 5, appointment_date: '2026-01-15 10:00:00' } as any)
    expect(receivedBody).toEqual({ assigned_for: 5, appointment_date: '2026-01-15 10:00:00' })
  })
})
