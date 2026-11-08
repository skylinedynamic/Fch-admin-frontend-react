import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toast } from 'react-toastify'
import { screen } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import PartnerProfile from '../../../src/pages/partners/PartnerProfile'

const missing = { status: false, message: 'Partner not found.' }

beforeEach(() => vi.clearAllMocks())

/**
 * Defect: opening a partner that does not exist (/partners/86 after it was
 * deleted, or any unknown id) showed an empty Status & Agent form with Update
 * and a stack of "Failed to load partner data" / "Partner not found." toasts.
 * As for clients, leads, employees and users (BUG-030, BUG-164), the page says
 * the partner was not found - once, with no form.
 */
describe('Partner profile of a partner that does not exist', () => {
  it('says the partner was not found, with no form, update or error toasts', async () => {
    signIn({ permissions: ['view partners', 'update partners'] })
    allowBackgroundCalls()
    api('get', '/admin/partners-details/86', missing, 404)
    api('get', '/admin/partners/86/status-agent', missing, 404)

    renderPage(<PartnerProfile />, { path: '/partners/:id', route: '/partners/86' })

    expect(await screen.findByText('Partner Not Found')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /update/i })).not.toBeInTheDocument()
    expect(screen.queryByText('Status & Agent')).not.toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
  })
})
