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
import CommissionList from '../../../src/pages/commissions/CommissionList'

describeListPage(
  {
    name: 'Commissions',
    page: () => <CommissionList />,
    path: '/commissions',
    view: ['view commission'],
    list: { method: 'post', path: '/common/commissions' },
    rows: [
      { id: 1201, date: '2026-03-01', borrower: 'Johnathan Smithfield', partner: 'Acme Funding', commission_status: 'Approved', requested_amount: 100000, funded_amount: 90000, admin_commission_amount: 4500, partner_commission_amount: 2700, payment_status: 'Unpaid' },
    ],
    shows: ['Johnathan Smithfield', 'Acme Funding'],
    emptyText: 'No commissions found',
    search: { placeholder: 'Search borrower or ID...' },
  },
  toast
)
