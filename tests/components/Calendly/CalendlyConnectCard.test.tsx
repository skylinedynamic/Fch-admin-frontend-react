import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor, within } from '../../test-utils'
import { api } from '../../pages/pageHarness'
import { server } from '../../mocks/server'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import { toast } from 'react-toastify'
import CalendlyConnectCard from '../../../src/components/Calendly/CalendlyConnectCard'

const STATUS = '/common/calendly/status'

const status = (data: Record<string, unknown>) => ({ status: true, data: { connected: false, can_manage: false, can_book: false, ...data } })

beforeEach(() => {
  vi.clearAllMocks()
  // Opening the page syncs a connected account on its own (below).
  api('post', '/common/calendly/sync', { status: true, data: { synced: 0 } })
})
afterEach(() => server.resetHandlers())

/** The company Calendly account on the Appointments page. */
describe('CalendlyConnectCard', () => {
  const SETUP = {
    redirect_uri: 'https://api.example.test/api/v1/calendly/callback',
    scopes: ['users:read', 'event_types:read'],
  }

  // Each owner connects their own Calendly with their own Calendly OAuth app:
  // Connect opens a popup for its keys, then goes to Calendly's sign-in.
  it('Connect opens a popup for your own Calendly app keys, saves them and goes to the Calendly sign-in', async () => {
    const user = userEvent.setup()
    const go = vi.fn()
    api('get', STATUS, status({ can_manage: true, ...SETUP }))
    const connect = api('post', '/common/calendly/connect', { status: true, data: { url: 'https://auth.calendly.com/oauth/authorize?state=abc' } })

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} redirect={go} />)

    await user.click(await screen.findByRole('button', { name: /connect calendly/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(SETUP.redirect_uri)).toBeInTheDocument()
    expect(within(dialog).getByText('users:read')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText(/client id/i), 'my-client-id')
    await user.type(within(dialog).getByLabelText(/client secret/i), 'my-secret')
    await user.type(within(dialog).getByLabelText(/webhook signing key/i), 'my-key')
    await user.click(within(dialog).getByRole('button', { name: /save & connect/i }))

    await waitFor(() => expect(connect.calls).toBe(1))
    expect(connect.bodies[0]).toEqual({ client_id: 'my-client-id', client_secret: 'my-secret', webhook_signing_key: 'my-key' })
    await waitFor(() => expect(go).toHaveBeenCalledWith('https://auth.calendly.com/oauth/authorize?state=abc'))
  })

  // Save & Connect shows it is working, and cannot be clicked twice, until the
  // browser has gone to Calendly's sign-in.
  it('Save & Connect shows "Connecting…" and stays disabled until the browser leaves for Calendly', async () => {
    const user = userEvent.setup()
    const go = vi.fn()
    api('get', STATUS, status({ can_manage: true, ...SETUP }))
    api('post', '/common/calendly/connect', { status: true, data: { url: 'https://auth.calendly.com/oauth/authorize?state=abc' } })

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} redirect={go} />)

    await user.click(await screen.findByRole('button', { name: /connect calendly/i }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(/client id/i), 'my-client-id')
    await user.type(within(dialog).getByLabelText(/client secret/i), 'my-secret')
    await user.click(within(dialog).getByRole('button', { name: /save & connect/i }))

    await waitFor(() => expect(go).toHaveBeenCalled())
    const button = within(dialog).getByRole('button', { name: /connecting/i })
    expect(button).toBeDisabled()
    expect(within(dialog).getByLabelText(/client id/i)).toBeDisabled()
  })

  it('reconnecting shows the saved Client ID and keeps the stored secrets when left blank', async () => {
    const user = userEvent.setup()
    api('get', STATUS, status({ can_manage: true, needs_reconnect: true, client_id: 'saved-app', has_client_secret: true, has_webhook_signing_key: true, ...SETUP }))
    const connect = api('post', '/common/calendly/connect', { status: true, data: { url: 'https://auth.calendly.com/x' } })

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} redirect={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: /reconnect calendly/i }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText(/client id/i)).toHaveValue('saved-app')
    expect(within(dialog).getByText(/secret is already stored/i)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /save & connect/i }))

    await waitFor(() => expect(connect.calls).toBe(1))
    expect(connect.bodies[0]).toEqual({ client_id: 'saved-app', client_secret: '', webhook_signing_key: '' })
  })

  it('shows the API refusing a key beside its field', async () => {
    const user = userEvent.setup()
    api('get', STATUS, status({ can_manage: true, ...SETUP }))
    api('post', '/common/calendly/connect', { status: false, message: 'x', errors: { client_secret: ['Enter the Client Secret of your Calendly OAuth app.'] } }, 422)

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} redirect={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: /connect calendly/i }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText(/client id/i), 'my-client-id')
    await user.click(within(dialog).getByRole('button', { name: /save & connect/i }))

    expect(await within(dialog).findByText('Enter the Client Secret of your Calendly OAuth app.')).toBeInTheDocument()
  })

  it('shows nothing to someone who cannot manage it while it is off', async () => {
    const seen = api('get', STATUS, status({}))

    const { container } = renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    await waitFor(() => expect(seen.calls).toBe(1))
    expect(screen.queryByRole('button', { name: /connect calendly/i })).not.toBeInTheDocument()
    expect(container.textContent).toBe('')
  })

  // Booking is a tick in "Add Appointment" now, not a separate button here.
  it('shows the connected account, with no separate "Book via Calendly" button', async () => {
    api('get', STATUS, status({ connected: true, can_book: true, name: 'FCH Team' }))

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    expect(await screen.findByText(/FCH Team/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /book via calendly/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /disconnect/i })).not.toBeInTheDocument()
  })

  it('lets the host sync now and reports how many meetings came in', async () => {
    const user = userEvent.setup()
    const onSynced = vi.fn()
    api('get', STATUS, status({ connected: true, can_manage: true, can_book: true, name: 'FCH Team', webhooks_active: true }))
    const sync = api('post', '/common/calendly/sync', { status: true, data: { synced: 3 } })

    renderWithProviders(<CalendlyConnectCard onSynced={onSynced} />)

    // The automatic sync on opening the page goes first.
    await waitFor(() => expect(sync.calls).toBe(1))
    await user.click(await screen.findByRole('button', { name: /sync now/i }))
    await waitFor(() => expect(sync.calls).toBe(2))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('3 Calendly meeting(s) synced'))
    expect(onSynced).toHaveBeenCalled()
  })

  it('warns the host when webhooks are not active', async () => {
    api('get', STATUS, status({ connected: true, can_manage: true, webhooks_active: false }))

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    expect(await screen.findByText(/webhooks are not active/i)).toBeInTheDocument()
  })

  // Disconnect asks in the app's own confirmation popup, not the browser's.
  it('Disconnect asks in the confirmation popup, then disconnects', async () => {
    const user = userEvent.setup()
    const browserConfirm = vi.spyOn(window, 'confirm')
    api('get', STATUS, status({ connected: true, can_manage: true }))
    const remove = api('delete', '/common/calendly/connection', { status: true })

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: /^disconnect$/i }))
    expect(remove.calls).toBe(0)
    const dialog = (await screen.findByText('Disconnect Calendly?')).closest('.modal') as HTMLElement
    await user.click(within(dialog).getByRole('button', { name: /yes, disconnect/i }))

    await waitFor(() => expect(remove.calls).toBe(1))
    expect(browserConfirm).not.toHaveBeenCalled()
  })

  it('closing the confirmation popup disconnects nothing', async () => {
    const user = userEvent.setup()
    api('get', STATUS, status({ connected: true, can_manage: true }))
    const remove = api('delete', '/common/calendly/connection', { status: true })

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: /^disconnect$/i }))
    const dialog = (await screen.findByText('Disconnect Calendly?')).closest('.modal') as HTMLElement
    await user.click(within(dialog).getByRole('button', { name: /^close$/i }))

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(remove.calls).toBe(0)
  })

  it('asks the host to connect again when the connection expired', async () => {
    api('get', STATUS, status({ connected: false, needs_reconnect: true, can_manage: true }))

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    expect(await screen.findByRole('button', { name: /reconnect calendly/i })).toBeInTheDocument()
  })

  // Opening the Appointments page brings in Calendly meetings booked or missed
  // since the last sync - no need to press Sync now.
  it('syncs a connected account on its own when the page opens, once and quietly, then reloads the calendar', async () => {
    const onSynced = vi.fn()
    api('get', STATUS, status({ connected: true, can_manage: true, name: 'FCH Team' }))
    const sync = api('post', '/common/calendly/sync', { status: true, data: { synced: 2 } })

    renderWithProviders(<CalendlyConnectCard onSynced={onSynced} />)

    await waitFor(() => expect(sync.calls).toBe(1))
    await waitFor(() => expect(onSynced).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(sync.calls).toBe(1)
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('does not sync on its own when Calendly is not connected', async () => {
    const seen = api('get', STATUS, status({ connected: false, can_manage: true }))
    const sync = api('post', '/common/calendly/sync', { status: true, data: { synced: 0 } })

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    await waitFor(() => expect(seen.calls).toBe(1))
    await screen.findByRole('button', { name: /connect calendly/i })
    expect(sync.calls).toBe(0)
  })

  it('does not sync on its own for someone who may not sync', async () => {
    api('get', STATUS, status({ connected: true, can_manage: false, can_book: true, name: 'FCH Team' }))
    const sync = api('post', '/common/calendly/sync', { status: true, data: { synced: 0 } })

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    await screen.findByText(/FCH Team/)
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(sync.calls).toBe(0)
  })

  it('a failed automatic sync shows no error toast', async () => {
    api('get', STATUS, status({ connected: true, can_manage: true, name: 'FCH Team' }))
    const sync = api('post', '/common/calendly/sync', { status: false, message: 'Calendly is not responding right now.' }, 503)

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    await waitFor(() => expect(sync.calls).toBe(1))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(toast.error).not.toHaveBeenCalled()
  })
})
