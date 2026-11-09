import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { renderWithProviders, screen, within } from '../../test-utils'
import { useAuthStore } from '../../../src/store/auth/authStore'
import EmbedFormSubmissions from '../../../src/pages/embed-form/EmbedFormSubmissions'

/**
 * BUG-058 (retest): a converted row's badge names its client's real plan. When
 * the client is not in the response it says only "Converted" - never guesses
 * "Free Plan" for a client who may be paid.
 */
const row = (id: number, first_name: string, converted_borrower?: Record<string, unknown>) => ({
  id, submission_uid: `uid-${id}`, first_name, last_name: 'Test', email: `${first_name.toLowerCase()}@example.test`,
  status: 'converted', attachments: [], created_at: '2026-10-16 09:00:00', converted_borrower,
})

const serve = (rows: unknown[]) =>
  server.use(
    http.post('*/common/embed-forms/submissions/fetch', () =>
      HttpResponse.json({ status: true, message: 'ok', data: rows, meta: { total: rows.length } })),
    http.get('*/common/user-details', () => HttpResponse.json({ status: true, data: { user: {} } }))
  )

const rowOf = async (name: string) => (await screen.findByText(`${name} Test`)).closest('tr') as HTMLElement

describe('Embedded Form › Loan Applications › plan badge', () => {
  afterEach(() => {
    server.resetHandlers()
    useAuthStore.setState({ token: undefined, user: null })
  })

  it('names each converted row’s real plan, and only "Converted" when the client is unknown', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'User', is_host: 0, permissions: ['view application', 'convert application'] } as never })
    serve([
      row(1, 'Paid', { id: 41, full_name: 'Paid Client', is_free_trail: false, enrollment_type: 'One Time Payment' }),
      row(2, 'Free', { id: 42, full_name: 'Free Client', is_free_trail: true }),
      row(3, 'Unknown'),
    ])
    renderWithProviders(<EmbedFormSubmissions />)

    expect(within(await rowOf('Paid')).getByText('One Time Payment')).toBeInTheDocument()
    expect(within(await rowOf('Free')).getByText('Free Plan')).toBeInTheDocument()
    const unknown = await rowOf('Unknown')
    // The action badge (the row's status pill says "Converted" too).
    expect(within(unknown).getByTitle('Already converted to a client')).toHaveTextContent('Converted')
    expect(within(unknown).queryByText('Free Plan')).not.toBeInTheDocument()
  })

  it('the Applicant column shows only the name', async () => {
    useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'User', is_host: 0, permissions: ['view application'] } as never })
    serve([{ ...row(4, 'Named'), business_name: 'Named Holdings LLC', occupation: 'Baker', submission_uid: 'abcdef1234567890' }])
    renderWithProviders(<EmbedFormSubmissions />)

    const nameCell = (await screen.findByText('Named Test')).closest('td') as HTMLElement
    expect(nameCell).toHaveTextContent(/^NTNamed Test$/)
    expect(within(nameCell).queryByText(/Named Holdings LLC|Baker|#abcdef12/)).not.toBeInTheDocument()
  })
})
