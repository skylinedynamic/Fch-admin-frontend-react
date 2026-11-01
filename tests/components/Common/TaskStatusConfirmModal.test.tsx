import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import TaskStatusConfirmModal from '../../../src/components/Common/TaskStatusConfirmModal'

describe('TaskStatusConfirmModal', () => {
  const renderOpen = (props: Partial<Parameters<typeof TaskStatusConfirmModal>[0]> = {}) => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <TaskStatusConfirmModal
        open
        summary="Collect bank statements"
        from="open"
        to="complete"
        saving={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
        {...props}
      />
    )
    return { onConfirm, onCancel }
  }

  it('asks to confirm the move from one status to the other, for the task named', () => {
    renderOpen()

    const dialog = screen.getByRole('dialog', { name: 'Change task status?' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveTextContent('Collect bank statements')
    expect(dialog).toHaveTextContent('Open')
    expect(dialog).toHaveTextContent('Complete')
  })

  it('opens with the flip animation the other confirmation modals use', () => {
    renderOpen()

    expect(screen.getByRole('dialog', { name: 'Change task status?' }).parentElement).toHaveClass('task-status-confirm', 'flip')
  })

  it('confirms or cancels', () => {
    const { onConfirm, onCancel } = renderOpen()

    fireEvent.click(screen.getByRole('button', { name: 'Yes, change it' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cancels on Escape, but not while saving', () => {
    const { onCancel } = renderOpen()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('shows saving and blocks both buttons while it saves', () => {
    const { onCancel } = renderOpen({ saving: true })

    expect(screen.getByRole('button', { name: /Saving/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('keeps its clicks to itself, so a table row behind it is not opened', () => {
    const onRowClick = vi.fn()
    render(
      <div onClick={onRowClick}>
        <TaskStatusConfirmModal open summary="X" from="open" to="complete" saving={false} onConfirm={() => {}} onCancel={() => {}} />
      </div>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Yes, change it' }))
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('renders nothing while closed', () => {
    renderOpen({ open: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
