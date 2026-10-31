import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '../../test-utils'
import { server } from '../../mocks/server'
import { useAuthStore } from '../../../src/store/auth'

vi.mock('../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

import EmployeeDetails from '../../../src/pages/employees/EmployeeDetails'

/**
 * BUG-014 (QA round 2): an employee picture may be up to 5 MB, the API's limit
 * for any image. The form refused anything over 1 MB.
 */
const MB = 1024 * 1024
const picture = (size: number) => {
  const file = new File(['x'], 'portrait.png', { type: 'image/png' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

describe('Employee picture size', () => {
  beforeEach(() => {
    server.use(
      http.get('*/common/user-details', () => HttpResponse.json({ status: true, data: {} })),
      http.post('*/common/roles/fetch-roles', () => HttpResponse.json({ status: true, data: [] })),
      http.post('*/common/departments/fetch-departments', () => HttpResponse.json({ status: true, data: [] })),
      http.get('*/common/employees-next-id', () => HttpResponse.json({ status: true, data: { next_id: 5 } })),
      http.all('*', () => HttpResponse.json({ status: true, data: [] }))
    )
    useAuthStore.setState({
      token: 't',
      user: { id: 1, is_host: 0, entity_type: 'Partner', permissions: ['view employees', 'create employees'] } as never,
    })
  })

  afterEach(() => {
    server.resetHandlers()
    useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })
  })

  const renderPage = () =>
    renderWithProviders(
      <Routes>
        <Route path="/employees/add" element={<EmployeeDetails />} />
      </Routes>,
      { route: '/employees/add' }
    )

  it('takes a 3 MB picture and refuses one over 5 MB', async () => {
    const user = userEvent.setup()
    const { container } = renderPage()
    const input = await vi.waitFor(() => {
      const el = container.querySelector('input[type="file"][name="image"]')
      expect(el).not.toBeNull()
      return el as HTMLInputElement
    })

    await user.upload(input, picture(3 * MB))
    expect(screen.queryByText(/must be less than/i)).toBeNull()

    await user.upload(input, picture(5 * MB + 1))
    expect(await screen.findByText('Image size must be less than 5 MB.')).toBeInTheDocument()
  })
})
