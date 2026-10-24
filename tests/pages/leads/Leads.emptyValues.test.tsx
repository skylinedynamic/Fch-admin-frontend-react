import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '../../test-utils'
import { allowBackgroundCalls, api, paginated, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
// Summernote (reached through shared modals) needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import Leads from '../../../src/pages/leads/Leads'

beforeEach(() => vi.clearAllMocks())

/**
 * Defect (BUG-003, OP-LEAD-04): an empty Contact, Email or Phone showed the
 * literal word "Null" (e.g. leads Exodiass, Gonzales Mooney LLC). Empty values
 * show a muted dash - including the string "null" a cleared field can carry.
 */
describe('Leads - empty values', () => {
  it('shows a dash, never "Null", for an empty contact, email or phone', async () => {
    signIn({ permissions: ['view leads'] })
    allowBackgroundCalls()
    api('post', '/common/leads/fetch-leads', paginated([
      { id: 61, contact_person: null, company_name: 'Gonzales Mooney LLC', email: '', phone_number: 'null', lead_type: 'Borrower', status: 'New Lead' },
      { id: 62, contact_person: 'Lena Lead', company_name: 'Lead Works', email: 'lena@example.test', phone_number: '(555) 010-0001', lead_type: 'Borrower', status: 'New Lead' },
    ]))

    renderPage(<Leads />, { path: '/leads' })

    const row = (await screen.findByText('Gonzales Mooney LLC')).closest('tr') as HTMLElement
    expect(within(row).queryByText(/^null$/i)).not.toBeInTheDocument()
    expect(within(row).getAllByText('—').length).toBeGreaterThanOrEqual(3)
    // The email cell splits the address after the @ so it can wrap there.
    expect(screen.getByText((_, el) => el?.textContent === 'lena@example.test' && !!el.querySelector(':scope > wbr'))).toBeInTheDocument()
  })
})
