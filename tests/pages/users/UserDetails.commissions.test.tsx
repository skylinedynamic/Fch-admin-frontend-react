import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'

// Summernote (reached through the shared modals) needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

import UserDetails from '../../../src/pages/users/UserDetails'

const reset = () => useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })

let compensationRequests = 0

function mockApi() {
  compensationRequests = 0
  server.use(
    http.get('*/common/user-details', () => HttpResponse.json({ status: true, data: {} })),
    http.post('*/common/roles/fetch-roles', () => HttpResponse.json({ status: true, data: [] })),
    http.get('*/common/users/7', () =>
      HttpResponse.json({ status: true, data: { id: 7, name: 'Sam Sales', email: 'sam@example.com', phone_number: '111', role_id: null, status: 'active' } })
    ),
    http.post('*/common/compensations/fetch-compensation', () => {
      compensationRequests += 1
      return HttpResponse.json({ status: true, data: { paid_by: 'none', compensations: [] } })
    })
  )
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/users/:id" element={<UserDetails />} />
    </Routes>,
    { route: '/users/7' }
  )
}

const signInAs = (user: Record<string, unknown>) =>
  useAuthStore.setState({ token: 't', user: { id: 1, permissions: ['view users', 'update users'], ...user } as never })

describe('UserDetails Commissions tab', () => {
  beforeEach(() => { reset(); mockApi() })
  afterEach(reset)

  it('is shown to a host partner', async () => {
    signInAs({ is_host: 1, entity_type: 'Partner' })
    renderPage()

    expect(await screen.findByRole('tab', { name: /commissions/i })).toBeInTheDocument()
    await waitFor(() => expect(compensationRequests).toBe(1))
  })

  it.each([
    ['a non-host partner', { is_host: 0, entity_type: 'Partner' }],
    ['a host whose entity_type is not Partner', { is_host: 1, entity_type: 'Employee' }],
  ])('is hidden from %s, and its data is never requested', async (_label, user) => {
    signInAs(user)
    renderPage()

    expect(await screen.findByRole('tab', { name: /user information/i })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /commissions/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/commission or flat amount|paid by/i)).not.toBeInTheDocument()
    expect(compensationRequests).toBe(0)
  })
})
