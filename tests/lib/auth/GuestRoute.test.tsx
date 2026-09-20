import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { useAuthStore } from '../../../src/store/auth'
import GuestRoute from '../../../src/lib/auth/GuestRoute'

const reset = () => useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<div>Login Page</div>} />
        </Route>
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>
  )

describe('GuestRoute', () => {
  beforeEach(reset)
  afterEach(reset)

  it('renders the guest page when there is no token', () => {
    renderAt('/login')
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('redirects an already-authenticated visitor away from the guest page', () => {
    useAuthStore.setState({ token: 'abc' })
    renderAt('/login')
    expect(screen.getByText('Home Page')).toBeInTheDocument()
  })
})
