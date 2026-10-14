import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '../../test-utils'
import { DocumentSection } from '../../../src/pages/documents/components/DocumentSection'

const file = (over: Record<string, unknown> = {}) =>
  ({ name: 'bank-statement.pdf', path: '/docs/bank-statement.pdf', type: 'application/pdf', isDirectory: false, documentId: 7, size: 2048, ...over }) as never

const setup = (props: Partial<React.ComponentProps<typeof DocumentSection>> = {}) => {
  const handlers = { onToggle: vi.fn(), onOpenFileManager: vi.fn(), onRemoveFile: vi.fn() }
  const view = render(<DocumentSection section="Bank Statements" files={[]} isOpen {...handlers} {...props} />)
  return { ...handlers, ...view }
}

describe('DocumentSection', () => {
  it('shows the section name and the upload prompt', () => {
    setup()

    expect(screen.getByText('Bank Statements')).toBeInTheDocument()
    expect(screen.getByText('Click here to upload documents.')).toBeInTheDocument()
  })

  it('lists files and leaves folders out', () => {
    setup({ files: [file(), file({ name: 'archive', path: '/docs/archive', isDirectory: true, documentId: 8 })] })

    expect(screen.getByText('bank-statement.pdf')).toBeInTheDocument()
    expect(screen.queryByText('archive')).not.toBeInTheDocument()
  })

  it('renders no file list when the section is empty', () => {
    const { container } = setup()

    expect(container.querySelector('.list-group')).toBeNull()
  })

  it('removes a file by its document id', async () => {
    const user = userEvent.setup()
    const { onRemoveFile } = setup({ files: [file()] })

    await user.click(screen.getByRole('button', { name: /remove/i }))

    expect(onRemoveFile).toHaveBeenCalledWith('Bank Statements', 7)
  })

  it('does not call remove for a file that has no document id yet', async () => {
    const user = userEvent.setup()
    const { onRemoveFile } = setup({ files: [file({ documentId: undefined })] })

    await user.click(screen.getByRole('button', { name: /remove/i }))

    expect(onRemoveFile).not.toHaveBeenCalled()
  })

  it('shows the uploading state instead of the prompt', () => {
    setup({ isUploading: true })

    expect(screen.getByText('Uploading documents...')).toBeInTheDocument()
    expect(screen.queryByText('Click here to upload documents.')).not.toBeInTheDocument()
  })

  it('opens the file manager for this section when the drop zone is clicked', async () => {
    const user = userEvent.setup()
    const { onOpenFileManager } = setup()

    await user.click(screen.getByText('Click here to upload documents.'))

    expect(onOpenFileManager).toHaveBeenCalled()
    expect(onOpenFileManager.mock.calls[0][0]).toBe('Bank Statements')
  })

  it('toggles when the header is clicked', async () => {
    const user = userEvent.setup()
    const { onToggle } = setup()

    await user.click(screen.getByText('Bank Statements'))

    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
