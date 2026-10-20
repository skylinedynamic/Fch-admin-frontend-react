import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, screen, waitFor } from '../../../../test-utils'
import { server } from '../../../../mocks/server'
import { useAuthStore } from '../../../../../src/store/auth'
import DocumentUploadStep from '../../../../../src/pages/applications/fundapplication/components/steps/DocumentUploadStep'

// Only which folder the step asks the file manager to open is under test here.
vi.mock('../../../../../src/components/FileManagerModal/FileManagerModal', () => ({
  FileManagerModal: (props: { entityType?: string; entityId?: string | number | null }) => (
    <div data-testid="file-manager" data-entity-type={props.entityType} data-entity-id={String(props.entityId ?? '')} />
  ),
}))

beforeEach(() => {
  // A partner admin: their own entity id is the partner's, not any borrower's.
  useAuthStore.setState({ user: { id: 1, entity_type: 'Partner', entity_id: 999, is_host: 0, permissions: [] } } as never)
  server.use(
    http.get('*/common/funding-application/funding-request', () =>
      HttpResponse.json({ status: true, data: { id: 5, borrower_id: 57, funding_request_id: 3 } })
    ),
    http.get('*/common/doc-types', () => HttpResponse.json({ status: true, data: [] })),
    http.get('*/common/funding-application/documents/:id', () => HttpResponse.json({ status: true, data: [] }))
  )
})
afterEach(() => server.resetHandlers())

describe('DocumentUploadStep - the borrower folder it opens', () => {
  /**
   * Defect (fch-api findings D2): the step opened borrowers/{the signed-in
   * user's entity id} - a partner's or staff member's id, so some unrelated
   * borrower's folder. It opens the application's borrower's folder.
   */
  it("opens the application's borrower's folder, not one named by the signed-in user's id", async () => {
    renderWithProviders(
      <DocumentUploadStep onNext={() => {}} onBack={() => {}} loading={false} fundingRequestId={3} fundingApplicationId={5} />
    )

    await waitFor(() => expect(screen.getByTestId('file-manager')).toHaveAttribute('data-entity-id', '57'))
    expect(screen.getByTestId('file-manager')).toHaveAttribute('data-entity-type', 'borrowers')
  })
})
