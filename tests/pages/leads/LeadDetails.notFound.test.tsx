import { describe, expect, it, vi } from 'vitest'
import { screen } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
// Summernote needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import { toast } from 'react-toastify'
import LeadDetails from '../../../src/pages/leads/LeadDetails'

/**
 * BUG-030: opening another partner's lead (/leads/175) showed an empty lead
 * page and a "Failed to load lead details" toast. The API answers 404, so the
 * page now says the lead was not found.
 */
describe('LeadDetails - a lead that is not yours (BUG-030)', () => {
  it('shows Lead Not Found instead of an empty page', async () => {
    signIn({ permissions: ['view leads', 'update leads'] })
    allowBackgroundCalls()
    api('get', '/common/leads/175', { status: false, message: 'Lead not found.' }, 404)

    renderPage(<LeadDetails />, { path: '/leads/:id', route: '/leads/175' })

    expect(await screen.findByText('Lead Not Found')).toBeInTheDocument()
    expect(screen.queryByLabelText(/company name/i)).not.toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
  })
})
