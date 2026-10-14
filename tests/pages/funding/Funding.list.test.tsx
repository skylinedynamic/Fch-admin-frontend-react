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
import FundingList from '../../../src/pages/funding/FundingList'

describeListPage(
  {
    name: 'Funding sequences',
    page: () => <FundingList />,
    path: '/funding',
    list: { method: 'post', path: '/common/funding-sequencings/fetch' },
    rows: [
      { id: 201, name: 'SBA 7(a)', group: { id: 1, name: 'Business Loans' }, type: { id: 1, name: 'SBA Loan' }, amount_range: '$50k - $5M', terms: '10 years', status: 'Active' },
      { id: 202, name: 'Working Capital Line', group: { id: 2, name: 'Credit Lines' }, type: { id: 2, name: 'Term Loan' }, amount_range: '$10k - $250k', terms: 'Revolving', status: 'Inactive' },
    ],
    shows: ['SBA 7(a)', 'Working Capital Line', 'Credit Lines', 'Revolving'],
    emptyText: 'No funding found',
    search: { placeholder: 'Search here...' },
    create: { label: /add funding sequence/i, role: 'link', target: '/funding/create' },
    bulkDelete: {
      permission: '', method: 'delete', path: '/admin/funding-sequencings/201',
      successToast: 'Funding options deleted successfully', errorToast: 'Failed to delete funding options',
    },
  },
  toast
)
