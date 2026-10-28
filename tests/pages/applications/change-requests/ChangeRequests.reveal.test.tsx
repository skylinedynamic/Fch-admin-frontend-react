import { afterEach, describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../mocks/server'
import { cleanup, renderWithProviders, screen, waitFor, within } from '../../../test-utils'
import { useAuthStore } from '../../../../src/store/auth/authStore'
import ChangeRequests from '../../../../src/pages/applications/change-requests/ChangeRequests'

/**
 * BUG-014: an SSN or EIN change is listed masked (the API masks it, is_masked
 * set). The review shows the pair masked, and one button fetches both numbers
 * in full; any other change shows its values as they are.
 */
const row = (overrides: Record<string, unknown>) => ({
  id: 9, partner_id: 2, borrower_id: 4, field_name: 'business_ein', old_value: '**-***4321', new_value: '**-***0000', is_masked: true,
  status: 'Pending', updated_by: null, note: null, created_at: '2026-10-19', updated_at: '2026-10-19',
  borrower_business_name: 'Chen Co', borrower_first_name: 'Michael', borrower_last_name: 'Chen', updater_name: null,
  ...overrides,
})

const serve = (rows: unknown[]) => {
  const revealed: string[] = []
  server.use(
    http.post('*/admin/change-requests', () => HttpResponse.json({ status: true, data: rows, meta: { total: rows.length, current_page: 1, per_page: 15, last_page: 1 } })),
    http.post('*/admin/change-requests/:id/reveal', ({ params }) => {
      revealed.push(String(params.id))
      return HttpResponse.json({ status: true, data: { id: Number(params.id), old_value: '987654321', new_value: '123450000' } })
    }),
    http.all('*', () => HttpResponse.json({ status: true, data: [] }))
  )
  return revealed
}

const openReview = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  await user.click(await screen.findByText(text))
  return screen.findByText('Review Change Request').then((title) => title.closest('.modal-content') as HTMLElement)
}

describe('ChangeRequests › masked SSN and EIN', () => {
  afterEach(() => {
    cleanup()
    server.resetHandlers()
    useAuthStore.setState({ token: undefined, user: null })
  })

  const signIn = () =>
    useAuthStore.setState({ token: 'tok', user: { id: 1, name: 'Host', is_host: 1, entity_type: 'Partner', permissions: ['view change requests', 'update change requests'] } })

  it('lists an EIN change masked and reveals both numbers in the review', async () => {
    signIn()
    const revealed = serve([row({})])
    const user = userEvent.setup()
    renderWithProviders(<ChangeRequests />, { route: '/intake-review/change-requests' })

    const modal = await openReview(user, '**-***0000')
    expect(within(modal).getByText('**-***4321')).toBeInTheDocument()
    expect(revealed).toEqual([])

    await user.click(within(modal).getByRole('button', { name: 'Show numbers' }))

    expect(await within(modal).findByText('98-7654321')).toBeInTheDocument()
    expect(within(modal).getByText('12-3450000')).toBeInTheDocument()
    expect(revealed).toEqual(['9'])

    await user.click(within(modal).getByRole('button', { name: 'Hide numbers' }))
    expect(within(modal).getByText('**-***4321')).toBeInTheDocument()
  })

  it('writes a revealed SSN as XXX-XX-XXXX', async () => {
    signIn()
    serve([row({ field_name: 'ssn', old_value: '***-**-4321', new_value: '***-**-0000' })])
    const user = userEvent.setup()
    renderWithProviders(<ChangeRequests />, { route: '/intake-review/change-requests' })

    const modal = await openReview(user, '***-**-0000')
    await user.click(within(modal).getByRole('button', { name: 'Show numbers' }))

    expect(await within(modal).findByText('987-65-4321')).toBeInTheDocument()
    expect(within(modal).getByText('123-45-0000')).toBeInTheDocument()
  })

  it('offers nothing to reveal for any other change', async () => {
    signIn()
    serve([row({ field_name: 'business_name', old_value: 'Old Co', new_value: 'New Co', is_masked: false })])
    const user = userEvent.setup()
    renderWithProviders(<ChangeRequests />, { route: '/intake-review/change-requests' })

    const modal = await openReview(user, 'New Co')
    await waitFor(() => expect(within(modal).getByText('Old Co')).toBeInTheDocument())
    expect(within(modal).queryByRole('button', { name: 'Show numbers' })).not.toBeInTheDocument()
  })
})
