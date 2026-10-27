import { describe, expect, it, vi } from 'vitest'
import { screen } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
// Summernote needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import ClientDetails from '../../../src/pages/clients/ClientDetails'

/**
 * BUG-030: opening another partner's client (/clients/136 on Wanda's domain)
 * showed an empty Client Profile with zero counters. The API answers 404, so
 * the page now says the client was not found, as Invoice details does.
 */
describe('ClientDetails - a client that is not yours (BUG-030)', () => {
  it('shows Client Not Found instead of an empty profile', async () => {
    signIn({ permissions: ['view clients', 'update clients'] })
    allowBackgroundCalls()
    api('get', '/common/borrowers/136', { status: false, message: 'Client not found.' }, 404)

    renderPage(<ClientDetails />, { path: '/clients/:id', route: '/clients/136' })

    expect(await screen.findByText('Client Not Found')).toBeInTheDocument()
    expect(screen.queryByLabelText('Social Security Number')).not.toBeInTheDocument()
  })
})
