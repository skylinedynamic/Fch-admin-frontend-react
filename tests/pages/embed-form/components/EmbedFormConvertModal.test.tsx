import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('bootstrap/js/dist/modal', () => import('../../../mocks/fakeBootstrapModal'))

import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { server } from '../../../mocks/server'
import { renderWithProviders, screen } from '../../../test-utils'
import EmbedFormConvertModal from '../../../../src/pages/embed-form/components/EmbedFormConvertModal'

/**
 * The Convert modal asks the API what converting will do before the partner
 * confirms, and says it plainly: the submission either joins a client who
 * already exists or creates a new one - and either way a new funding
 * application is generated.
 */
const submission = { id: 3, first_name: 'Maria', last_name: 'Santos', email: 'maria@example.test' }

const existingBorrower = {
  id: 42,
  name: 'Maria Santos',
  email: 'maria@example.test',
  phone_number: '(555) 123-4567',
  business_name: 'Santos Bakery',
  status: 'active',
  partner_name: 'Acme Funding',
  funding_applications_count: 2,
  created_at: '2026-03-14T10:00:00Z',
}

const servePreview = (response: Parameters<typeof HttpResponse.json>[0], status = 200) =>
  server.use(
    http.get('*/common/embed-forms/submissions/3/conversion-preview', () => HttpResponse.json(response, { status }))
  )

const renderModal = (props: Partial<Parameters<typeof EmbedFormConvertModal>[0]> = {}) => {
  const onConfirm = vi.fn()
  renderWithProviders(
    <EmbedFormConvertModal show onHide={vi.fn()} onConfirm={onConfirm} submission={submission} loading={false} {...props} />
  )
  return { onConfirm }
}

const button = (name: RegExp) => screen.getByRole('button', { name, hidden: true })

describe('EmbedFormConvertModal', () => {
  afterEach(() => server.resetHandlers())

  it('checks for an existing client before Confirm can be pressed', async () => {
    server.use(
      http.get('*/common/embed-forms/submissions/3/conversion-preview', async () => {
        await new Promise(() => {}) // never answers
        return HttpResponse.json({})
      })
    )
    renderModal()

    expect(await screen.findByText(/Checking if this client already exists/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Create Client/, hidden: true })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Use Existing Client/, hidden: true })).not.toBeInTheDocument()
  })

  it('warns that the client already exists and a new funding application will be generated', async () => {
    servePreview({ status: true, data: { mode: 'existing_borrower', existing_borrower: existingBorrower } })
    const { onConfirm } = renderModal()

    expect(await screen.findByText('This client already exists')).toBeInTheDocument()
    expect(screen.getByText(/No new client account will be created/)).toBeInTheDocument()
    expect(screen.getByText(/A new funding application will be generated for this client/)).toBeInTheDocument()
    expect(screen.getByText('Santos Bakery')).toBeInTheDocument()
    expect(screen.getByText('Existing Client Found')).toBeInTheDocument()

    await userEvent.click(button(/Use Existing Client & Create Funding Application/))
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ confirm_existing_borrower: true }))
  })

  it('says no client was found, a new client will be created and a new funding application generated', async () => {
    servePreview({ status: true, data: { mode: 'new_borrower', existing_borrower: null } })
    const { onConfirm } = renderModal()

    expect(await screen.findByText('No existing client found')).toBeInTheDocument()
    expect(screen.getByText(/a new client will be created/)).toBeInTheDocument()
    expect(screen.getByText(/A new funding application will be generated for this client/)).toBeInTheDocument()
    expect(screen.getByText('Create New Client')).toBeInTheDocument()

    await userEvent.click(button(/Create Client & Funding Application/))
    expect(onConfirm).toHaveBeenCalledWith(expect.not.objectContaining({ confirm_existing_borrower: true }))
  })

  it('switches to the existing client when the API reports one on confirm', async () => {
    servePreview({ status: true, data: { mode: 'new_borrower', existing_borrower: null } })
    renderModal({ existingBorrower })

    expect(await screen.findByText('This client already exists')).toBeInTheDocument()
    expect(button(/Use Existing Client & Create Funding Application/)).toBeInTheDocument()
  })

  it('shows why the submission cannot be converted and offers no Confirm', async () => {
    servePreview({ status: false, message: 'This email belongs to an existing Employee and cannot be converted.' }, 422)
    renderModal()

    expect(await screen.findByText(/belongs to an existing Employee/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Create Client/, hidden: true })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Use Existing Client/, hidden: true })).not.toBeInTheDocument()
  })

  it('does not ask the API while the modal is closed', async () => {
    const preview = vi.fn(() => HttpResponse.json({ status: true, data: { mode: 'new_borrower', existing_borrower: null } }))
    server.use(http.get('*/common/embed-forms/submissions/3/conversion-preview', preview))
    renderModal({ show: false })

    await new Promise((r) => setTimeout(r, 50))
    expect(preview).not.toHaveBeenCalled()
  })
})
