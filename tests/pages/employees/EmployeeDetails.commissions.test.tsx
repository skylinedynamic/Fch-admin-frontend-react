import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

const reset = () => useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })

let compensationFetches = 0
let compensationSaves: unknown[] = []

function mockApi() {
  compensationFetches = 0
  compensationSaves = []
  server.use(
    http.get('*/common/user-details', () => HttpResponse.json({ status: true, data: {} })),
    http.post('*/common/roles/fetch-roles', () => HttpResponse.json({ status: true, data: [] })),
    http.post('*/common/departments/fetch-departments', () => HttpResponse.json({ status: true, data: [] })),
    http.get('*/common/employees-next-id', () => HttpResponse.json({ status: true, data: { next_id: 5 } })),
    http.get('*/common/employees/9', () =>
      HttpResponse.json({ status: true, data: { id: 9, first_name: 'Eve', last_name: 'Employee', email: 'eve@example.com' } })
    ),
    http.post('*/common/employees', () => HttpResponse.json({ status: true, data: { employee: { id: 77 } } })),
    http.post('*/common/compensations/fetch-compensation', () => {
      compensationFetches += 1
      return HttpResponse.json({ status: true, data: { paid_by: 'none', compensations: [] } })
    }),
    http.post('*/common/compensations', async ({ request }) => {
      compensationSaves.push(await request.json())
      return HttpResponse.json({ status: true, data: { paid_by: 'none', compensations: [] } })
    })
  )
}

function renderPage(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/employees/add" element={<EmployeeDetails />} />
      <Route path="/employees/:id" element={<EmployeeDetails />} />
    </Routes>,
    { route }
  )
}

const signInAs = (user: Record<string, unknown>) =>
  useAuthStore.setState({
    token: 't',
    user: { id: 1, permissions: ['view employees', 'create employees', 'update employees'], ...user } as never,
  })

const HOST_PARTNER = { is_host: 1, entity_type: 'Partner' }
const NON_HOST_PARTNER = { is_host: 0, entity_type: 'Partner' }

describe('EmployeeDetails Commissions tab', () => {
  beforeEach(() => { reset(); mockApi() })
  afterEach(reset)

  it('is shown to a host partner', async () => {
    signInAs(HOST_PARTNER)
    renderPage('/employees/9')

    expect(await screen.findByRole('tab', { name: /commissions/i })).toBeInTheDocument()
    await waitFor(() => expect(compensationFetches).toBe(1))
  })

  it.each([
    ['a non-host partner', NON_HOST_PARTNER],
    ['a host whose entity_type is not Partner', { is_host: 1, entity_type: 'Employee' }],
  ])('is hidden from %s, and its data is never requested', async (_label, user) => {
    signInAs(user)
    renderPage('/employees/9')

    expect(await screen.findByRole('tab', { name: /personal information/i })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /commissions/i })).not.toBeInTheDocument()
    expect(compensationFetches).toBe(0)
  })

  it('creating an employee also saves their commission setup for a host partner', async () => {
    signInAs(HOST_PARTNER)
    const user = userEvent.setup()
    renderPage('/employees/add')

    await user.click(await screen.findByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(compensationSaves).toHaveLength(1))
    expect(compensationSaves[0]).toMatchObject({ entity_id: 77 })
  })

  it('creating an employee never touches commission data for anyone else', async () => {
    signInAs(NON_HOST_PARTNER)
    let created = false
    server.use(
      http.post('*/common/employees', () => {
        created = true
        return HttpResponse.json({ status: true, data: { employee: { id: 77 } } })
      })
    )
    const user = userEvent.setup()
    renderPage('/employees/add')

    await user.click(await screen.findByRole('button', { name: /^save$/i }))

    await waitFor(() => expect(created).toBe(true))
    expect(compensationSaves).toHaveLength(0)
  })
})
