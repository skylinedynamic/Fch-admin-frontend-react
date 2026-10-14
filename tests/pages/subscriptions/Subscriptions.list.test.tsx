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
import Subscriptions from '../../../src/pages/subscriptions/Subscriptions'

describeListPage(
  {
    name: 'Subscriptions',
    page: () => <Subscriptions />,
    path: '/subscriptions',
    view: ['view subscriptions'],
    list: { method: 'post', path: '/common/subscriptions/fetch-all' },
    rows: [
      { id: 1101, subscriber_name: 'Acme Funding', entity_type: 'Partner', enrollment_type: 'Monthly', payable_amount: '499.00', subscription_start_date: '2026-01-01', subscription_end_date: '2026-12-31', created_at: '2026-01-01', status: 'Active' },
      { id: 1102, subscriber_name: 'Johnathan Smithfield', entity_type: 'Borrower', enrollment_type: 'Installment', payable_amount: '1200.00', subscription_start_date: '2026-02-01', subscription_end_date: '2026-08-01', created_at: '2026-02-01', status: 'Expired' },
    ],
    shows: ['Acme Funding', 'Johnathan Smithfield', 'Installment'],
    emptyText: 'No subscriptions found',
    search: { placeholder: 'Search subscriptions...', apply: 'enter' },
    clear: false,
  },
  toast
)
