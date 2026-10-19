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
import LendersList from '../../../src/pages/lenders/LendersList'

describeListPage(
  {
    name: 'Lenders',
    page: () => <LendersList />,
    path: '/lenders',
    list: { method: 'get', path: '/admin/lenders' },
    rows: [
      { id: 61, name: 'First Capital', legal_name: 'First Capital LLC', product_categories: [], contact_name: 'Fay First', contact_phone: '(555) 600-0001', iso_status: 'Approved', status: 'Active' },
      { id: 62, name: 'Second Street', legal_name: 'Second Street Inc', product_categories: [], contact_name: 'Sam Second', contact_phone: '(555) 600-0002', iso_status: 'Pending', status: 'Inactive' },
    ],
    shows: ['First Capital LLC', 'Second Street Inc', 'Fay First', 'Inactive'],
    emptyText: 'No lenders found',
    search: { placeholder: 'Search lenders...' },
    create: { label: /add lender/i, role: 'button', target: '/lenders/create' },
    // No selection check here: this table always renders its checkbox column; only the
    // "Delete Selected" action behind it is permission-gated.
    bulkDelete: {
      // The selection goes in one call, all or none (was one DELETE per lender).
      permission: 'delete lenders', method: 'post', path: '/admin/lenders/multiple-delete', body: (ids) => ({ ids }),
      successToast: 'Selected lenders deleted successfully', errorToast: 'Lender is used by a funding sequence.',
    },
  },
  toast
)
