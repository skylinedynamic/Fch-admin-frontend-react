import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import { useAuthStore } from '../../../src/store/auth'
import { logout } from '../../../src/lib/auth/authApi'

vi.mock('../../../src/lib/auth/authApi', () => ({ logout: vi.fn(() => Promise.resolve({ status: true })) }))

import ProtectedRoute from '../../../src/lib/auth/ProtectedRoute'

const reset = () => useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path={path} element={<div>Protected Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  )

describe('ProtectedRoute', () => {
  beforeEach(reset)
  afterEach(() => {
    reset()
    vi.clearAllMocks()
  })

  it('redirects to /login when there is no token', () => {
    renderAt('/settings')
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('renders the protected content when authenticated with no free-trial restriction', () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1 } })
    renderAt('/settings')
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('renders the protected content while on an active (non-expired) free trial', () => {
    const future = new Date()
    future.setDate(future.getDate() + 10)
    useAuthStore.setState({
      token: 'abc',
      user: { id: 1 },
      userSubscription: { is_free_trail: true, free_trail_end_date: future.toISOString().slice(0, 10) },
    })
    renderAt('/settings')
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('logs out and redirects once the free trial end date has passed', async () => {
    const past = new Date()
    past.setDate(past.getDate() - 10)
    useAuthStore.setState({
      token: 'abc',
      user: { id: 1 },
      userSubscription: { is_free_trail: true, free_trail_end_date: past.toISOString().slice(0, 10) },
    })
    renderAt('/settings')

    await waitFor(() => expect(logout).toHaveBeenCalled())
    await waitFor(() => expect(useAuthStore.getState().token).toBeUndefined())
  })
})
