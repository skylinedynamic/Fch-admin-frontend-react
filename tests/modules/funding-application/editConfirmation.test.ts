import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  withEditConfirmation,
  EditConfirmationCancelled,
  isEditConfirmationCancelled,
} from '../../../src/modules/funding-application/editConfirmation'
import {
  useEditConfirmationStore,
  setEditRequiresConfirmation,
  resolveEditConfirmation,
} from '../../../src/store/fundApplication/editConfirmationStore'

const reset = () =>
  useEditConfirmationStore.setState({
    requiresConfirmation: false,
    isOpen: false,
    resolver: null,
  })

describe('withEditConfirmation', () => {
  beforeEach(reset)
  afterEach(reset)

  it('calls through untouched while nothing is signed', async () => {
    const save = vi.fn().mockResolvedValue({ ok: true })

    await expect(withEditConfirmation(save)({ business_name: 'Alpha' })).resolves.toEqual({ ok: true })
    expect(save).toHaveBeenCalledWith({ business_name: 'Alpha' })
  })

  it('sends the save only after the borrower confirms', async () => {
    setEditRequiresConfirmation(true)
    const save = vi.fn().mockResolvedValue({ ok: true })

    const pending = withEditConfirmation(save)({ business_name: 'Alpha' })

    // Nothing may reach the API while the dialog is still on screen.
    expect(save).not.toHaveBeenCalled()

    resolveEditConfirmation(true)
    await expect(pending).resolves.toEqual({ ok: true })
    expect(save).toHaveBeenCalledOnce()
  })

  it('never sends the save when the borrower backs out', async () => {
    setEditRequiresConfirmation(true)
    const save = vi.fn().mockResolvedValue({ ok: true })

    const pending = withEditConfirmation(save)({ business_name: 'Alpha' })
    resolveEditConfirmation(false)

    await expect(pending).rejects.toBeInstanceOf(EditConfirmationCancelled)
    expect(save).not.toHaveBeenCalled()
  })

  it('marks a cancellation as its own kind of failure, not a save error', async () => {
    // The steps use this to stay quiet on cancel instead of toasting
    // "Failed to save", which would read as though something went wrong.
    expect(isEditConfirmationCancelled(new EditConfirmationCancelled())).toBe(true)
    expect(isEditConfirmationCancelled(new Error('Network Error'))).toBe(false)
    expect(isEditConfirmationCancelled({ response: { status: 423 } })).toBe(false)
    expect(isEditConfirmationCancelled(null)).toBe(false)
  })

  it('lets a real save failure through unchanged', async () => {
    setEditRequiresConfirmation(true)
    const failure = Object.assign(new Error('Request failed'), { response: { status: 423 } })
    const save = vi.fn().mockRejectedValue(failure)

    const pending = withEditConfirmation(save)({ business_name: 'Alpha' })
    resolveEditConfirmation(true)

    await expect(pending).rejects.toBe(failure)
  })
})
