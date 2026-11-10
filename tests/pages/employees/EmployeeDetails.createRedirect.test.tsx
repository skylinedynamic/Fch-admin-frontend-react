import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { toast } from 'react-toastify'
import { renderWithProviders, screen } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'

// Summernote (reached through the shared modals) needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

import EmployeeDetails from '../../../src/pages/employees/EmployeeDetails'

/**
 * Defect (BUG-165, PP-EMP-09): after "Employee created successfully" the page
 * stayed on /employees/create with the form still filled in, so a second Save
 * answered "Email is already in use." as if the first had failed. A created
 * employee opens on its own details page, as a created lead does.
 */
beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({
    token: 't',
    user: { id: 9, is_host: 0, entity_type: 'Partner', partner_id: 5, permissions: ['view employees', 'create employees', 'update employees'] } as never,
    userSubscription: { is_host: false, subscription_status: 'Active', subscription_end_date: '2999-01-01' } as never,
  })
  server.use(
    http.post('*/common/employees', () =>
      HttpResponse.json({ status: true, message: 'Employee created successfully', data: { employee: { id: 42 } } })
    ),
    http.get('*/common/employees-next-id', () => HttpResponse.json({ status: true, data: { next_id: 5 } })),
    http.all('*', () => HttpResponse.json({ status: true, data: [] }))
  )
})
afterEach(() => server.resetHandlers())

describe('EmployeeDetails › after creating an employee', () => {
  it("opens the new employee's details instead of keeping the filled form", async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route path="/employees/create" element={<EmployeeDetails />} />
        <Route path="/employee-details/:id" element={<div>Employee 42 details page</div>} />
      </Routes>,
      { route: '/employees/create' }
    )

    await user.click(await screen.findByRole('button', { name: /^\s*save\s*$/i }))

    expect(await screen.findByText('Employee 42 details page')).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Employee created successfully')
  })
})
