import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { act, renderWithProviders, screen, waitFor } from '../../test-utils'
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

import NotificationBell from '../../../src/components/Layout/NotificationBell'

/**
 * The partner's bell when the host converted its lead on its behalf - the
 * notice fch-api sends as partner.lead.converted_on_behalf, pushed live over
 * the socket and opening the borrower in the partner's portal.
 */
const CHANNEL = 'App.Models.User.21'

const CONVERTED = {
  id: 'n-1',
  type: 'partner.lead.converted_on_behalf',
  title: 'Your lead was converted to a borrower',
  body: 'Host Co converted your lead Lee Lead to a borrower on your behalf.',
  url: '/clients/99',
  icon: 'ri-user-follow-line',
  category: 'funding',
  is_read: false,
  read_at: null,
  created_at: new Date().toISOString(),
}

function mockApi(items: unknown[] = [], unread = 0) {
  server.use(
    http.get('*/common/notifications', () =>
      HttpResponse.json({ status: true, data: items, meta: { current_page: 1, last_page: 1, per_page: 10, total: items.length, unread_count: unread } })
    ),
    http.post('*/common/notifications/:id/read', () => HttpResponse.json({ status: true, data: { unread_count: 0 } }))
  )
}

function renderBell() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<NotificationBell />} />
      <Route path="/clients/:id" element={<p>Borrower page</p>} />
    </Routes>
  )
}

describe('NotificationBell › lead converted on the partner\'s behalf', () => {
  beforeEach(() => {
    fake = createFakeEcho()
    setAuthState({ token: 't', user: { id: 21 } as any })
  })

  afterEach(() => {
    clearAuthState()
    vi.clearAllMocks()
  })

  it('arrives live, bumping the badge and joining the list', async () => {
    mockApi()
    const user = userEvent.setup()
    renderBell()
    await user.click(await screen.findByRole('button', { name: /notifications/i }))
    await waitFor(() => expect(screen.queryByText('Your lead was converted to a borrower')).not.toBeInTheDocument())

    act(() => {
      fake.emitNotification(CHANNEL, { ...CONVERTED, is_read: undefined })
    })

    expect(await screen.findByText('1')).toBeInTheDocument()
    expect(screen.getByText('Your lead was converted to a borrower')).toBeInTheDocument()
  })

  it('tells the partner who converted which lead, and opens the borrower', async () => {
    mockApi([CONVERTED], 1)
    const user = userEvent.setup()
    renderBell()

    await user.click(await screen.findByRole('button', { name: /notifications/i }))
    expect(await screen.findByText('Your lead was converted to a borrower')).toBeInTheDocument()
    expect(screen.getByText('Host Co converted your lead Lee Lead to a borrower on your behalf.')).toBeInTheDocument()

    await user.click(screen.getByText('Your lead was converted to a borrower'))
    expect(await screen.findByText('Borrower page')).toBeInTheDocument()
  })
})
