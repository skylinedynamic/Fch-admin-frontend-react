import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { renderWithProviders, screen } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'
import Users from '../../../src/pages/users/Users'

function CreatePage() {
  const location = useLocation()
  return <div>Add user page {JSON.stringify(location.state ?? null)}</div>
}

function renderUsers() {
  return renderWithProviders(
    <Routes>
      <Route path="/users" element={<Users />} />
      <Route path="/users/create" element={<CreatePage />} />
    </Routes>,
    { route: '/users' }
  )
}

beforeEach(() => {
  server.use(
    http.post('*/common/users/fetch-users', () => HttpResponse.json({ status: true, data: [], meta: { total: 0 } })),
    http.post('*/common/roles/fetch-roles', () => HttpResponse.json({ status: true, data: [] }))
  )
})
afterEach(() => server.resetHandlers())

describe('Users - Add User', () => {
  it('opens the add user page instead of a modal', async () => {
    useAuthStore.setState({ user: { id: 1, is_host: 1, permissions: ['view users', 'create users'] } } as never)
    const user = userEvent.setup()
    renderUsers()

    await user.click(await screen.findByRole('button', { name: /add user/i }))

    expect(await screen.findByText(/add user page null/i)).toBeInTheDocument()
  })

  it('checks the seat limit first for a non-host partner, then opens the page', async () => {
    useAuthStore.setState({ user: { id: 1, is_host: 0, permissions: ['view users', 'create users'] }, userSubscription: { user_seats: 5 } } as never)
    const countCheck = vi.fn()
    server.use(
      http.get('*/common/user-count', () => {
        countCheck()
        return HttpResponse.json({ status: true, data: { count: 2, seat_limit: 5, per_user_price: '49.00' } })
      })
    )
    const user = userEvent.setup()
    renderUsers()

    await user.click(await screen.findByRole('button', { name: /add user/i }))

    expect(await screen.findByText(/add user page null/i)).toBeInTheDocument()
    expect(countCheck).toHaveBeenCalledOnce()
  })
})
