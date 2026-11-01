import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, invalid, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import { toast } from 'react-toastify'
import LenderForm from '../../../src/pages/lenders/LenderForm'

/**
 * Defect: R2 BUG-008 - Add Lender saved a second "Kabbage". The API now
 * refuses a name already in use; the form shows why, under the name, and
 * stays on the page.
 */
describe('LenderForm - a name already in use (R2 BUG-008)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signIn({ permissions: ['view lenders', 'create lenders'] })
    allowBackgroundCalls()
    api('get', '/admin/lenders/product-categories', { status: true, data: [] })
  })

  it('shows the refusal under Lender Name and does not leave the form', async () => {
    const user = userEvent.setup()
    const create = api('post', '/admin/lenders', invalid({ name: 'A lender with this name already exists.' }), 422)
    renderPage(<LenderForm />, { path: '/lenders/create', route: '/lenders/create' })

    await user.type(await screen.findByPlaceholderText('Enter lender name'), 'Kabbage')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText('A lender with this name already exists.')).toBeInTheDocument()
    expect(create.bodies[0]).toMatchObject({ name: 'Kabbage' })
    expect(screen.getByPlaceholderText('Enter lender name')).toHaveClass('is-invalid')
    expect(toast.success).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByTestId('landing')).not.toBeInTheDocument())
  })
})
