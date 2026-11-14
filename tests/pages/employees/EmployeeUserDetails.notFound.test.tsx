import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders, screen } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'

// Summernote (reached through the shared modals) needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

import EmployeeDetails from '../../../src/pages/employees/EmployeeDetails'
import UserDetails from '../../../src/pages/users/UserDetails'

/**
 * Defect (BUG-164, PP-EMP-11): on a partner portal, opening a host employee
 * or user by id (/employee-details/1, /user-details/1) showed an empty
 * details form with an Update button and no message - the API answers 404,
 * the page ignored it. As for clients and leads (BUG-030), the page says the
 * record was not found.
 */
const signInPartner = () =>
  useAuthStore.setState({
    token: 't',
    user: { id: 9, is_host: 0, entity_type: 'Partner', partner_id: 5, permissions: ['view employees', 'update employees', 'view users', 'update users'] } as never,
    userSubscription: null,
  })

const notFound = (path: string, message: string) =>
  server.use(
    http.get(`*${path}`, () => HttpResponse.json({ status: false, message }, { status: 404 })),
    http.all('*', () => HttpResponse.json({ status: true, data: [] }))
  )

beforeEach(signInPartner)
afterEach(() => server.resetHandlers())

describe('Employee / User details of a record the viewer may not see', () => {
  it('says the employee was not found, with no form to update', async () => {
    notFound('/common/employees/1', 'Employee not found')
    renderWithProviders(
      <Routes>
        <Route path="/employee-details/:id" element={<EmployeeDetails />} />
      </Routes>,
      { route: '/employee-details/1' }
    )

    expect(await screen.findByText('Employee Not Found')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /update/i })).not.toBeInTheDocument()
  })

  it('says the user was not found, with no form to update', async () => {
    notFound('/common/users/1', 'User not found')
    renderWithProviders(
      <Routes>
        <Route path="/user-details/:id" element={<UserDetails />} />
      </Routes>,
      { route: '/user-details/1' }
    )

    expect(await screen.findByText('User Not Found')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /update/i })).not.toBeInTheDocument()
  })
})
