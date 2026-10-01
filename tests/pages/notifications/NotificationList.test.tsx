import { afterEach, describe, expect, it, vi } from 'vitest'
import { delay, http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor, within } from '../../test-utils'
import { server } from '../../mocks/server'
import NotificationList from '../../../src/pages/notifications/NotificationList'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn() }) }
})

const item = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  type: 'system.test',
  title: `Title ${id}`,
  body: `Body ${id}`,
  url: `/funding-requests/${id}`,
  icon: null,
  category: 'system',
  is_read: false,
  read_at: null,
  created_at: new Date().toISOString(),
  ...overrides,
})

const requests: URLSearchParams[] = []

function mockList(
  pages: Record<string, ReturnType<typeof item>[]> = { '1': [item('1'), item('2', { is_read: true })] },
  { lastPage = 1, total }: { lastPage?: number; total?: number } = {}
) {
  requests.length = 0
  server.use(
    http.get('*/common/notifications', ({ request }) => {
      const params = new URL(request.url).searchParams
      requests.push(params)
      const page = params.get('page') ?? '1'
      const status = params.get('status')
      const items = (pages[page] ?? []).filter((n) => (status === 'unread' ? !n.is_read : status === 'read' ? n.is_read : true))
      return HttpResponse.json({
        status: true,
        data: items,
        meta: { current_page: Number(page), last_page: lastPage, per_page: 15, total: total ?? items.length, unread_count: 1 },
      })
    })
  )
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/notifications" element={<NotificationList />} />
      <Route path="/funding-requests/:id" element={<p>Funding request page</p>} />
    </Routes>,
    { route: '/notifications' }
  )
}

afterEach(() => vi.clearAllMocks())

describe('NotificationList page', () => {
  it('uses the full-width card layout the other pages use', async () => {
    mockList()
    const { container } = renderPage()
    await screen.findByText('Title 1')

    const card = container.querySelector('.card') as HTMLElement
    expect(card.parentElement).toHaveClass('col-12')
    expect(card.closest('[class*="col-xl-"], [class*="col-xxl-"]')).toBeNull()
  })

  it('shows skeleton rows while loading', async () => {
    server.use(http.get('*/common/notifications', async () => { await delay('infinite') }))
    renderPage()

    expect(await screen.findByLabelText(/loading notifications/i)).toBeInTheDocument()
  })

  it('lists the notifications grouped by day, with the unread count on its tab', async () => {
    mockList()
    renderPage()

    expect(await screen.findByText('Title 1')).toBeInTheDocument()
    expect(screen.getByText('Title 2')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /unread\s*1/i })).toBeInTheDocument()
  })

  it('filters to unread', async () => {
    mockList()
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Title 2')

    await user.click(screen.getByRole('tab', { name: /unread/i }))

    await waitFor(() => expect(screen.queryByText('Title 2')).not.toBeInTheDocument())
    expect(screen.getByText('Title 1')).toBeInTheDocument()
    expect(requests[requests.length - 1].get('status')).toBe('unread')
    expect(screen.getByRole('tab', { name: /unread/i })).toHaveAttribute('aria-selected', 'true')
  })

  it('pages through older notifications and says which ones are shown', async () => {
    mockList({ '1': [item('1')], '2': [item('old')] }, { lastPage: 2, total: 16 })
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Title 1')
    expect(screen.getByText(/showing 1–15 of 16/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /next/i }))

    expect(await screen.findByText('Title old')).toBeInTheDocument()
    expect(screen.getByText(/showing 16–16 of 16/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('opens a notification and marks it read', async () => {
    mockList()
    let readCalled = false
    server.use(
      http.post('*/common/notifications/1/read', () => {
        readCalled = true
        return HttpResponse.json({ status: true, data: { notification: item('1', { is_read: true }), unread_count: 0 } })
      })
    )
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /title 1/i }))

    expect(await screen.findByText('Funding request page')).toBeInTheDocument()
    expect(readCalled).toBe(true)
  })

  it('marks a single notification read without leaving the page', async () => {
    mockList()
    let readCalled = false
    server.use(
      http.post('*/common/notifications/1/read', () => {
        readCalled = true
        return HttpResponse.json({ status: true, data: { notification: item('1', { is_read: true }), unread_count: 0 } })
      })
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Title 1')

    // Only unread notifications offer it.
    expect(screen.getAllByRole('button', { name: /^mark as read$/i })).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: /^mark as read$/i }))

    await waitFor(() => expect(readCalled).toBe(true))
    expect(screen.queryByText('Funding request page')).not.toBeInTheDocument()
  })

  it('deletes a notification', async () => {
    mockList()
    let deleted = false
    server.use(
      http.delete('*/common/notifications/2', () => {
        deleted = true
        return HttpResponse.json({ status: true, data: { unread_count: 1 } })
      })
    )
    const user = userEvent.setup()
    renderPage()
    const row = (await screen.findByText('Title 2')).closest('[data-notification-id]') as HTMLElement

    await user.click(within(row).getByRole('button', { name: /delete notification/i }))

    await waitFor(() => expect(deleted).toBe(true))
  })

  it('marks all as read', async () => {
    mockList()
    let called = false
    server.use(
      http.post('*/common/notifications/read-all', () => {
        called = true
        return HttpResponse.json({ status: true, data: { updated: 1, unread_count: 0 } })
      })
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Title 1')

    await user.click(screen.getByRole('button', { name: /mark all as read/i }))

    await waitFor(() => expect(called).toBe(true))
  })

  it('shows an empty state that fits the tab', async () => {
    mockList({ '1': [item('2', { is_read: true })] })
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Title 2')

    await user.click(screen.getByRole('tab', { name: /unread/i }))

    expect(await screen.findByText(/you're all caught up/i)).toBeInTheDocument()
  })

  it('shows an empty state when there are no notifications at all', async () => {
    mockList({ '1': [] })
    renderPage()

    expect(await screen.findByText(/no notifications yet/i)).toBeInTheDocument()
  })
})
