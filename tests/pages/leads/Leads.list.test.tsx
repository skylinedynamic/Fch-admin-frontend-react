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
import Leads from '../../../src/pages/leads/Leads'

describeListPage(
  {
    name: 'Leads',
    page: () => <Leads />,
    path: '/leads',
    view: ['view leads'],
    list: { method: 'post', path: '/common/leads/fetch-leads' },
    rows: [
      { id: 51, contact_person: 'Lena Lead', company_name: 'Lead Works', email: 'lena@example.test', phone_number: '(555) 010-0001', lead_type: 'Borrower', status: 'New', country: 'United States', state: 'Texas', city: 'Austin', convert_to: null },
      { id: 52, contact_person: 'Cora Converted', company_name: 'Done Deal', email: 'cora@example.test', phone_number: '(555) 010-0003', lead_type: 'Partner', status: 'Won', convert_to: 'Partner' },
    ],
    shows: ['Lena Lead', 'Lead Works', 'cora@example.test', 'Converted as a Partner'],
    emptyText: 'No leads found',
    search: { placeholder: 'Search here...' },
    create: { permission: 'create leads', label: /add lead/i, role: 'button', target: '/leads/create' },
    selection: { permission: 'delete leads' },
    bulkDelete: { permission: 'delete leads', method: 'delete', path: '/common/leads/51', successToast: 'Leads deleted successfully' },
  },
  toast
)
