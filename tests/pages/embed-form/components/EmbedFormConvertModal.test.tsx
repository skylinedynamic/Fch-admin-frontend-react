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

  // BUG-064: converting onto an existing client quietly filled its blank
  // profile fields from the submission. The partner now sees which, and they
  // are filled only if the partner ticks the box.
  it('lists the blank fields the application would fill and fills them only when the partner agrees', async () => {
    servePreview({
      status: true,
      data: {
        mode: 'existing_borrower',
        existing_borrower: {
          ...existingBorrower,
          fields_to_fill: [
            { field: 'date_of_birth', label: 'Date Of Birth', value: '1985-05-05' },
            { field: 'ssn', label: 'SSN', value: '***-**-6789' },
          ],
        },
      },
    })
    const { onConfirm } = renderModal()

    const list = await screen.findByRole('list', { name: 'Empty profile fields this application can fill', hidden: true })
    expect(list).toHaveTextContent('Date of birth')
    expect(list).toHaveTextContent('May 5, 1985')
    expect(list).toHaveTextContent('***-**-6789')
    expect(screen.getByText('2 fields')).toBeInTheDocument()
    // Wider while it lists fields, so the two-column grid has room.
    expect(document.querySelector('.ef-convert-modal .modal-dialog')).toHaveClass('modal-lg')
    const consent = screen.getByRole('checkbox', { name: /Also fill these empty fields on the client's profile/, hidden: true })
    expect(consent).not.toBeChecked()

    await userEvent.click(button(/Use Existing Client & Create Funding Application/))
    expect(onConfirm).toHaveBeenLastCalledWith(expect.not.objectContaining({ fill_profile_fields: true }))

    await userEvent.click(consent)
    await userEvent.click(button(/Use Existing Client & Create Funding Application/))
    expect(onConfirm).toHaveBeenLastCalledWith(expect.objectContaining({ confirm_existing_borrower: true, fill_profile_fields: true }))
  })

  it("says the client's profile is not changed when the application has nothing to fill", async () => {
    servePreview({ status: true, data: { mode: 'existing_borrower', existing_borrower: { ...existingBorrower, fields_to_fill: [] } } })
    renderModal()

    expect(await screen.findByText("The client's profile is not changed.")).toBeInTheDocument()
    expect(document.querySelector('.ef-convert-modal .modal-dialog')).not.toHaveClass('modal-lg')
    expect(screen.queryByRole('checkbox', { hidden: true })).not.toBeInTheDocument()
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
