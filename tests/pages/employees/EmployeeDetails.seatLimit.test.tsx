import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'

// Summernote (reached through the shared modals) needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

import EmployeeDetails from '../../../src/pages/employees/EmployeeDetails'

/**
 * "Create account" on a new employee checks the seat limit exactly as the
 * Users page's Add User does: a partner on a free trial at the limit is told
 * it is a paid feature (no purchase offered), a partner on a paid plan is
 * offered a seat to buy.
 */
const reset = () => useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })

function mockApi(count: { count: number; seat_limit: number; per_user_price: number }) {
  server.use(
    http.get('*/common/user-details', () => HttpResponse.json({ status: true, data: {} })),
    http.post('*/common/roles/fetch-roles', () => HttpResponse.json({ status: true, data: [] })),
    http.post('*/common/departments/fetch-departments', () => HttpResponse.json({ status: true, data: [] })),
    http.get('*/common/employees-next-id', () => HttpResponse.json({ status: true, data: { next_id: 5 } })),
    http.get('*/common/user-count', () => HttpResponse.json({ status: true, data: count }))
  )
}

const signInAs = (subscription: Record<string, unknown>) =>
  useAuthStore.setState({
    token: 't',
    user: { id: 1, is_host: 0, entity_type: 'Partner', permissions: ['view employees', 'create employees'] } as never,
    userSubscription: subscription as never,
  })

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/employees/add" element={<EmployeeDetails />} />
    </Routes>,
    { route: '/employees/add' }
  )

/** Not shown: either not in the page or hidden. */
const expectNotShown = (text: string) => {
  const el = screen.queryByText(text)
  if (el) expect(el).not.toBeVisible()
}

const tickCreateAccount = async () => {
  const checkbox = await screen.findByRole('checkbox', { name: /create/i, hidden: true })
  await userEvent.click(checkbox)
  return checkbox
}

describe('Employee › Create account at the seat limit', () => {
  beforeEach(reset)
  afterEach(reset)

  it('tells a partner on a free trial it is a paid feature, without offering a purchase', async () => {
    signInAs({ is_free_trail: true, user_seats: 3 })
    mockApi({ count: 3, seat_limit: 3, per_user_price: 49 })
    renderPage()

    const checkbox = await tickCreateAccount()

    expect(await screen.findByText(/This feature is available in Paid version/)).toBeInTheDocument()
    expect(screen.getByText(/users in Free trial/)).toBeInTheDocument()
    expect(screen.getByText('Paid Version Only')).toBeVisible()
    expectNotShown('User Limit Reached')
    await waitFor(() => expect(checkbox).not.toBeChecked())
  })

  it('offers a partner on a paid plan a seat to buy', async () => {
    signInAs({ is_free_trail: false, user_seats: 3 })
    mockApi({ count: 3, seat_limit: 3, per_user_price: 49 })
    renderPage()

    const checkbox = await tickCreateAccount()

    await waitFor(() => expect(screen.getByText('User Limit Reached')).toBeVisible())
    expectNotShown('Paid Version Only')
    await waitFor(() => expect(checkbox).not.toBeChecked())
  })

  it('leaves the box ticked while seats are left', async () => {
    signInAs({ is_free_trail: true, user_seats: 3 })
    mockApi({ count: 1, seat_limit: 3, per_user_price: 49 })
    renderPage()

    const checkbox = await tickCreateAccount()

    await waitFor(() => expect(checkbox).toBeChecked())
    expectNotShown('Paid Version Only')
    expectNotShown('User Limit Reached')
  })
})
