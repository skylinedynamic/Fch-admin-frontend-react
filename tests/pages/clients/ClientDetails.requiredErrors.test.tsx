import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen } from '../../test-utils'
import { allowBackgroundCalls, api, invalid, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
// Summernote needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import ClientDetails from '../../../src/pages/clients/ClientDetails'

/**
 * BUG-017 (Owner > Add Client): Save with an empty form must show every
 * required error from the first response - the enrollment plan included -
 * not name/phone/email first and the plan on the second Save.
 */
beforeEach(() => {
  vi.clearAllMocks()
  signIn({ permissions: ['view clients', 'create clients'] })
  allowBackgroundCalls()
})

describe('Add Client - required errors in one round', () => {
  it('shows name, phone, email and enrollment plan errors from the first Save', async () => {
    const user = userEvent.setup()
    const create = api('post', '/common/borrowers', invalid({
      first_name: 'First name is required',
      phone_number: 'Phone number is required',
      email: 'Email is required',
      'enrollment.plan_id': 'Enrollment plan is required',
    }), 422)
    renderPage(<ClientDetails />, { path: '/clients/create' })
    // The form posts an enrollment with no plan; the API answers with every error (see the API test).

    await user.click(await screen.findByRole('button', { name: /^save/i }))

    expect(await screen.findByText('First name is required')).toBeInTheDocument()
    expect(screen.getByText('Phone number is required')).toBeInTheDocument()
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Enrollment plan is required')).toBeInTheDocument()
    expect(create.calls).toBe(1)
  })
})
