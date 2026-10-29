import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor, within } from '../../../test-utils'
import { server } from '../../../mocks/server'
import { useAuthStore } from '../../../../src/store/auth'
import ClientDocumentsSection from '../../../../src/pages/clients/components/ClientDocumentsSection'

// The file manager is its own component: here it only hands back one picked file.
vi.mock('../../../../src/components/FileManagerModal/FileManagerModal', () => ({
  FileManagerModal: (props: { isOpen: boolean; onSelectFiles: (files: { path: string; name: string }[]) => void }) =>
    props.isOpen ? (
      <button type="button" onClick={() => props.onSelectFiles([{ path: 'borrowers/57/check.pdf', name: 'check.pdf' }])}>
        Pick check.pdf
      </button>
    ) : null,
}))

const TYPES = [
  { id: 1, name: "Driver's License", sort_order: 1, is_required: true },
  { id: 2, name: 'Voided Business Check', sort_order: 2, is_required: true },
  { id: 3, name: 'EIN / Corporation Docs', sort_order: 3, is_required: true },
  { id: 4, name: 'Business Plan', sort_order: 4, is_required: false },
  { id: 5, name: 'Tax Returns', sort_order: 5, is_required: false },
]
const doc = (id: number, type: string, status: string, extra: Record<string, unknown> = {}) => ({
  id, document_name: `file-${id}.pdf`, document_number: `DOC-${id}`, type, size: '4.45 KB', date: '2026-10-29', status, file_path: `${id}.pdf`, ...extra,
})

let uploads: Record<string, unknown>[] = []

beforeEach(() => {
  uploads = []
  useAuthStore.setState({ user: { id: 1, entity_type: 'Partner', is_host: 1, permissions: [] } } as never)
  server.use(
    http.get('*/common/borrower-document-types', () => HttpResponse.json({ status: true, data: TYPES })),
    http.post('*/common/borrowers-documents/57', () =>
      HttpResponse.json({
        status: true,
        data: [
          doc(11, "Driver's License", 'Accepted'),
          doc(12, 'Voided Business Check', 'Rejected', { rejection_reason: 'Not readable' }),
          doc(13, 'Business Plan', 'Uploaded'),
        ],
      })
    ),
    http.post('*/common/borrowers-documents/upload', async ({ request }) => {
      uploads.push((await request.json()) as Record<string, unknown>)
      return HttpResponse.json({ status: true, data: [] })
    })
  )
})
afterEach(() => server.resetHandlers())

const renderTab = () =>
  renderWithProviders(
    <Routes>
      <Route path="/clients/:id" element={<ClientDocumentsSection />} />
    </Routes>,
    { route: '/clients/57' }
  )

const card = (name: string) => screen.getByRole('rowgroup', { name }) as HTMLElement

describe('Client › Documents tab, by category', () => {
  it('shows a group per category, with each file under its own category', async () => {
    renderTab()

    await screen.findByRole('rowgroup', { name: "Driver's License" })
    expect(within(card("Driver's License")).getByText('file-11.pdf')).toBeInTheDocument()
    expect(within(card("Driver's License")).getByText('DOC-11')).toBeInTheDocument()
    expect(within(card('Voided Business Check')).getByText('file-12.pdf')).toBeInTheDocument()
    expect(within(card('Business Plan')).getByText('file-13.pdf')).toBeInTheDocument()
    expect(within(card("Driver's License")).queryByText('file-12.pdf')).not.toBeInTheDocument()
  })

  it('marks required categories and says where each stands', async () => {
    renderTab()

    await screen.findByRole('rowgroup', { name: "Driver's License" })
    expect(within(card("Driver's License")).getByText('Required')).toBeInTheDocument()
    expect(within(card("Driver's License")).getByText('Accepted', { selector: '.cdoc-state' })).toBeInTheDocument()
    expect(within(card('Voided Business Check')).getByText('Re-upload needed', { selector: '.cdoc-state' })).toBeInTheDocument()
    expect(within(card('EIN / Corporation Docs')).getByText('Missing', { selector: '.cdoc-state' })).toBeInTheDocument()
    // A missing category is its header row alone: no filler row, no "0 files".
    expect(within(card('EIN / Corporation Docs')).getAllByRole('row')).toHaveLength(1)
    expect(within(card('EIN / Corporation Docs')).queryByText(/0 files/)).not.toBeInTheDocument()
    expect(within(card('Business Plan')).getByText('Optional')).toBeInTheDocument()
    expect(within(card('Business Plan')).getByText('In review', { selector: '.cdoc-state' })).toBeInTheDocument()
  })

  it('sums up the required categories and the review', async () => {
    renderTab()

    const summary = await screen.findByLabelText('Documents summary')
    expect(summary).toHaveTextContent('1 of 3 required categories complete')
    expect(summary).toHaveTextContent('1 Accepted')
    expect(summary).toHaveTextContent('1 In review')
    expect(summary).toHaveTextContent('1 Rejected')
  })

  it('shows only the review counts that are not zero', async () => {
    server.use(
      http.post('*/common/borrowers-documents/57', () =>
        HttpResponse.json({ status: true, data: [doc(11, "Driver's License", 'Accepted')] })
      )
    )
    renderTab()

    const summary = await screen.findByLabelText('Documents summary')
    expect(summary).toHaveTextContent('1 Accepted')
    expect(summary).not.toHaveTextContent(/In review|Rejected/)
  })

  it('leaves empty optional categories out (Add Document still offers them)', async () => {
    renderTab()

    await screen.findByRole('rowgroup', { name: "Driver's License" })
    expect(screen.queryByRole('rowgroup', { name: 'Tax Returns' })).not.toBeInTheDocument()
    expect(screen.queryByText('Tax Returns')).not.toBeInTheDocument()
  })

  it("uploads straight into a category from its card's Upload button", async () => {
    const user = userEvent.setup()
    renderTab()

    await screen.findByRole('rowgroup', { name: 'EIN / Corporation Docs' })
    await user.click(within(card('EIN / Corporation Docs')).getByRole('button', { name: /upload to EIN/i }))
    await user.click(screen.getByRole('button', { name: 'Pick check.pdf' }))

    await waitFor(() => expect(uploads).toHaveLength(1))
    expect(uploads[0]).toMatchObject({ borrower_id: 57, document_type_id: 3, file_path: ['borrowers/57/check.pdf'] })
  })

  it('shows an empty state when the client has no documents, with the required ones to upload', async () => {
    server.use(http.post('*/common/borrowers-documents/57', () => HttpResponse.json({ status: true, data: [] })))
    const user = userEvent.setup()
    renderTab()

    const empty = await screen.findByRole('region', { name: 'No documents uploaded yet' })
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Documents summary')).toHaveTextContent('0 of 3 required categories complete')
    expect(within(empty).getAllByRole('button', { name: /^Upload / }).map((b) => b.querySelector('.cdoc-empty-item-name')?.textContent)).toEqual([
      "Driver's License",
      'Voided Business Check',
      'EIN / Corporation Docs',
    ])

    await user.click(within(empty).getByRole('button', { name: 'Upload Voided Business Check' }))
    await user.click(screen.getByRole('button', { name: 'Pick check.pdf' }))
    await waitFor(() => expect(uploads[0]).toMatchObject({ document_type_id: 2 }))
  })
})

describe('Client › Documents tab, Add Document', () => {
  it("is a primary button in the theme's colour, not a fixed one", async () => {
    renderTab()

    const add = await screen.findByRole('button', { name: 'Add Document' })
    expect(add).toHaveClass('btn', 'btn-primary')
    expect(add.getAttribute('style')).toBeNull()
  })

  it('picks the category from the custom select, then uploads into it', async () => {
    const user = userEvent.setup()
    renderTab()

    await user.click(await screen.findByRole('button', { name: 'Add Document' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add Document' })
    expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument()

    // The custom select: its trigger shows the first category, its list every category.
    await user.click(within(dialog).getByRole('button', { name: "Driver's License" }))
    await user.click(within(dialog).getByRole('button', { name: 'Business Plan' }))
    expect(within(dialog).getByRole('button', { name: 'Business Plan' })).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /choose files/i }))
    await user.click(screen.getByRole('button', { name: 'Pick check.pdf' }))
    await waitFor(() => expect(uploads[0]).toMatchObject({ document_type_id: 4 }))
  })
})

describe('Client › Documents tab, folding a category', () => {
  it("hides a category's files from its header row, and shows them again", async () => {
    const user = userEvent.setup()
    renderTab()

    await screen.findByText('file-11.pdf')
    const toggle = screen.getByRole('button', { name: "Driver's License" })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await user.click(toggle)
    expect(screen.queryByText('file-11.pdf')).not.toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('file-12.pdf')).toBeInTheDocument()

    await user.click(toggle)
    expect(screen.getByText('file-11.pdf')).toBeInTheDocument()
  })
})
