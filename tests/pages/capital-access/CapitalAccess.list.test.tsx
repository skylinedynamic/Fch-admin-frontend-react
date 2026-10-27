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
import CapitalAccessList from '../../../src/pages/capital-access/CapitalAccessList'

describeListPage(
  {
    name: 'Capital access',
    page: () => <CapitalAccessList />,
    path: '/capital-access',
    list: { method: 'post', path: '/common/capital-accesses/fetch-all' },
    rows: [
      { id: 81, name: 'Foundation 100 Play', sub_title: 'Build your base', target_exposure_min: 75000, target_exposure_max: 150000, status: 'Active', credit_accounts: [] },
      { id: 82, name: 'Growth 250 Play', sub_title: 'Scale up', target_exposure_min: 150000, target_exposure_max: 250000, status: 'Inactive', credit_accounts: [] },
    ],
    shows: ['Foundation 100 Play', 'Growth 250 Play', 'Inactive'],
    emptyText: 'No capital programs found',
    sort: { initial: { field: 'id', order: 'desc' }, header: 'Program Name', field: 'name' },
    search: { placeholder: 'Search capital programs...' },
    create: { permission: 'create credit accounts', label: /add capital program/i, role: 'link', target: '/capital-access/create' },
    selection: { permission: 'delete credit accounts' },
    bulkDelete: {
      permission: 'delete credit accounts', method: 'delete', path: '/common/capital-accesses/81',
      successToast: 'Capital programs deleted successfully', errorToast: 'Failed to delete capital programs',
    },
  },
  toast
)
