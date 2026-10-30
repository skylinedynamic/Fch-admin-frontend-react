import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { server } from '../../../mocks/server'
import ClientInfoSection from '../../../../src/pages/clients/components/ClientInfoSection'
import ClientDetailsModal from '../../../../src/pages/clients/components/ClientDetailsModal'

vi.mock('react-toastify', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }) }))
vi.mock('bootstrap/js/dist/modal', () => import('../../../mocks/fakeBootstrapModal'))
// Summernote needs a real canvas at import time.
vi.mock('../../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

/**
 * Client -> Profile and the client details modal show the Business EIN the
 * way it is written, XX-XXXXXXX - the API keeps the nine digits (534534534).
 *
 * BUG-014: the client's details carry the SSN and EIN masked; each is fetched
 * in full on its eye button (POST borrowers/{id}/reveal, naming the field).
 */
const CLIENT = {
  id: 5, first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.test', phone_number: '(555) 234-5678',
  country: 'United States', business_country: 'United States',
  business_ein: '**-***4534', duns_number: '345345345',
}
const FULL: Record<string, string> = { business_ein: '534534534', ssn: '325555555' }

afterEach(() => server.resetHandlers())

let revealed: unknown[] = []
const serve = (client: Record<string, unknown> = CLIENT) => {
  revealed = []
  server.use(
    http.get('*/common/borrowers/5', () => HttpResponse.json({ status: true, data: client })),
    http.post('*/common/borrowers/5/reveal', async ({ request }) => {
      const body = (await request.json()) as { field: string }
      revealed.push(body)
      return HttpResponse.json({ status: true, data: { field: body.field, value: FULL[body.field] } })
    }),
    http.all('*', () => HttpResponse.json({ status: true, data: [] }))
  )
}

describe('Business EIN format', () => {
  it('Client -> Profile shows the EIN masked, XX-XXXXXXX on the eye button, and keeps the D-U-N-S as nine digits', async () => {
    serve()
    const user = userEvent.setup()
    renderWithProviders(<ClientInfoSection clientId="5" countries={[]} states={[]} cities={[]} />)

    const ein = await screen.findByLabelText('Business EIN')
    await waitFor(() => expect(ein).toHaveValue('**-***4534'))
    expect(ein).toHaveAttribute('readonly')
    expect(screen.getByLabelText('D-U-N-S Number')).toHaveValue('345345345')
    expect(revealed).toEqual([])

    await user.click(screen.getByRole('button', { name: 'Show EIN' }))

    await waitFor(() => expect(ein).toHaveValue('53-4534534'))
    expect(revealed).toEqual([{ field: 'business_ein' }])
  })

  it('Client -> Profile shows the SSN masked and reveals it on its own eye button', async () => {
    serve({ ...CLIENT, ssn: '***-**-5555' })
    const user = userEvent.setup()
    renderWithProviders(<ClientInfoSection clientId="5" countries={[]} states={[]} cities={[]} />)

    const ssn = await screen.findByLabelText('Social Security Number')
    await waitFor(() => expect(ssn).toHaveValue('***-**-5555'))

    await user.click(screen.getByRole('button', { name: 'Show SSN' }))

    await waitFor(() => expect(ssn).toHaveValue('325-55-5555'))
    expect(revealed).toEqual([{ field: 'ssn' }])
  })

  it('Client -> Profile writes an EIN as XX-XXXXXXX while it is typed', async () => {
    serve({ ...CLIENT, business_ein: null })
    const user = userEvent.setup()
    renderWithProviders(<ClientInfoSection clientId="5" countries={[]} states={[]} cities={[]} />)

    const ein = await screen.findByLabelText('Business EIN')
    await waitFor(() => expect(screen.getByLabelText('D-U-N-S Number')).toHaveValue('345345345'))
    await user.type(ein, '123456789')

    expect(ein).toHaveValue('12-3456789')
  })

  it('the client details modal shows the EIN masked, XX-XXXXXXX on the eye button', async () => {
    serve()
    const user = userEvent.setup()
    renderWithProviders(<ClientDetailsModal isOpen toggle={() => {}} clientId={5} />)

    expect(await screen.findByText('**-***4534')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show EIN', hidden: true }))
    expect(await screen.findByText('53-4534534')).toBeInTheDocument()
    expect(revealed).toEqual([{ field: 'business_ein' }])
  })

  it('the client details modal shows the SSN masked, XXX-XX-XXXX on the eye button', async () => {
    serve({ ...CLIENT, ssn: '***-**-5555' })
    const user = userEvent.setup()
    renderWithProviders(<ClientDetailsModal isOpen toggle={() => {}} clientId={5} />)

    expect(await screen.findByText('***-**-5555')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show SSN', hidden: true }))
    expect(await screen.findByText('325-55-5555')).toBeInTheDocument()
    expect(revealed).toEqual([{ field: 'ssn' }])
  })
})
