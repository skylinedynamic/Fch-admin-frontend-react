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
 * Lead -> Contact Info: the Social Security Number is the full number, as on a
 * client's profile (Client -> Profile). It used to be "SSN Last 4". The field
 * only writes it as XXX-XX-XXXX; whether it is valid is the API's call.
 *
 * R3-BUG-004: the API sent the full SSN on every read of the lead. It now
 * sends it masked (***-**-6789), as for a client; the eye button fetches it in
 * full through POST leads/{id}/reveal (logged), and a save leaves out an SSN
 * still masked so the one on file stays.
 */
const LEAD = {
  id: 7, company_name: 'Lead Co', contact_person: 'Lee Lead', email: 'lee@example.test',
  phone_number: '(555) 234-5678', lead_type: 'Borrower', status: 'New', country: 'United States',
  ssn: '***-**-6789' as string | null,
}

const mount = (lead = LEAD) => {
  signIn({ permissions: ['view leads', 'update leads'] })
  allowBackgroundCalls()
  api('get', '/common/leads/7', { status: true, data: lead })
  return renderPage(<LeadDetails />, { path: '/leads/:id', route: '/leads/7?tab=contactInfo' })
}

const ssnField = () => screen.findByLabelText('Social Security Number') as Promise<HTMLInputElement>

beforeEach(() => vi.clearAllMocks())

describe('LeadDetails - Social Security Number', () => {
  it('shows the SSN masked as the API sends it, and in full only through the logged reveal', async () => {
    const user = userEvent.setup()
    mount()
    const reveal = api('post', '/common/leads/7/reveal', { status: true, data: { field: 'ssn', value: '123456789' } })

    const ssn = await ssnField()
    await waitFor(() => expect(ssn).toHaveValue('***-**-6789'))
    expect(screen.queryByText('SSN Last 4')).not.toBeInTheDocument()
    expect(reveal.calls).toBe(0)

    await user.click(screen.getByRole('button', { name: /show ssn/i }))
    await waitFor(() => expect(ssn).toHaveValue('123-45-6789'))
    expect(reveal.bodies[0]).toEqual({ field: 'ssn' })
  })

  it('leaves out an SSN still masked, so the one on file stays', async () => {
    const user = userEvent.setup()
    mount()
    const save = api('post', '/common/leads/7/contact-info', { status: true, data: LEAD })

    await waitFor(async () => expect(await ssnField()).toHaveValue('***-**-6789'))
    await user.click(screen.getByRole('button', { name: /update/i }))

    await waitFor(() => expect(save.calls).toBe(1))
    expect(save.bodies[0]).not.toHaveProperty('ssn')
  })

  it('writes the number as it is typed and sends the nine digits', async () => {
    const user = userEvent.setup()
    mount({ ...LEAD, ssn: null })
    const save = api('post', '/common/leads/7/contact-info', { status: true, data: LEAD })

    const ssn = await ssnField()
    await user.type(ssn, '234567890')
    expect(ssn).toHaveValue('234-56-7890')
    await user.click(screen.getByRole('button', { name: /update/i }))

    await waitFor(() => expect(save.bodies[0]).toMatchObject({ ssn: '234567890' }))
    expect(save.bodies[0]).not.toHaveProperty('ssn_last_4')
  })

  it('sends a cleared SSN as empty, so the one on file is removed', async () => {
    const user = userEvent.setup()
    mount()
    api('post', '/common/leads/7/reveal', { status: true, data: { field: 'ssn', value: '123456789' } })
    const save = api('post', '/common/leads/7/contact-info', { status: true, data: LEAD })

    const ssn = await ssnField()
    await waitFor(() => expect(ssn).toHaveValue('***-**-6789'))
    await user.click(screen.getByRole('button', { name: /show ssn/i }))
    await waitFor(() => expect(ssn).toHaveValue('123-45-6789'))
    await user.clear(ssn)
    await user.click(screen.getByRole('button', { name: /update/i }))

    await waitFor(() => expect(save.calls).toBe(1))
    expect(save.bodies[0].ssn).toBeNull()
  })

  it('leaves a malformed SSN to the server and shows its answer under the field', async () => {
    const user = userEvent.setup()
    mount({ ...LEAD, ssn: null })
    const save = api('post', '/common/leads/7/contact-info', invalid({ ssn: 'Enter a valid 9-digit SSN as XXX-XX-XXXX.' }), 422)

    await user.type(await ssnField(), '6789')
    await user.click(screen.getByRole('button', { name: /update/i }))

    expect(await screen.findByText('Enter a valid 9-digit SSN as XXX-XX-XXXX.')).toBeInTheDocument()
    expect(save.bodies[0]).toMatchObject({ ssn: '6789' })
  })
})
