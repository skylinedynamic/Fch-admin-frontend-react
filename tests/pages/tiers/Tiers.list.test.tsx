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
import TiersList from '../../../src/pages/tiers/TiersList'

describeListPage(
  {
    name: 'Tiers',
    page: () => <TiersList />,
    path: '/tiers',
    // Adding and deleting tiers is reserved for the Developer role.
    user: { role_name: 'Developer' },
    list: { method: 'post', path: '/admin/credit-builder/tiers/fetch-tiers' },
    rows: [
      { id: 1, name: 'Tier 0', title: 'Business Foundation', subtitle: 'Get set up', order: 1, code: 'T0', status: 'active' },
      { id: 2, name: 'Tier 1', title: 'Vendor Credit', subtitle: 'Net-30 accounts', order: 2, code: 'T1', status: 'active' },
    ],
    shows: ['Business Foundation', 'Vendor Credit', 'Net-30 accounts'],
    // BUG-007: the table said "No available options" (PrimeReact's dropdown default).
    emptyText: 'No tiers found',
    search: { placeholder: 'Search here...' },
    create: { permission: 'update tier', label: /add tier/i, role: 'link', target: '/tiers/create' },
  },
  toast
)
