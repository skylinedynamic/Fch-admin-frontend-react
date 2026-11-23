import { afterEach, describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import CalendlyCallback from '../../../src/pages/calendly/CalendlyCallback'

afterEach(() => server.resetHandlers())

/**
 * Calendly sends people back to their partner's own portal (never the API's
 * address); this page hands Calendly's answer to the API and moves on.
 */
describe('CalendlyCallback page', () => {
  it("hands Calendly's code and state to the API once, then goes where the API says", async () => {
    const bodies: unknown[] = []
    server.use(http.post('*/calendly/callback', async ({ request }) => {
      bodies.push(await request.json())
      return HttpResponse.json({ status: true, data: { url: 'https://portal.acme.test/appointments?calendly=connected' } })
    }))
    const redirect = vi.fn()

    renderWithProviders(<StrictMode><CalendlyCallback redirect={redirect} /></StrictMode>, { route: '/calendly/callback?code=AUTH&state=S1' })

    expect(screen.getByText(/connecting calendly/i)).toBeInTheDocument()
    await waitFor(() => expect(redirect).toHaveBeenCalledWith('https://portal.acme.test/appointments?calendly=connected'))
    // The state works once; a second send would turn a success into an error.
    expect(bodies).toEqual([{ code: 'AUTH', state: 'S1' }])
  })

  it("passes on Calendly's error, so the API sends the user back saying so", async () => {
    let body: unknown = null
    server.use(http.post('*/calendly/callback', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ status: true, data: { url: '/appointments?calendly=error' } })
    }))
    const redirect = vi.fn()

    renderWithProviders(<CalendlyCallback redirect={redirect} />, { route: '/calendly/callback?error=access_denied&state=S1' })

    await waitFor(() => expect(redirect).toHaveBeenCalledWith('/appointments?calendly=error'))
    expect(body).toEqual({ error: 'access_denied', state: 'S1' })
  })

  it('says so, with a way back, when the API cannot be reached', async () => {
    server.use(http.post('*/calendly/callback', () => HttpResponse.error()))

    renderWithProviders(<CalendlyCallback redirect={vi.fn()} />, { route: '/calendly/callback?code=AUTH&state=S1' })

    expect(await screen.findByText(/calendly could not be connected/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to appointments/i })).toHaveAttribute('href', '/appointments')
  })
})
