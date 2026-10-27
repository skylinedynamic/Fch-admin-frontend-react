import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, invalid, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
// Summernote needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import LeadDetails from '../../../src/pages/leads/LeadDetails'

/**
 * Defect (BUG-017): the form checked Contact Person (and, on Contact Info,
 * email and phone) itself and sent nothing until they were filled, so the
 * API's other required errors only appeared on the second Save. Now the
 * request goes out and every error the API returns is shown at once.
 */
const LEAD = {
  id: 7, company_name: 'Lead Co', contact_person: 'Lee Lead', email: 'lee@example.test',
  phone_number: '(555) 234-5678', lead_type: 'Borrower', status: 'New', country: 'United States',
}

beforeEach(() => {
  vi.clearAllMocks()
  signIn({ permissions: ['view leads', 'create leads', 'update leads'] })
  allowBackgroundCalls()
})

describe('LeadDetails - required errors in one round', () => {
  it('Add Lead with everything empty shows every required error from the first Save', async () => {
    const user = userEvent.setup()
    const create = api('post', '/common/leads/details', invalid({
      probability: 'Probability is required.',
      lead_type: 'Lead Type is required.',
      status: 'Status is required.',
      company_name: 'Organization Name is required.',
      contact_person: 'Contact Person is required.',
    }), 422)
    renderPage(<LeadDetails />, { path: '/leads/create' })

    await user.click(await screen.findByRole('button', { name: /^save/i }))

    for (const message of ['Probability is required.', 'Lead Type is required.', 'Status is required.', 'Organization Name is required.', 'Contact Person is required.']) {
      expect(await screen.findByText(message)).toBeInTheDocument()
    }
    expect(create.calls).toBe(1)
  })

  it('Contact Info with the email cleared shows the email and country errors together', async () => {
    const user = userEvent.setup()
    api('get', '/common/leads/7', { status: true, data: LEAD })
    const save = api('post', '/common/leads/7/contact-info', invalid({
      email: 'Contact Email is required.',
      country: 'Country is required.',
    }), 422)
    const { container } = renderPage(<LeadDetails />, { path: '/leads/:id', route: '/leads/7?tab=contactInfo' })
    const email = () => container.querySelector('input[name="email"]') as HTMLInputElement
    await waitFor(() => expect(email()).toHaveValue('lee@example.test'))

    await user.clear(email())
    await user.click(screen.getByRole('button', { name: /update/i }))

    expect(await screen.findByText('Contact Email is required.')).toBeInTheDocument()
    expect(screen.getByText('Country is required.')).toBeInTheDocument()
    expect(save.calls).toBe(1)
  })
})
