import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ConfirmationModal from '../../../../src/components/Common/Modals/ConfirmationModal'

// Bootstrap's modal JS needs a real layout; only the confirm handling is under test.
vi.mock('bootstrap/js/dist/modal', () => ({
  default: class {
    show() {}
    hide() {}
    dispose() {}
  },
}))

// R2 BUG-045: a double-click on "Update" in "Are you sure...?" sent the status
// change twice - the button is only disabled once the parent re-renders with
// loading, which is after the second click.
describe('ConfirmationModal', () => {
  const renderModal = (props: Record<string, unknown> = {}) =>
    render(<ConfirmationModal show onHide={() => {}} onConfirm={vi.fn()} loading={false} title="Update Status" message="Are you sure?" confirmText="Update" {...props} />)

  it('confirms once for a double-click', () => {
    const onConfirm = vi.fn()
    renderModal({ onConfirm })

    const update = screen.getByRole('button', { name: 'Update', hidden: true })
    fireEvent.click(update)
    fireEvent.click(update)

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('takes a new confirmation once the first one has finished', () => {
    const onConfirm = vi.fn()
    const { rerender } = renderModal({ onConfirm })
    const update = () => screen.getByRole('button', { name: /Update/, hidden: true })

    fireEvent.click(update())
    rerender(<ConfirmationModal show onHide={() => {}} onConfirm={onConfirm} loading title="Update Status" message="Are you sure?" confirmText="Update" />)
    rerender(<ConfirmationModal show onHide={() => {}} onConfirm={onConfirm} loading={false} title="Update Status" message="Are you sure?" confirmText="Update" />)
    fireEvent.click(update())

    expect(onConfirm).toHaveBeenCalledTimes(2)
  })

  it('takes a new confirmation each time it is opened again', () => {
    const onConfirm = vi.fn()
    const { rerender } = renderModal({ onConfirm })

    fireEvent.click(screen.getByRole('button', { name: 'Update', hidden: true }))
    rerender(<ConfirmationModal show={false} onHide={() => {}} onConfirm={onConfirm} loading={false} title="Update Status" message="Are you sure?" confirmText="Update" />)
    rerender(<ConfirmationModal show onHide={() => {}} onConfirm={onConfirm} loading={false} title="Update Status" message="Are you sure?" confirmText="Update" />)
    fireEvent.click(screen.getByRole('button', { name: 'Update', hidden: true }))

    expect(onConfirm).toHaveBeenCalledTimes(2)
  })
})
