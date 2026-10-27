import { vi } from 'vitest'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
// Summernote (reached through shared modals) needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import { toast } from 'react-toastify'
import { describeListPage } from '../../pages/listPageSuite'
import Employees from '../../../src/pages/employees/Employees'

describeListPage(
  {
    name: 'Employees',
    page: () => <Employees />,
    path: '/employees',
    view: ['view employees'],
    list: { method: 'post', path: '/common/employees/fetch-employees' },
    rows: [
      { id: 7, full_name: 'Adam Stone', first_name: 'Adam', last_name: 'Stone', employee_code: 'E-007', email: 'adam@host.test', department: 'Sales', designation: 'Rep', job_status: 'Active' },
    ],
    shows: ['Adam Stone'],
    emptyText: 'No employees found',
    sort: { initial: { field: 'id', order: 'desc' }, header: 'Employee Name', field: 'full_name' },
  },
  toast
)
