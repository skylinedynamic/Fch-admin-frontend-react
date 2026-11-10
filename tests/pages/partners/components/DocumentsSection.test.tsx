import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test-utils'
import { server } from '../../../mocks/server'
import DocumentsSection from '../../../../src/pages/partners/components/DocumentsSection'

// The file manager is its own component: here it shows the folder it was opened
// on and hands back one file picked there.
vi.mock('../../../../src/components/FileManagerModal/FileManagerModal', () => ({
  FileManagerModal: (props: { isOpen: boolean; entityType: string; entityId: string; onSelectFiles: (files: { path: string; name: string }[]) => void }) =>
    props.isOpen ? (
      <div>
        <span data-testid="fm-root">{`${props.entityType}/${props.entityId}`}</span>
        <button type="button" onClick={() => props.onSelectFiles([{ path: '/w9_1793820555.pdf', name: 'w9_1793820555.pdf' }])}>
          Pick w9.pdf
        </button>
      </div>
    ) : null,
}))

/**
 * Partner > Documents. A partner's documents are private: the file manager
 * opens on their private folder (partner-documents/{id}), a file uploaded
 * there stays there, and filing it does not move it - so the file manager
 * still shows it afterwards.
 */
describe('Partner DocumentsSection', () => {
  afterEach(() => server.resetHandlers())

  const serve = () => {
    const attached: unknown[] = []
    server.use(
      http.post('*/admin/partners/fetch-all-documents', () => HttpResponse.json({ status: true, data: [] })),
      http.post('*/admin/partners/documents', async ({ request }) => {
        attached.push(await request.json())
        return HttpResponse.json({ status: true, data: [] }, { status: 201 })
      })
    )
    return attached
  }

  it("opens the file manager on the partner's private documents folder", async () => {
    serve()
    renderWithProviders(<DocumentsSection partnerId="37" />)

    await userEvent.click(screen.getByRole('button', { name: /add document/i }))

    expect(screen.getByTestId('fm-root')).toHaveTextContent('partner-documents/37')
  })

  it('files a picked document from that folder, where it is', async () => {
    const attached = serve()
    renderWithProviders(<DocumentsSection partnerId="37" />)

    await userEvent.click(screen.getByRole('button', { name: /add document/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Pick w9.pdf' }))

    await waitFor(() => expect(attached).toHaveLength(1))
    expect(attached[0]).toEqual({ partner_id: '37', entity_type: 'partner-documents', file_path: ['/w9_1793820555.pdf'] })
  })
})
