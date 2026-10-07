import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { delay, http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { act, renderWithProviders, screen, waitFor, within } from '../../test-utils'
import { server } from '../../mocks/server'
import { createFakeEcho, type FakeEcho } from '../../mocks/fakeEcho'
import { setAuthState, clearAuthState } from '../../../src/store/auth'

let fake: FakeEcho

vi.mock('../../../src/lib/realtime/echo', () => ({
  getEcho: () => fake.echo,
  disconnectEcho: () => {},
  userChannelName: (id: number | string) => `App.Models.User.${id}`,
}))

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn() }) }
})

import { toast } from 'react-toastify'
import NotificationBell from '../../../src/components/Layout/NotificationBell'

const CHANNEL = 'App.Models.User.5'

const item = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  type: 'borrower.funding_request.status_changed',
  title: `Title ${id}`,
  body: `Body ${id}`,
  url: `/funding-requests/${id}`,
  icon: 'ri-hand-coin-line',
  category: 'funding',
  is_read: false,
  read_at: null,
  created_at: new Date().toISOString(),
  ...overrides,
})

function mockApi({ items = [item('1'), item('2', { is_read: true })], unread = 1 } = {}) {
  server.use(
    http.get('*/common/notifications', () =>
      HttpResponse.json({ status: true, data: items, meta: { current_page: 1, last_page: 1, per_page: 10, total: items.length, unread_count: unread } })
    )
  )
}

function renderBell() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<NotificationBell />} />
      <Route path="/funding-requests/:id" element={<p>Funding request page</p>} />
      <Route path="/notifications" element={<p>All notifications page</p>} />
    </Routes>
  )
}

describe('NotificationBell', () => {
  beforeEach(() => {
    fake = createFakeEcho()
    setAuthState({ token: 't', user: { id: 5 } as any })
  })

  afterEach(() => {
    clearAuthState()
    vi.clearAllMocks()
  })

  it('shows the unread count on the bell', async () => {
    mockApi({ unread: 3 })
    renderBell()

    expect(await screen.findByText('3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
  })

  it('caps a large count at 99+ and hides the badge at zero', async () => {
    mockApi({ unread: 150 })
    const { unmount } = renderBell()
    expect(await screen.findByText('99+')).toBeInTheDocument()
    unmount()

    mockApi({ unread: 0 })
    renderBell()
    await waitFor(() => expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument())
  })

  it('opens the latest notifications in a dropdown', async () => {
    mockApi()
    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByRole('button', { name: /notifications/i }))

    const menu = await screen.findByRole('menu')
    expect(await within(menu).findByText('Title 1')).toBeInTheDocument()
    expect(within(menu).getByText('Body 2')).toBeInTheDocument()
    expect(within(menu).getByRole('link', { name: /view all/i })).toHaveAttribute('href', '/notifications')
  })

  it('asks for only the 5 latest notifications', async () => {
    let perPage: string | null = null
    mockApi()
    server.use(
      http.get('*/common/notifications', ({ request }) => {
        perPage = new URL(request.url).searchParams.get('per_page')
        return HttpResponse.json({ status: true, data: [], meta: { current_page: 1, last_page: 1, per_page: 5, total: 0, unread_count: 0 } })
      })
    )
    renderBell()

    await waitFor(() => expect(perPage).toBe('5'))
  })

  it('shows skeleton rows while the list loads', async () => {
    mockApi()
    server.use(http.get('*/common/notifications', async () => { await delay('infinite') }))
    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByRole('button', { name: /notifications/i }))

    expect(await screen.findByLabelText(/loading notifications/i)).toBeInTheDocument()
  })

  it('summarises how many are unread in the dropdown header', async () => {
    mockApi({ unread: 2 })
    const user = userEvent.setup()
    renderBell()
    await screen.findByTestId('notification-badge')

    await user.click(screen.getByRole('button', { name: /notifications/i }))

    expect(within(await screen.findByRole('menu')).getByText('2 unread')).toBeInTheDocument()
  })

  it('shows an empty state when there are none', async () => {
    mockApi({ items: [], unread: 0 })
    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByRole('button', { name: /notifications/i }))

    expect(await screen.findByText(/no notifications yet/i)).toBeInTheDocument()
  })

  it('clicking an unread notification marks it read and opens its page', async () => {
    mockApi()
    let readCalled = false
    server.use(
      http.post('*/common/notifications/1/read', () => {
        readCalled = true
        return HttpResponse.json({ status: true, data: { notification: item('1', { is_read: true }), unread_count: 0 } })
      })
    )
    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByRole('button', { name: /notifications/i }))
    await user.click(await screen.findByRole('button', { name: /title 1/i }))

    expect(await screen.findByText('Funding request page')).toBeInTheDocument()
    await waitFor(() => expect(readCalled).toBe(true))
  })

  it('"Mark all as read" clears the badge', async () => {
    mockApi({ unread: 1 })
    server.use(http.post('*/common/notifications/read-all', () => HttpResponse.json({ status: true, data: { updated: 1, unread_count: 0 } })))
    const user = userEvent.setup()
    renderBell()

    await user.click(screen.getByRole('button', { name: /notifications/i }))
    await user.click(await screen.findByRole('button', { name: /mark all as read/i }))

    await waitFor(() => expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument())
  })

  it('a real-time notification bumps the badge and joins the list, without a toast', async () => {
    mockApi({ items: [item('1')], unread: 1 })
    const user = userEvent.setup()
    renderBell()
    await screen.findByText('1')
    await user.click(screen.getByRole('button', { name: /notifications/i }))
    await screen.findByText('Title 1')

    act(() => {
      fake.emitNotification(CHANNEL, { ...item('live'), title: 'Live one', is_read: undefined })
    })

    expect(await screen.findByText('2')).toBeInTheDocument()
    expect(screen.getByText('Live one')).toBeInTheDocument()
    expect(toast).not.toHaveBeenCalled()
    expect(toast.info).not.toHaveBeenCalled()
  })

  it('stays in sync when notifications are read in another tab', async () => {
    mockApi({ unread: 1 })
    renderBell()
    expect(await screen.findByTestId('notification-badge')).toHaveTextContent('1')

    act(() => {
      fake.emit(CHANNEL, '.notification.read', { ids: null, unread_count: 0 })
    })

    await waitFor(() => expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument())
  })

  it('stops listening when it unmounts', async () => {
    mockApi()
    const { unmount } = renderBell()
    await screen.findByTestId('notification-badge')
    expect(fake.listenerCount(CHANNEL, '.notification.read')).toBe(1)

    unmount()

    expect(fake.listenerCount(CHANNEL, '.notification.read')).toBe(0)
    expect(fake.listenerCount(CHANNEL, '.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated')).toBe(0)
  })

  it('refetches after the socket reconnects, to catch anything missed', async () => {
    let fetches = 0
    mockApi()
    server.use(
      http.get('*/common/notifications', () => {
        fetches += 1
        const unread = fetches === 1 ? 1 : 5
        return HttpResponse.json({ status: true, data: [], meta: { current_page: 1, last_page: 1, per_page: 5, total: 0, unread_count: unread } })
      })
    )
    renderBell()
    expect(await screen.findByTestId('notification-badge')).toHaveTextContent('1')

    act(() => fake.setConnectionState('unavailable'))
    act(() => fake.setConnectionState('connected'))

    await waitFor(() => expect(screen.getByTestId('notification-badge')).toHaveTextContent('5'))
  })
})
