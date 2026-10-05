import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  useEditConfirmationStore,
  requestEditConfirmation,
  setEditRequiresConfirmation,
  resolveEditConfirmation,
  getEditConfirmationState,
} from '../../src/store/fundApplication/editConfirmationStore'

const reset = () =>
  useEditConfirmationStore.setState({
    requiresConfirmation: false,
    isOpen: false,
    resolver: null,
  })

describe('editConfirmationStore', () => {
  beforeEach(reset)
  afterEach(reset)

  it('lets a save straight through while nothing is signed', async () => {
    // On Hold / Draft: there is no signature to lose, so no interruption.
    await expect(requestEditConfirmation()).resolves.toBe(true)
    expect(getEditConfirmationState().isOpen).toBe(false)
  })

  it('opens the dialog and waits once the application is signed', async () => {
    setEditRequiresConfirmation(true)

    const pending = requestEditConfirmation()

    expect(getEditConfirmationState().isOpen).toBe(true)

    resolveEditConfirmation(true)

    await expect(pending).resolves.toBe(true)
    expect(getEditConfirmationState().isOpen).toBe(false)
  })

  it('resolves false and closes when the borrower backs out', async () => {
    setEditRequiresConfirmation(true)

    const pending = requestEditConfirmation()
    resolveEditConfirmation(false)

    await expect(pending).resolves.toBe(false)
    expect(getEditConfirmationState().isOpen).toBe(false)
    expect(getEditConfirmationState().resolver).toBeNull()
  })

  it('does not strand a second save behind the first', async () => {
    setEditRequiresConfirmation(true)

    const first = requestEditConfirmation()
    const second = requestEditConfirmation()

    resolveEditConfirmation(true)

    // Whatever the ordering, neither promise may hang forever - a stuck save
    // button with no dialog on screen is worse than an extra confirmation.
    await expect(Promise.all([first, second])).resolves.toHaveLength(2)
    expect(getEditConfirmationState().isOpen).toBe(false)
  })

  it('stops asking once the application is back to unsigned', async () => {
    setEditRequiresConfirmation(true)
    setEditRequiresConfirmation(false)

    await expect(requestEditConfirmation()).resolves.toBe(true)
    expect(getEditConfirmationState().isOpen).toBe(false)
  })
})
