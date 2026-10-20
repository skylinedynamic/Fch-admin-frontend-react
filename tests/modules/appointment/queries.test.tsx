import { afterEach, describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import { queryKeys } from '../../../src/lib/query/queryKeys'
import {
  useAppointments,
  useAppointment,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
} from '../../../src/modules/appointment/queries'
import { expectIdle, runMutation, runQuery, stub } from '../queryHarness'

afterEach(() => server.resetHandlers())

describe('appointment queries', () => {
  it('useAppointments fetches the list', async () => {
    const seen = stub('post', '/common/appointments/fetch-all', { status: true, data: [{ id: 1, title: 'Call' }] })

    const { result, queryClient } = await runQuery(() => useAppointments())

    expect(seen.calls).toBe(1)
    expect(result.current.isSuccess).toBe(true)
    expect(queryClient.getQueryData(queryKeys.appointment.list())).toBeDefined()
  })

  it('useAppointment does not fetch when disabled', () => {
    expectIdle(() => useAppointment(1, false))
  })

  it('useAppointment fetches one record under its own key', async () => {
    stub('get', '/common/appointments/4', { status: true, data: { id: 4, title: 'Call' } })

    const { result, queryClient } = await runQuery(() => useAppointment(4))

    expect(result.current.isSuccess).toBe(true)
    expect(queryClient.getQueryData(queryKeys.appointment.detail(4))).toBeDefined()
  })
})

describe('appointment mutations', () => {
  it('useCreateAppointment sends the payload and refreshes the list', async () => {
    const seen = stub('post', '/common/appointments', { status: true, data: { id: 1 } })
    const payload = { title: 'Intro call', date: '2026-04-01' }

    const { invalidated } = await runMutation(() => useCreateAppointment(), payload as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([queryKeys.appointment.list()])
  })

  it('useUpdateAppointment sends the change and refreshes that record and the list', async () => {
    const seen = stub('put', '/common/appointments/4', { status: true, data: { id: 4 } })
    const payload = { title: 'Renamed' }

    const { invalidated } = await runMutation(() => useUpdateAppointment(), { id: 4, payload } as never)

    expect(seen.bodies[0]).toEqual(payload)
    expect(invalidated).toEqual([queryKeys.appointment.detail(4), queryKeys.appointment.list()])
  })

  it('useDeleteAppointment deletes and refreshes the list', async () => {
    const seen = stub('delete', '/common/appointments/4', { status: true, message: 'deleted' })

    const { invalidated } = await runMutation(() => useDeleteAppointment(), 4 as never)

    expect(seen.calls).toBe(1)
    expect(invalidated).toEqual([queryKeys.appointment.list()])
  })

  it('a failed useCreateAppointment leaves the cache alone', async () => {
    stub('post', '/common/appointments', { status: false, message: 'Invalid' }, 422)

    const { invalidated, error } = await runMutation(() => useCreateAppointment(), {} as never)

    expect(error).toBeTruthy()
    expect(invalidated).toEqual([])
  })
})
