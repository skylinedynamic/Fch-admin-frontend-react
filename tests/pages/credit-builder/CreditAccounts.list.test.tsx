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
import CreditAccountsList from '../../../src/pages/credit-builder/credit-accounts/CreditAccountsList'

describeListPage(
  {
    name: 'Credit accounts',
    page: () => <CreditAccountsList />,
    path: '/credit-accounts',
    list: { method: 'post', path: '/admin/credit-builder/credit-accounts/fetch-accounts' },
    rows: [
      { id: 71, card_name: 'Ink Business Cash', issuer: 'Chase', credit_category: 'Business Card', typical_personal_fico_min: 680, time_in_business_min_months: 6, status: 'Active' },
      { id: 72, card_name: 'Spark Classic', issuer: 'Capital One', credit_category: 'Business Card', typical_personal_fico_min: 640, time_in_business_min_months: 0, status: 'Inactive' },
    ],
    shows: ['Ink Business Cash', 'Spark Classic', 'Capital One'],
    // BUG-007: the table said "No available options" (PrimeReact's dropdown default).
    emptyText: 'No credit accounts found',
    sort: { initial: { field: 'id', order: 'desc' }, header: 'Name', field: 'card_name' },
    search: { placeholder: 'Search here...' },
    create: { permission: 'create credit accounts', label: /add account/i, role: 'link', target: '/credit-accounts/create' },
  },
  toast
)
