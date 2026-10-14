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
import EmbedFormSubmissions from '../../../src/pages/embed-form/EmbedFormSubmissions'

describeListPage(
  {
    name: 'Loan applications',
    page: () => <EmbedFormSubmissions />,
    path: '/embed-form/loan-applications',
    view: ['view application'],
    list: {
      method: 'post', path: '/common/embed-forms/submissions/fetch',
      wrap: (rows) => ({ status: true, message: 'ok', data: { data: rows, meta: { total: rows.length } } }),
    },
    rows: [
      { id: 1401, first_name: 'Ada', last_name: 'Applicant', email: 'ada@example.test', phone: '(555) 140-0001', desired_funding_amount: 75000, status: 'new', created_at: '2026-03-05T10:00:00Z' },
      { id: 1402, first_name: 'Ben', last_name: 'Borrowed', email: 'ben@example.test', phone: '(555) 140-0002', desired_funding_amount: 20000, status: 'converted', created_at: '2026-03-01T10:00:00Z' },
    ],
    shows: ['ada@example.test', 'ben@example.test', 'Free Plan'],
    emptyText: 'No form submissions found',
    search: { placeholder: 'Search here...', apply: 'enter' },
    clear: false,
  },
  toast
)
