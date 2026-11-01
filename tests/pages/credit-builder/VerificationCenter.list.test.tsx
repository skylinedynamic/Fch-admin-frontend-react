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
import VerificationCenter from '../../../src/pages/credit-builder/verifications/VerificationCenter'

describeListPage(
  {
    name: 'Verification center',
    page: () => <VerificationCenter />,
    path: '/verification-center',
    list: { method: 'post', path: '/common/credit-builder/verification-center-fetch-all' },
    rows: [
      { borrower_id: 1, borrower_name: 'Johnathan Smithfield', partner_name: 'Acme Funding', tier_name: 'Tier 1', pending_count: 2, request_date: '2026-03-01' },
      { borrower_id: 2, borrower_name: 'Mara Quill', partner_name: 'Globex Capital', tier_name: 'Tier 0', pending_count: 0, request_date: '2026-03-02' },
    ],
    shows: ['Johnathan Smithfield', 'Mara Quill', 'Globex Capital', 'Tier 0'],
    // BUG-007: the table said "No available options" (PrimeReact's dropdown default).
    emptyText: 'No verification requests found',
    search: { placeholder: 'Search borrower, partner or tier...' },
  },
  toast
)
