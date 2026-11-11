import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

// The real payment window (Stripe, cash, ...) has its own tests; here it only
// has to report back that the invoice was paid or that it was closed.
vi.mock('../../../src/pages/invoices/components/InvoicePaymentModal', () => ({
  default: ({ show, onHide, onSuccess }: { show: boolean; onHide: () => void; onSuccess: () => void }) =>
    show ? (
      <div>
        <button type="button" onClick={onSuccess}>Pay invoice</button>
        <button type="button" onClick={onHide}>Close payment window</button>
      </div>
    ) : null,
}))

// Summernote (reached through the shared modals) needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'

import EmployeeDetails from '../../../src/pages/employees/EmployeeDetails'

/**
 * Defect (BUG-165 retest 10-Nov-26): creating an employee with "Create account"
 * when no seat was free went Buy seat -> Save -> "Employee created
 * successfully" -> payment window, and after paying the page reloaded
 * /employees/create with an empty form instead of leaving it. The employee
 * exists by then, so - as without a purchase - the new employee's details open.
 */
beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({
    token: 't',
    user: { id: 9, is_host: 0, entity_type: 'Partner', partner_id: 5, permissions: ['view employees', 'create employees', 'update employees'] } as never,
    userSubscription: { is_host: false, is_free_trail: false, user_seats: 3, subscription_status: 'Active', subscription_end_date: '2999-01-01' } as never,
  })
  server.use(
    http.get('*/common/user-count', () => HttpResponse.json({ status: true, data: { count: 3, seat_limit: 3, per_user_price: 49 } })),
    http.post('*/common/employees', () =>
      HttpResponse.json({
        status: true,
        message: 'Employee created successfully',
        data: { employee: { id: 85 }, user: { id: 300, invoice_id: 77, entity_id: 85, entity_type: 'Employee' } },
      })
    ),
    http.get('*/common/employees-next-id', () => HttpResponse.json({ status: true, data: { next_id: 5 } })),
    http.all('*', () => HttpResponse.json({ status: true, data: [] }))
  )
})
afterEach(() => server.resetHandlers())

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path="/employees/create" element={<EmployeeDetails />} />
      <Route path="/employee-details/:id" element={<div>Employee 85 details page</div>} />
    </Routes>,
    { route: '/employees/create' }
  )

const buySeatAndSave = async () => {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('checkbox', { name: /create/i, hidden: true }))
  await waitFor(() => expect(screen.getByText('User Limit Reached')).toBeVisible())
  await user.click(screen.getByRole('button', { name: /^\s*proceed\s*$/i }))
  await user.click(await screen.findByRole('button', { name: /^\s*save\s*$/i }))
  await screen.findByRole('button', { name: 'Pay invoice' })
  return user
}

describe('EmployeeDetails › creating an employee with a bought seat', () => {
  it("opens the new employee's details once the seat is paid for", async () => {
    renderPage()
    const user = await buySeatAndSave()

    await user.click(screen.getByRole('button', { name: 'Pay invoice' }))

    expect(await screen.findByText('Employee 85 details page')).toBeInTheDocument()
  })

  it('leaves the create form when the payment window is closed unpaid, as the employee already exists', async () => {
    renderPage()
    const user = await buySeatAndSave()

    await user.click(screen.getByRole('button', { name: 'Close payment window' }))

    expect(await screen.findByText('Employee 85 details page')).toBeInTheDocument()
  })

  it('opens the employee list when the create response names no employee', async () => {
    server.use(
      http.post('*/common/employees', () =>
        HttpResponse.json({ status: true, message: 'Employee created successfully', data: { user: { id: 300, invoice_id: 77 } } })
      )
    )
    renderWithProviders(
      <Routes>
        <Route path="/employees/create" element={<EmployeeDetails />} />
        <Route path="/employees" element={<div>Employee list page</div>} />
      </Routes>,
      { route: '/employees/create' }
    )
    const user = await buySeatAndSave()

    await user.click(screen.getByRole('button', { name: 'Pay invoice' }))

    expect(await screen.findByText('Employee list page')).toBeInTheDocument()
  })
})
