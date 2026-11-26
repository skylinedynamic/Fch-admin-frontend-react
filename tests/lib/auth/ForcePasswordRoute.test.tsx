import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { useAuthStore } from '../../../src/store/auth'
import ForcePasswordRoute from '../../../src/lib/auth/ForcePasswordRoute'
import { FORCE_PASSWORD_ROUTE, PORTAL_HOME_ROUTE } from '../../../src/config/passwordChange'

const reset = () => useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })

const renderScreen = () =>
  render(
    <MemoryRouter initialEntries={[FORCE_PASSWORD_ROUTE]}>
      <Routes>
        <Route element={<ForcePasswordRoute />}>
          <Route path={FORCE_PASSWORD_ROUTE} element={<div>Set Password Page</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path={PORTAL_HOME_ROUTE} element={<div>Dashboard Page</div>} />
      </Routes>
    </MemoryRouter>
  )

// The Set password screen: only for a signed-in user who must change their password.
describe('ForcePasswordRoute', () => {
  beforeEach(reset)
  afterEach(reset)

  it('shows the screen to a user who must change their password', () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, must_change_password: true } })
    renderScreen()
    expect(screen.getByText('Set Password Page')).toBeInTheDocument()
  })

  it('sends a user who already chose their password to the portal home', () => {
    useAuthStore.setState({ token: 'abc', user: { id: 1, must_change_password: false } })
    renderScreen()
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
  })

  it('sends a signed-out visitor to sign in', () => {
    renderScreen()
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })
})
