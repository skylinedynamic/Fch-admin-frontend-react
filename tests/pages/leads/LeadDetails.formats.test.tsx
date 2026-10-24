import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, api, renderPage, signIn } from '../pageHarness'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
// Summernote needs a real canvas at import time.
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import LeadDetails from '../../../src/pages/leads/LeadDetails'

/**
 * Lead -> Contact Info writes each number the way it is written down: an EIN
 * as XX-XXXXXXX, a D-U-N-S as nine digits (a leading zero kept). Whether it is
 * valid is the API's call.
 */
const LEAD = {
  id: 7, company_name: 'Lead Co', contact_person: 'Lee Lead', email: 'lee@example.test',
  phone_number: '(555) 234-5678', lead_type: 'Borrower', status: 'New', country: 'United States',
  business_ein: '534534534' as string | null, duns_number: '345345345' as string | null,
}

const mount = (lead = LEAD) => {
  signIn({ permissions: ['view leads', 'update leads'] })
  allowBackgroundCalls()
  api('get', '/common/leads/7', { status: true, data: lead })
  const view = renderPage(<LeadDetails />, { path: '/leads/:id', route: '/leads/7?tab=contactInfo' })
  const field = (name: string) => view.container.querySelector(`input[name="${name}"]`) as HTMLInputElement
  return { field }
}

beforeEach(() => vi.clearAllMocks())

describe('LeadDetails - EIN and D-U-N-S', () => {
  it('shows the EIN on file as XX-XXXXXXX and the D-U-N-S as its nine digits', async () => {
    const { field } = mount()

    await waitFor(() => expect(field('business_ein')).toHaveValue('53-4534534'))
    expect(field('duns_number')).toHaveValue('345345345')
  })

  it('writes an EIN as XX-XXXXXXX while it is typed', async () => {
    const user = userEvent.setup()
    const { field } = mount({ ...LEAD, business_ein: null })
    await waitFor(() => expect(field('business_ein')).toBeInTheDocument())

    await user.type(field('business_ein'), '12a3456789999')

    expect(field('business_ein')).toHaveValue('12-3456789')
  })

  it('keeps a D-U-N-S to digits, nine at most, leading zero included', async () => {
    const user = userEvent.setup()
    const { field } = mount({ ...LEAD, duns_number: null })
    await waitFor(() => expect(field('duns_number')).toBeInTheDocument())

    await user.type(field('duns_number'), '01-234567899')

    expect(field('duns_number')).toHaveValue('012345678')
  })

  it('sends both as they are shown; the API keeps the EIN as its digits', async () => {
    const user = userEvent.setup()
    mount()
    const save = api('post', '/common/leads/7/contact-info', { status: true, data: LEAD })

    await screen.findByDisplayValue('53-4534534')
    await user.click(screen.getByRole('button', { name: /update/i }))

    await waitFor(() => expect(save.bodies[0]).toMatchObject({ business_ein: '53-4534534', duns_number: '345345345' }))
  })
})
