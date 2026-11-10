import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { api } from '../../pages/pageHarness'
import { server } from '../../mocks/server'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

import { toast } from 'react-toastify'
import CalendlyConnectCard from '../../../src/components/Calendly/CalendlyConnectCard'

const STATUS = '/common/calendly/status'

const status = (data: Record<string, unknown>) => ({ status: true, data: { connected: false, can_manage: false, can_book: false, ...data } })

beforeEach(() => vi.clearAllMocks())
afterEach(() => server.resetHandlers())

/** The company Calendly account on the Appointments page. */
describe('CalendlyConnectCard', () => {
  it('lets the host connect Calendly by going to the Calendly authorize link', async () => {
    const user = userEvent.setup()
    const go = vi.fn()
    api('get', STATUS, status({ can_manage: true }))
    api('get', '/common/calendly/connect-url', { status: true, data: { url: 'https://auth.calendly.com/oauth/authorize?state=abc' } })

    renderWithProviders(<CalendlyConnectCard onBook={vi.fn()} onSynced={vi.fn()} redirect={go} />)

    await user.click(await screen.findByRole('button', { name: /connect calendly/i }))
    await waitFor(() => expect(go).toHaveBeenCalledWith('https://auth.calendly.com/oauth/authorize?state=abc'))
  })

  it('shows nothing to someone who cannot manage it while it is off', async () => {
    const seen = api('get', STATUS, status({}))

    const { container } = renderWithProviders(<CalendlyConnectCard onBook={vi.fn()} onSynced={vi.fn()} />)

    await waitFor(() => expect(seen.calls).toBe(1))
    expect(screen.queryByRole('button', { name: /connect calendly/i })).not.toBeInTheDocument()
    expect(container.textContent).toBe('')
  })

  it('shows the connected account and books via Calendly', async () => {
    const user = userEvent.setup()
    const onBook = vi.fn()
    api('get', STATUS, status({ connected: true, can_book: true, name: 'FCH Team' }))

    renderWithProviders(<CalendlyConnectCard onBook={onBook} onSynced={vi.fn()} />)

    expect(await screen.findByText(/FCH Team/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /book via calendly/i }))
    expect(onBook).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /disconnect/i })).not.toBeInTheDocument()
  })

  it('lets the host sync now and reports how many meetings came in', async () => {
    const user = userEvent.setup()
    const onSynced = vi.fn()
    api('get', STATUS, status({ connected: true, can_manage: true, can_book: true, name: 'FCH Team', webhooks_active: true }))
    const sync = api('post', '/common/calendly/sync', { status: true, data: { synced: 3 } })

    renderWithProviders(<CalendlyConnectCard onBook={vi.fn()} onSynced={onSynced} />)

    await user.click(await screen.findByRole('button', { name: /sync now/i }))
    await waitFor(() => expect(sync.calls).toBe(1))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('3 Calendly meeting(s) synced'))
    expect(onSynced).toHaveBeenCalled()
  })

  it('warns the host when webhooks are not active', async () => {
    api('get', STATUS, status({ connected: true, can_manage: true, webhooks_active: false }))

    renderWithProviders(<CalendlyConnectCard onBook={vi.fn()} onSynced={vi.fn()} />)

    expect(await screen.findByText(/webhooks are not active/i)).toBeInTheDocument()
  })

  it('lets the host disconnect after confirming', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    api('get', STATUS, status({ connected: true, can_manage: true }))
    const remove = api('delete', '/common/calendly/connection', { status: true })

    renderWithProviders(<CalendlyConnectCard onBook={vi.fn()} onSynced={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: /disconnect/i }))
    await waitFor(() => expect(remove.calls).toBe(1))
  })

  it('asks the host to connect again when the connection expired', async () => {
    api('get', STATUS, status({ connected: false, needs_reconnect: true, can_manage: true }))

    renderWithProviders(<CalendlyConnectCard onBook={vi.fn()} onSynced={vi.fn()} />)

    expect(await screen.findByRole('button', { name: /reconnect calendly/i })).toBeInTheDocument()
  })
})
