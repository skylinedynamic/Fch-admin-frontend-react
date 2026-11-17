import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor, within } from '../../test-utils'
import { api } from '../../pages/pageHarness'
import { server } from '../../mocks/server'

vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

import { toast } from 'react-toastify'
import CalendlyConnectCard from '../../../src/components/Calendly/CalendlyConnectCard'

const STATUS = '/common/calendly/status'

const status = (data: Record<string, unknown>) => ({ status: true, data: { configured: true, connected: false, can_manage: false, can_sync: false, can_book: false, ...data } })

beforeEach(() => {
  vi.clearAllMocks()
  // Opening the page syncs a connected account on its own (below).
  api('post', '/common/calendly/sync', { status: true, data: { synced: 0 } })
})
afterEach(() => server.resetHandlers())

/**
 * The partner's Calendly on the Appointments page: the host, WLP or certified
 * partner account itself connects, reconnects and disconnects it here (its app
 * keys are in Settings > Calendly); it and its staff sync it.
 */
describe('CalendlyConnectCard', () => {
  it('the account connects here - straight to Calendly sign-in', async () => {
    const user = userEvent.setup()
    const go = vi.fn()
    api('get', STATUS, status({ can_manage: true }))
    const connect = api('post', '/common/calendly/connect', { status: true, data: { url: 'https://auth.calendly.com/oauth/authorize?state=abc' } })

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} redirect={go} />)

    await user.click(await screen.findByRole('button', { name: /connect calendly/i }))

    await waitFor(() => expect(go).toHaveBeenCalledWith('https://auth.calendly.com/oauth/authorize?state=abc'))
    expect(connect.calls).toBe(1)
    expect(screen.getByRole('button', { name: /connecting/i })).toBeDisabled()
  })

  it('asks the account to reconnect here when the connection expired', async () => {
    api('get', STATUS, status({ can_manage: true, needs_reconnect: true }))

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    expect(await screen.findByText('Expired')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reconnect calendly/i })).toBeInTheDocument()
  })

  it('without saved app keys the account is sent to Settings to add them', async () => {
    api('get', STATUS, status({ configured: false, can_manage: true }))

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    expect(await screen.findByRole('link', { name: /add keys in settings/i })).toHaveAttribute('href', '/settings/calendly')
    expect(screen.queryByRole('button', { name: /connect calendly/i })).not.toBeInTheDocument()
  })

  it('shows nothing to staff while Calendly is not set up', async () => {
    const seen = api('get', STATUS, status({ configured: false }))

    const { container } = renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    await waitFor(() => expect(seen.calls).toBe(1))
    expect(container.textContent).toBe('')
  })

  it('says how connecting went when Calendly sends the account back here', async () => {
    const onSynced = vi.fn()
    api('get', STATUS, status({ connected: true, can_manage: true, can_sync: true }))

    renderWithProviders(<CalendlyConnectCard onSynced={onSynced} />, { route: '/appointments?calendly=connected' })

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Calendly connected'))
    expect(onSynced).toHaveBeenCalled()
  })

  it('the account disconnects here after asking', async () => {
    const user = userEvent.setup()
    api('get', STATUS, status({ connected: true, can_manage: true, can_sync: true, name: 'FCH Team' }))
    const remove = api('delete', '/common/calendly/connection', { status: true })

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: /^disconnect$/i }))
    expect(remove.calls).toBe(0)
    const dialog = (await screen.findByText('Disconnect Calendly?')).closest('.modal') as HTMLElement
    await user.click(within(dialog).getByRole('button', { name: /yes, disconnect/i }))
    await waitFor(() => expect(remove.calls).toBe(1))
  })

  it('staff may sync but never disconnect', async () => {
    api('get', STATUS, status({ connected: true, can_sync: true, name: 'FCH Team' }))

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    expect(await screen.findByRole('button', { name: /sync now/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /disconnect/i })).not.toBeInTheDocument()
  })

  it('staff see nothing while their partner has not connected Calendly - only the account can', async () => {
    const seen = api('get', STATUS, status({}))

    const { container } = renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    await waitFor(() => expect(seen.calls).toBe(1))
    expect(container.textContent).toBe('')
  })

  it('lets the account and its staff sync now and reports how many meetings came in', async () => {
    const user = userEvent.setup()
    const onSynced = vi.fn()
    api('get', STATUS, status({ connected: true, can_sync: true, can_book: true, name: 'FCH Team', webhooks_active: true }))
    const sync = api('post', '/common/calendly/sync', { status: true, data: { synced: 3 } })

    renderWithProviders(<CalendlyConnectCard onSynced={onSynced} />)

    // The automatic sync on opening the page goes first.
    await waitFor(() => expect(sync.calls).toBe(1))
    await user.click(await screen.findByRole('button', { name: /sync now/i }))
    await waitFor(() => expect(sync.calls).toBe(2))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('3 Calendly meeting(s) synced'))
    expect(onSynced).toHaveBeenCalled()
  })

  it('warns when webhooks are not active', async () => {
    api('get', STATUS, status({ connected: true, can_sync: true, webhooks_active: false }))

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    expect(await screen.findByText(/webhooks are not active/i)).toBeInTheDocument()
  })

  // Opening the Appointments page brings in Calendly meetings booked or missed
  // since the last sync - no need to press Sync now.
  it('syncs a connected Calendly on its own when the page opens, once and quietly, then reloads the calendar', async () => {
    const onSynced = vi.fn()
    api('get', STATUS, status({ connected: true, can_sync: true, name: 'FCH Team' }))
    const sync = api('post', '/common/calendly/sync', { status: true, data: { synced: 2 } })

    renderWithProviders(<CalendlyConnectCard onSynced={onSynced} />)

    await waitFor(() => expect(sync.calls).toBe(1))
    await waitFor(() => expect(onSynced).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(sync.calls).toBe(1)
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('does not sync on its own when Calendly is not connected', async () => {
    const seen = api('get', STATUS, status({ can_manage: true }))
    const sync = api('post', '/common/calendly/sync', { status: true, data: { synced: 0 } })

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    await waitFor(() => expect(seen.calls).toBe(1))
    await screen.findByRole('button', { name: /connect calendly/i })
    expect(sync.calls).toBe(0)
  })

  it('does not sync on its own for someone who may not sync', async () => {
    api('get', STATUS, status({ connected: true, can_book: true, name: 'FCH Team' }))
    const sync = api('post', '/common/calendly/sync', { status: true, data: { synced: 0 } })

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    await screen.findByText(/FCH Team/)
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(sync.calls).toBe(0)
  })

  it('a failed automatic sync shows no error toast', async () => {
    api('get', STATUS, status({ connected: true, can_sync: true, name: 'FCH Team' }))
    const sync = api('post', '/common/calendly/sync', { status: false, message: 'Calendly is not responding right now.' }, 503)

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    await waitFor(() => expect(sync.calls).toBe(1))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(toast.error).not.toHaveBeenCalled()
  })
})
