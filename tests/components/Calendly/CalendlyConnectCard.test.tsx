import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor, within } from '../../test-utils'
import { api } from '../../pages/pageHarness'
import { server } from '../../mocks/server'

vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn(), warning: vi.fn() }) }
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

  it('says the Calendly account is already connected in the portal when Calendly sends back in_use', async () => {
    api('get', STATUS, status({ can_manage: true }))

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />, { route: '/appointments?calendly=in_use' })

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('already connected in the portal')))
  })

  it('the account disconnects here after asking', async () => {
    const user = userEvent.setup()
    api('get', STATUS, status({ connected: true, can_manage: true, can_sync: true, name: 'FCH Team' }))
    const remove = api('delete', '/common/calendly/connection', { status: true })

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: /^disconnect$/i }))
    expect(remove.calls).toBe(0)
    const dialog = (await screen.findByText('Disconnect Calendly?')).closest('.modal') as HTMLElement
    // Its icon: Calendly's logo - not the animated bin.
    expect(dialog.querySelector('img')).not.toBeNull()
    expect(dialog.querySelector('lord-icon')).toBeNull()
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
    const sync = api('post', '/common/calendly/sync', {
      status: true,
      data: { direction: 'push', from: '2026-11-01', to: '2026-11-30', synced: 3, pulled: 0, pushed: 3, failed: 0, errors: [] },
    })

    renderWithProviders(
      <CalendlyConnectCard
        onSynced={onSynced}
        getSyncDates={() => ({ from: '2026-11-01', to: '2026-11-30', label: 'Nov 1 – Nov 30, 2026', view: 'Month view' })}
      />,
    )

    // Nothing is synced on opening the page.
    await screen.findByRole('button', { name: /sync now/i })
    expect(sync.calls).toBe(0)

    // Sync now asks which way first: one of pull, push, two-way - nothing synced yet.
    await user.click(await screen.findByRole('button', { name: /sync now/i }))
    const dialog = await screen.findByRole('dialog', { name: /sync with calendly/i })
    expect(sync.calls).toBe(0)
    expect(within(dialog).getByText('Nov 1 – Nov 30, 2026')).toBeInTheDocument()
    expect(within(dialog).getByText('Month view')).toBeInTheDocument()
    expect(within(dialog).getByRole('radio', { name: /pull from calendly/i })).toBeChecked()
    // The partner's team syncs its own Calendly: every way is open.
    expect(within(dialog).getByRole('radio', { name: /push to calendly/i })).toBeEnabled()

    await user.click(within(dialog).getByRole('radio', { name: /push to calendly/i }))
    expect(within(dialog).getByRole('radio', { name: /pull from calendly/i })).not.toBeChecked()
    await user.click(within(dialog).getByRole('button', { name: /^sync$/i }))

    await waitFor(() => expect(sync.calls).toBe(1))
    expect(sync.bodies[0]).toMatchObject({ direction: 'push', from: '2026-11-01', to: '2026-11-30' })
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Calendly synced: 3 sent to Calendly'))
    expect(onSynced).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /sync with calendly/i })).not.toBeInTheDocument())
  })

  it('says which meeting Calendly refused when syncing', async () => {
    const user = userEvent.setup()
    api('get', STATUS, status({ connected: true, can_sync: true, can_book: true, name: 'FCH Team', webhooks_active: true }))
    api('post', '/common/calendly/sync', {
      status: true,
      data: {
        direction: 'both', from: '2026-11-01', to: '2026-11-30', synced: 2, pulled: 1, pushed: 1, failed: 1,
        errors: [{ appointment_id: 9, subject: 'Funding review', message: 'Calendly could not complete this request.' }],
      },
    })

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: /sync now/i }))
    const dialog = await screen.findByRole('dialog', { name: /sync with calendly/i })
    // No calendar to read: the current month.
    expect(within(dialog).getByText('This month')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('radio', { name: /two-way sync/i }))
    await user.click(within(dialog).getByRole('button', { name: /^sync$/i }))

    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith(
      '1 brought in from Calendly · 1 sent to Calendly. 1 not sent to Calendly - "Funding review": Calendly could not complete this request.',
    ))
  })

  it('warns when webhooks are not active', async () => {
    api('get', STATUS, status({ connected: true, can_sync: true, webhooks_active: false }))

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />)

    expect(await screen.findByText(/webhooks are not active/i)).toBeInTheDocument()
  })

  // Nothing syncs by itself - not on opening the page, nor on coming back from connecting:
  // an appointment is made from a Calendly meeting only when someone presses Sync now.
  it('does not sync on its own when the page opens, even when connected', async () => {
    const onSynced = vi.fn()
    api('get', STATUS, status({ connected: true, can_sync: true, name: 'FCH Team' }))
    const sync = api('post', '/common/calendly/sync', { status: true, data: { synced: 2 } })

    renderWithProviders(<CalendlyConnectCard onSynced={onSynced} />)

    await screen.findByRole('button', { name: /sync now/i })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(sync.calls).toBe(0)
    expect(onSynced).not.toHaveBeenCalled()
  })

  it('does not sync when coming back from connecting Calendly - connecting makes no appointments', async () => {
    api('get', STATUS, status({ connected: true, can_sync: true, can_manage: true, name: 'FCH Team' }))
    const sync = api('post', '/common/calendly/sync', { status: true, data: { synced: 2 } })

    renderWithProviders(<CalendlyConnectCard onSynced={vi.fn()} />, { route: '/appointments?calendly=connected' })

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Calendly connected'))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(sync.calls).toBe(0)
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

})
