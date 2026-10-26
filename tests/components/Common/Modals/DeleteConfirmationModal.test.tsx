import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders, screen } from '../../../test-utils'
import DeleteConfirmationModal from '../../../../src/components/Common/Modals/DeleteConfirmationModal'

/**
 * BUG-039: the modal's default text spoke of "employees", so any page that
 * forgot to pass its own text told the user they were deleting employees.
 */
describe('DeleteConfirmationModal', () => {
  it('has a neutral default title and text', () => {
    renderWithProviders(<DeleteConfirmationModal show onConfirm={vi.fn()} onClose={vi.fn()} loading={false} text={undefined} title={undefined} />)

    expect(screen.getByText('Are you sure?', { selector: 'h4' })).toBeInTheDocument()
    expect(screen.getByText('This will be permanently deleted.')).toBeInTheDocument()
    expect(screen.queryByText(/employees/i)).not.toBeInTheDocument()
  })

  it('shows the title and text a page passes', () => {
    renderWithProviders(
      <DeleteConfirmationModal show onConfirm={vi.fn()} onClose={vi.fn()} loading={false} title="Delete Role?" text="This will permanently remove the role and all its associated permissions." />
    )

    expect(screen.getByText('Delete Role?', { selector: 'h4' })).toBeInTheDocument()
    expect(screen.getByText('This will permanently remove the role and all its associated permissions.')).toBeInTheDocument()
  })
})
