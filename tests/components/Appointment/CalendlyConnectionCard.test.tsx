import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { toast } from 'react-toastify'
import { server } from '../../mocks/server'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import CalendlyConnectionCard from '../../../src/components/Appointment/CalendlyConnectionCard'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
// The real Bootstrap modal runs its transition after the test unmounts.
vi.mock('bootstrap/js/dist/modal', () => ({ default: class { show = vi.fn(); hide = vi.fn(); dispose = vi.fn(); static getInstance = vi.fn(); static getOrCreateInstance = vi.fn() } }))

const connected = { app_configured: true, connected: true, needs_reconnect: false, name: 'Ada Lovelace', email: 'ada@calendly.test' }
const notConnected = { app_configured: true, connected: false, needs_reconnect: false }

const status = (data: object) => server.use(http.get('*/common/calendly/connection', () => HttpResponse.json({ status: true, data })))

const renderCard = (props: Partial<Parameters<typeof CalendlyConnectionCard>[0]> = {}, route = '/appointment') =>
  renderWithProviders(
    <CalendlyConnectionCard getSyncDates={() => ({ from: '2026-11-01', to: '2026-11-30' })} onSynced={vi.fn()} redirect={vi.fn()} {...props} />,
    { route }
  )

beforeEach(() => vi.clearAllMocks())
afterEach(() => server.resetHandlers())

describe('CalendlyConnectionCard (Calendly v2: each user connects their own)', () => {
  it('shows nothing until the host has set up the Calendly app', async () => {
    status({ app_configured: false, connected: false, needs_reconnect: false })
    const { container } = renderCard()

    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })

  it('offers Connect and sends the browser to Calendly', async () => {
    status(notConnected)
    server.use(http.post('*/common/calendly/connection', () => HttpResponse.json({ status: true, data: { url: 'https://auth.calendly.com/oauth/authorize?s=1' } })))
    const redirect = vi.fn()
    renderCard({ redirect })

    await userEvent.click(await screen.findByRole('button', { name: /connect calendly/i }))

    await waitFor(() => expect(redirect).toHaveBeenCalledWith('https://auth.calendly.com/oauth/authorize?s=1'))
  })

  it('asks to connect again when the sign-in expired', async () => {
    status({ ...notConnected, needs_reconnect: true })
    renderCard()

    expect(await screen.findByRole('button', { name: /reconnect calendly/i })).toBeInTheDocument()
    expect(screen.getByText(/sign-in has expired/i)).toBeInTheDocument()
  })

  it('shows the connected account, and Sync now brings in the dates shown', async () => {
    status(connected)
    let body: any = null
    server.use(http.post('*/common/calendly/sync', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({ status: true, data: { created: 2, updated: 0, cancelled: 1 } })
    }))
    const onSynced = vi.fn()
    renderCard({ onSynced })

    expect(await screen.findByText('ada@calendly.test')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Calendly' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /sync now/i }))

    await waitFor(() => expect(onSynced).toHaveBeenCalled())
    expect(body).toMatchObject({ from: '2026-11-01', to: '2026-11-30' })
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/2 added.*1 cancelled/i))
  })

  it('asks before disconnecting, then disconnects', async () => {
    status(connected)
    let deleted = false
    server.use(http.delete('*/common/calendly/connection', () => { deleted = true; return HttpResponse.json({ status: true }) }))
    renderCard()

    await userEvent.click(await screen.findByRole('button', { name: /^disconnect$/i }))
    expect(deleted).toBe(false)
    await userEvent.click(await screen.findByRole('button', { name: /yes, disconnect/i, hidden: true }))

    await waitFor(() => expect(deleted).toBe(true))
  })

  it('says how connecting went when Calendly sends the browser back', async () => {
    status(connected)
    renderCard({}, '/appointment?calendly=connected')
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Calendly connected'))

    vi.clearAllMocks()
    status(notConnected)
    renderCard({}, '/appointment?calendly=in_use')
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/already connected/i)))
  })

  it('shows when it last synced, and links to the Calendly page', async () => {
    status({ ...connected, last_synced_at: '2026-11-20T09:30:00Z', scheduling_url: 'https://calendly.com/ada' })
    renderCard()

    expect(await screen.findByText(/last synced/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open calendly/i })).toHaveAttribute('href', 'https://calendly.com/ada')
  })
})
