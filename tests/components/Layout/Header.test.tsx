import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, screen } from '../../test-utils'
import { server } from '../../mocks/server'
import { setAuthState, clearAuthState } from '../../../src/store/auth'

vi.mock('../../../src/lib/realtime/echo', () => ({
  getEcho: () => null,
  disconnectEcho: () => {},
  userChannelName: (id: number | string) => `App.Models.User.${id}`,
}))

import Header from '../../../src/components/Layout/Header'

afterEach(() => clearAuthState())

describe('Header', () => {
  it('shows the notification bell with the unread count', async () => {
    setAuthState({ token: 't', user: { id: 5, name: 'Pat Partner' } as any })
    server.use(
      http.get('*/common/notifications', () =>
        HttpResponse.json({ status: true, data: [], meta: { current_page: 1, last_page: 1, per_page: 10, total: 0, unread_count: 2 } })
      )
    )

    renderWithProviders(<Header />)

    expect(await screen.findByRole('button', { name: /notifications, 2 unread/i })).toBeInTheDocument()
  })
})
