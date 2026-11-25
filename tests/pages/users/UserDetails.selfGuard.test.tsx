import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders, screen } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'
import { USER_SELF_GUARD_TEXT } from '../../../src/config/statusOptions'

vi.mock('../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

import UserDetails from '../../../src/pages/users/UserDetails'

/**
 * R3-BUG-030: a user could make their own account Inactive or change their own
 * role from their own record (/user-details/1) - the API now refuses both, and
 * the page no longer offers them.
 */
const user = (id: number) => ({ id, name: 'Ada Admin', email: 'ada@example.com', phone_number: '5551234567', role_id: 2, status: 'active' })

const mount = (id: number) => {
  server.use(
    http.get('*/common/user-details', () => HttpResponse.json({ status: true, data: {} })),
    http.post('*/common/roles/fetch-roles', () => HttpResponse.json({ status: true, data: [{ id: 2, name: 'Admin' }, { id: 8, name: 'Support' }] })),
    http.get(`*/common/users/${id}`, () => HttpResponse.json({ status: true, data: user(id) })),
  )
  return renderWithProviders(
    <Routes>
      <Route path="/user-details/:id" element={<UserDetails />} />
    </Routes>,
    { route: `/user-details/${id}` }
  )
}

const dropdownOf = (inputId: string) => document.getElementById(inputId)!.closest('.p-dropdown') as HTMLElement

afterEach(() => {
  server.resetHandlers()
  useAuthStore.setState({ token: undefined, user: null } as never)
})

describe('UserDetails - your own record', () => {
  it("doesn't let you change your own role or status, and says why", async () => {
    useAuthStore.setState({ token: 't', user: { id: 1, is_host: 1, entity_type: 'Employee', permissions: ['view users', 'update users'] } } as never)
    mount(1)

    expect(await screen.findByDisplayValue('Ada Admin')).toBeInTheDocument()
    expect(dropdownOf('role_id')).toHaveClass('p-disabled')
    expect(dropdownOf('status')).toHaveClass('p-disabled')
    expect(screen.getByText(USER_SELF_GUARD_TEXT)).toBeInTheDocument()
  })

  it("still lets you change someone else's", async () => {
    useAuthStore.setState({ token: 't', user: { id: 1, is_host: 1, entity_type: 'Employee', permissions: ['view users', 'update users'] } } as never)
    mount(7)

    expect(await screen.findByDisplayValue('Ada Admin')).toBeInTheDocument()
    expect(dropdownOf('role_id')).not.toHaveClass('p-disabled')
    expect(dropdownOf('status')).not.toHaveClass('p-disabled')
    expect(screen.queryByText(USER_SELF_GUARD_TEXT)).not.toBeInTheDocument()
  })
})
