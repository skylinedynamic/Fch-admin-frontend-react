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
import Payments from '../../../src/pages/payments/Payments'

describeListPage(
  {
    name: 'Payments',
    page: () => <Payments />,
    path: '/payments',
    view: ['view payments'],
    list: { method: 'post', path: '/common/payments/fetch-payments' },
    rows: [
      { id: 901, transaction_date: '2026-03-02', invoice_id: 'INV-1001', from: 'Bank Transfer', transaction_type: 'Subscription', partner_name: 'Acme Funding', amount: '$499.00', status: 'Processing', is_environment: 'live' },
      { id: 902, transaction_date: '2026-03-03', invoice_id: 'INV-1002', from: 'Card', transaction_type: 'Enrollment', borrower_name: 'Johnathan Smithfield', amount: '$1,200.00', status: 'Paid', is_environment: 'live' },
    ],
    shows: ['INV-1001', 'INV-1002', 'Johnathan Smithfield', '$1,200.00'],
    emptyText: 'No payments found.',
    search: { placeholder: 'Search...', apply: 'enter' },
    clear: false,
  },
  toast
)
