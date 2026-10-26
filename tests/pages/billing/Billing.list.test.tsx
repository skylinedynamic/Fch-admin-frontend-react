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
import Billing from '../../../src/pages/billing/Billing'

describeListPage(
  {
    name: 'Upcoming billing',
    page: () => <Billing />,
    path: '/billing',
    view: ['view subscriptions'],
    list: { method: 'post', path: '/common/billing/fetch-upcoming' },
    rows: [
      { id: 1, subscription_id: 1101, subscriber_name: 'Acme Funding', upcoming_billing_type: 'Platform Fee', upcoming_billing_amount: '499.00', upcoming_billing_date: '2026-04-01', outstanding_amount: '0.00', enrollment_type: 'Monthly', status: 'Active' },
    ],
    shows: ['Acme Funding', 'Monthly'],
    emptyText: 'No upcoming billing found',
    search: { placeholder: 'Search by name, email...', apply: 'enter' },
  },
  toast
)
