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
import Invoices from '../../../src/pages/invoices/Invoices'

describeListPage(
  {
    name: 'Invoices',
    page: () => <Invoices />,
    path: '/invoices',
    view: ['view invoices'],
    list: { method: 'post', path: '/common/invoices/fetch-invoices' },
    rows: [
      { id: 1001, created_at: '2026-03-01', invoice_id: 'INV-1001', customer_name: 'Acme Funding', payment_amount: '$499.00', type: 'Subscription', status: 'Unpaid' },
      { id: 1002, created_at: '2026-03-02', invoice_id: 'INV-1002', customer_name: 'Johnathan Smithfield', payment_amount: '$1,200.00', type: 'Enrollment', status: 'Paid' },
    ],
    shows: ['INV-1001', 'INV-1002'],
    emptyText: 'No invoices found.',
    search: { placeholder: 'Search invoices...' },
  },
  toast
)
