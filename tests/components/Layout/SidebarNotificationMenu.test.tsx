import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import Sidebar from '../../../src/components/Layout/Sidebar'
import { useAuthStore } from '../../../src/store/auth'

let countRequests = 0
const unread = (count: number) =>
  server.use(
    http.get('*/common/notifications/unread-count', () => {
      countRequests += 1
      return HttpResponse.json({ status: true, data: { unread_count: count } })
    })
  )

describe('Sidebar "Notification" menu', () => {
  beforeEach(() => {
    countRequests = 0
    // No permissions at all: the menu is for every signed-in user.
    useAuthStore.setState({ token: 't', user: { id: 1, name: 'Pat Partner', permissions: [] }, userSubscription: null } as never)
  })

  it('links to the notifications page with the unread count', async () => {
    unread(4)
    renderWithProviders(<Sidebar />)

    // The menu re-renders once the count arrives, so find the link by its final name.
    const link = await screen.findByRole('link', { name: /^notification\s*4$/i })
    expect(link).toHaveAttribute('href', '/notifications')
  })

  it('shows no badge when everything is read', async () => {
    unread(0)
    renderWithProviders(<Sidebar />)

    await waitFor(() => expect(countRequests).toBeGreaterThan(0))

    // Exactly "Notification": no "0" badge appended.
    expect(await screen.findByRole('link', { name: /^notification$/i })).toHaveAttribute('href', '/notifications')
  })

  it('stays usable when the subscription is restricted (the bell works there too)', () => {
    unread(0)
    useAuthStore.setState({ userSubscription: { is_free_trail: true, free_trail_end_date: '2000-01-01' } } as never)
    renderWithProviders(<Sidebar />)

    expect(screen.getByRole('link', { name: /^notification/i })).toHaveAttribute('href', '/notifications')
  })
})
