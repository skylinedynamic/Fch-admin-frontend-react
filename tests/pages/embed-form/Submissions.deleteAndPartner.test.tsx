import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { server } from '../../mocks/server'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { useAuthStore } from '../../../src/store/auth/authStore'
import { dropdownShowing } from '../../mocks/partnerOptions'
import EmbedFormSubmissions from '../../../src/pages/embed-form/EmbedFormSubmissions'

/**
 * Embedded Form › Loan Applications:
 * - Applications not yet converted can be ticked and deleted together. A
 *   converted one is the record behind a client and a funding application, so
 *   its box is disabled, and if the API still refuses, the rows are named.
 * - The host can filter the list by partner.
 */
const row = (id: number, first_name: string, status = 'new') => ({
  id, submission_uid: `uid-${id}`, first_name, last_name: 'Test', email: `${first_name.toLowerCase()}@example.test`,
  status, attachments: [], created_at: '2026-10-16 09:00:00',
  partner: { id: 4, company_name: 'Acme Lending', full_name: 'Pat Partner', partner_type: 'Certified Partner', is_host: false },
})
const ROWS = [row(1, 'Odessa'), row(2, 'Ava', 'reviewing'), row(3, 'Cole', 'converted')]

const signInAs = (isHost: boolean) =>
  useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'User', is_host: isHost ? 1 : 0, permissions: ['view application', 'convert application'] } as never })

const serve = (fetchBodies: Record<string, unknown>[] = [], deleteResponse?: () => Response) =>
  server.use(
    http.post('*/common/embed-forms/submissions/fetch', async ({ request }) => {
      fetchBodies.push((await request.json()) as Record<string, unknown>)
      return HttpResponse.json({ status: true, message: 'ok', data: ROWS, meta: { total: 3, stats: { total: 3, new_count: 1, reviewing_count: 1, converted_count: 1 } } })
    }),
    http.post('*/common/embed-forms/submissions/delete', async ({ request }) =>
      deleteResponse ? deleteResponse() : HttpResponse.json({ status: true, message: 'Applications deleted successfully.', data: { deleted: ((await request.json()) as { ids: number[] }).ids.length } })
    ),
    http.post('*/common/get-all-partners', () => HttpResponse.json({ status: true, data: [{ id: 4, company_name: 'Acme Lending', full_name: 'Pat Partner' }, { id: 9, company_name: 'Zeta Funding', full_name: 'Zed Z' }] })),
    http.get('*/common/user-details', () => HttpResponse.json({ status: true, data: { user: {} } }))
  )

// PrimeReact puts role="checkbox" on a wrapper div; the real input is inside it.
const checkboxIn = (name: string) =>
  (screen.getByText(`${name} Test`).closest('tr') as HTMLElement).querySelector('input.p-checkbox-input') as HTMLInputElement

describe('Embedded Form › Loan Applications › delete selected', () => {
  afterEach(() => {
    server.resetHandlers()
    useAuthStore.setState({ token: undefined, user: null })
  })

  it('deletes the ticked applications; a converted one cannot be ticked', async () => {
    signInAs(false)
    let deleted: unknown
    serve([], undefined)
    server.use(http.post('*/common/embed-forms/submissions/delete', async ({ request }) => {
      deleted = await request.json()
      return HttpResponse.json({ status: true, message: 'Applications deleted successfully.', data: { deleted: 2 } })
    }))
    renderWithProviders(<EmbedFormSubmissions />)

    await screen.findByText('Odessa Test')
    expect(checkboxIn('Cole')).toBeDisabled()
    // Like Partners and Clients: an Actions button appears once rows are ticked.
    expect(screen.queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument()

    await userEvent.click(checkboxIn('Odessa'))
    await userEvent.click(checkboxIn('Ava'))
    expect(screen.getByRole('button', { name: 'Actions' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Delete Selected/ }))
    expect(screen.getByText('The 2 selected applications will be deleted.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Yes, Delete/i, hidden: true }))

    await waitFor(() => expect(deleted).toEqual({ ids: [1, 2] }))
  })

  it('names the applications the API refuses because they were converted', async () => {
    signInAs(false)
    serve([], () => HttpResponse.json({
      status: false,
      message: 'Converted applications cannot be deleted: they belong to a client and a funding application. Unselect them and try again.',
      errors: { converted: [{ id: 1, name: 'Odessa Test' }] },
    }, { status: 422 }))
    renderWithProviders(<EmbedFormSubmissions />)

    await screen.findByText('Odessa Test')
    await userEvent.click(checkboxIn('Odessa'))
    await userEvent.click(screen.getByRole('button', { name: /Delete Selected/ }))
    await userEvent.click(screen.getByRole('button', { name: /Yes, Delete/i, hidden: true }))

    expect(await screen.findByText('Application Cannot Be Deleted')).toBeInTheDocument()
    expect(screen.getByText(/Converted applications cannot be deleted/)).toBeInTheDocument()
  })
})

describe('Embedded Form › Loan Applications › partner filter', () => {
  afterEach(() => {
    server.resetHandlers()
    useAuthStore.setState({ token: undefined, user: null })
  })

  it('lets the host filter by partner', async () => {
    signInAs(true)
    const bodies: Record<string, unknown>[] = []
    serve(bodies)
    renderWithProviders(<EmbedFormSubmissions />)

    await screen.findByText('Odessa Test')
    await userEvent.click(await dropdownShowing('All Partners'))
    await userEvent.click(await screen.findByText(/Zeta Funding/))
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }))

    await waitFor(() => expect(bodies[bodies.length - 1]).toMatchObject({ partner_id: 9 }))
  })

  it('does not offer the partner filter to a partner', async () => {
    signInAs(false)
    serve()
    renderWithProviders(<EmbedFormSubmissions />)

    await screen.findByText('Odessa Test')
    expect(document.querySelector('.p-dropdown-label')?.textContent).not.toBe('All Partners')
    expect(Array.from(document.querySelectorAll('.p-dropdown-label')).map((el) => el.textContent)).not.toContain('All Partners')
  })
})
