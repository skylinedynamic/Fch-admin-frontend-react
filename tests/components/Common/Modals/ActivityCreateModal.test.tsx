import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { server } from '../../../mocks/server'

// The real hook side-effect-imports 'summernote/dist/summernote-lite.js',
// which does canvas-based font detection at import time and crashes under
// jsdom (no <canvas> implementation). The component only needs an
// editorRef callback to attach to its hidden textarea; nothing under test
// here exercises rich-text editing itself.
vi.mock('../../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

const { default: ActivityCreateModal } = await import('../../../../src/components/Common/Modals/ActivityCreateModal')

// The modal reads its create-context (entity id/type, isHost) off
// window._activityEntityContext, populated by ActivitySidebar right before
// the modal is shown, and re-reads it (resetting the form) on the
// Bootstrap `show.bs.modal` event fired on the modal element itself. Real
// Bootstrap JS isn't running in this test, so the modal wrapper keeps its
// static aria-hidden="true" — fine for getByLabelText, but getByRole must
// opt in with { hidden: true } to see inside it.
function openAsContext(ctx: { isHost?: boolean } = {}) {
  ; (window as any)._activityEntityContext = { entityId: 1, entityType: 'Client', ...ctx }
  const modalEl = document.getElementById('activityCreateModal')!
  // fireEvent (not a raw dispatchEvent) so the resulting setState calls are
  // flushed inside act() before the next assertion runs.
  fireEvent(modalEl, new Event('show.bs.modal', { bubbles: true }))
}

describe('ActivityCreateModal visibility radio group', () => {
  beforeEach(() => {
    delete (window as any)._activityEntityContext
  })

  afterEach(() => {
    delete (window as any)._activityEntityContext
  })

  it('defaults to Private (Only Me) with the 3-option (non-host/partner) set before any context is provided', () => {
    renderWithProviders(<ActivityCreateModal entityId={1} entityType="Client" onActivityCreated={undefined} />)

    expect(screen.getByLabelText('Private (Only Me)')).toBeChecked()
    expect(screen.getByLabelText('Internal')).toBeInTheDocument()
    expect(screen.getByLabelText('Everyone (Including Borrower)')).toBeInTheDocument()
    expect(screen.queryByLabelText('Partner')).not.toBeInTheDocument()
  })

  it('shows all 4 options, including Internal and Partner, once opened in a host context', () => {
    renderWithProviders(<ActivityCreateModal entityId={1} entityType="Client" onActivityCreated={undefined} />)

    openAsContext({ isHost: true })

    expect(screen.getByLabelText('Private (Only Me)')).toBeChecked()
    expect(screen.getByLabelText('Internal')).toBeInTheDocument()
    expect(screen.getByLabelText('Partner')).toBeInTheDocument()
    expect(screen.getByLabelText('Everyone (Including Borrower)')).toBeInTheDocument()
  })

  it('renders the 3-option set (Private, Internal, Everyone) once opened in a non-host/partner context', () => {
    renderWithProviders(<ActivityCreateModal entityId={1} entityType="Client" onActivityCreated={undefined} />)

    openAsContext({ isHost: false })

    expect(screen.getByLabelText('Private (Only Me)')).toBeChecked()
    expect(screen.getByLabelText('Internal')).toBeInTheDocument()
    expect(screen.getByLabelText('Everyone (Including Borrower)')).toBeInTheDocument()
    expect(screen.queryByLabelText('Partner')).not.toBeInTheDocument()
  })

  it('submits the selected visibility level in the create request', async () => {
    let receivedVisibility: string | null = null
    server.use(
      http.post('*/common/activity-logs', async ({ request }) => {
        const body = await request.formData()
        receivedVisibility = body.get('visibility') as string
        return HttpResponse.json({ status: true, message: 'Activity created', data: { id: 1, visibility: receivedVisibility } }, { status: 201 })
      })
    )

    renderWithProviders(<ActivityCreateModal entityId={1} entityType="Client" onActivityCreated={undefined} />)
    openAsContext({ isHost: true })

    fireEvent.click(screen.getByLabelText('Everyone (Including Borrower)'))
    expect(screen.getByLabelText('Everyone (Including Borrower)')).toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: /create/i, hidden: true }))

    await waitFor(() => expect(receivedVisibility).toBe('everyone'))
  })
})
