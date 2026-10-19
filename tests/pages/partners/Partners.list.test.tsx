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
import Partners from '../../../src/pages/partners/Partners'

describeListPage(
  {
    name: 'Partners',
    page: () => <Partners />,
    path: '/partners',
    view: ['view partners'],
    list: { method: 'post', path: '/admin/partners/fetch-partners' },
    rows: [
      { id: 5, company_name: 'Acme Funding', full_name: 'Wile Coyote', email: 'wile@acme.test', phone_number: '(444) 444-4444', contact_person: 'Road Runner', partner_type: 'White Label', status: 'active', is_archived: false },
      { id: 6, company_name: 'Globex Capital', full_name: 'Hank Scorpio', email: 'hank@globex.test', phone_number: '(555) 555-5555', contact_person: 'Homer', partner_type: 'Certified', status: 'inactive', is_archived: true },
    ],
    shows: ['Acme Funding', 'Wile Coyote', 'hank@globex.test', 'Archived'],
    emptyText: 'No partners found',
    search: { placeholder: 'Search here...' },
    create: { permission: 'create partners', label: /add partner/i, role: 'button', target: '/partners/create' },
    selection: { permission: 'delete partners' },
    bulkDelete: {
      permission: 'delete partners', method: 'post', path: '/admin/partners/multiple-delete',
      body: (ids) => ({ ids }), successToast: 'Partners deleted successfully', errorToast: 'Partner has active borrowers.',
    },
  },
  toast
)
