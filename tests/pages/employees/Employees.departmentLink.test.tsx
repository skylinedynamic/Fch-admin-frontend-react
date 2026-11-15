import { describe, expect, it, vi } from 'vitest'
import { waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import Employees from '../../../src/pages/employees/Employees'

/**
 * "View Employees" on a department that cannot be deleted opens
 * /employees?department=<name>: the list starts filtered to that department.
 */
describe('Employees list opened for one department', () => {
  it('asks only for the employees in the department named in the link', async () => {
    signIn({ permissions: ['view employees'] })
    allowBackgroundCalls()
    const list = api('post', '/common/employees/fetch-employees', { status: true, message: 'ok', data: { employees: [], meta: { total: 0 } } })

    renderPage(<Employees />, { path: '/employees', route: '/employees?department=Sales%20%26%20Ops' })

    await waitFor(() => expect(list.calls).toBeGreaterThan(0))
    expect(list.bodies[0]).toMatchObject({ department: 'Sales & Ops' })
  })

  it('asks for every department without the link', async () => {
    signIn({ permissions: ['view employees'] })
    allowBackgroundCalls()
    const list = api('post', '/common/employees/fetch-employees', { status: true, message: 'ok', data: { employees: [], meta: { total: 0 } } })

    renderPage(<Employees />, { path: '/employees' })

    await waitFor(() => expect(list.calls).toBeGreaterThan(0))
    expect(list.bodies[0]).toMatchObject({ department: '' })
  })
})
