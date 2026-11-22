import { afterEach, describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'
import { http, HttpResponse } from 'msw'
import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { server } from '../../mocks/server'
import { createTestQueryClient } from '../../test-utils'
import { useCalendlyAvailableTimes, useCalendlyBookingOptions, useCalendlyConnection } from '../../../src/modules/calendly/queries'

afterEach(() => server.resetHandlers())

const wrapper = () => {
  const client = createTestQueryClient()
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('Calendly v2 query hooks', () => {
  it('useCalendlyConnection loads the user\'s own connection', async () => {
    server.use(http.get('*/common/calendly/connection', () => HttpResponse.json({ status: true, data: { app_configured: true, connected: false } })))

    const { result } = renderHook(() => useCalendlyConnection(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.app_configured).toBe(true)
  })

  it('useCalendlyBookingOptions waits until someone is picked', async () => {
    let calls = 0
    server.use(http.post('*/common/calendly/booking-options', () => { calls++; return HttpResponse.json({ status: true, data: { mode: 'none', host: null, event_types: [] } }) }))

    const { result, rerender } = renderHook(({ attendees }) => useCalendlyBookingOptions(attendees, true), {
      wrapper: wrapper(), initialProps: { attendees: [] as { user_id?: number }[] },
    })
    expect(result.current.fetchStatus).toBe('idle')

    rerender({ attendees: [{ user_id: 3 }] })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(calls).toBe(1)
  })

  it('useCalendlyAvailableTimes waits for an event type and a day', () => {
    const { result } = renderHook(() => useCalendlyAvailableTimes(null), { wrapper: wrapper() })
    expect(result.current.fetchStatus).toBe('idle')
  })
})
