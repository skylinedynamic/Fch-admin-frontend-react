import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  useEditConfirmationStore,
  requestEditConfirmation,
  setEditRequiresConfirmation,
  setEditConfirmationResolving,
  resetEditConfirmation,
  resolveEditConfirmation,
  getEditConfirmationState,
} from '../../src/store/fundApplication/editConfirmationStore'

const reset = () =>
  useEditConfirmationStore.setState({
    requiresConfirmation: false,
    isResolving: false,
    promptOnOpen: null,
    hasConfirmed: false,
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

  // ── The application's status arrives after the form does ─────────

  it('holds a save that arrives before the application has loaded', async () => {
    setEditConfirmationResolving(true)

    let settled = false
    const pending = requestEditConfirmation().then(result => {
      settled = true
      return result
    })

    await Promise.resolve()
    expect(settled).toBe(false)
    expect(getEditConfirmationState().isOpen).toBe(false)

    // It loads, and turns out to be signed: the held save gets the dialog.
    setEditRequiresConfirmation(true)
    setEditConfirmationResolving(false)
    await Promise.resolve()
    await Promise.resolve()

    expect(getEditConfirmationState().isOpen).toBe(true)
    expect(settled).toBe(false)

    resolveEditConfirmation(true)
    await expect(pending).resolves.toBe(true)
  })

  it('lets a held save through once the application loads unsigned', async () => {
    setEditConfirmationResolving(true)
    const pending = requestEditConfirmation()

    setEditRequiresConfirmation(false)
    setEditConfirmationResolving(false)

    await expect(pending).resolves.toBe(true)
    expect(getEditConfirmationState().isOpen).toBe(false)
  })

  // ── Asked once per visit ─────────────────────────────────────────

  it('does not ask again in the same visit once the warning is accepted', async () => {
    setEditRequiresConfirmation(true)

    const first = requestEditConfirmation()
    resolveEditConfirmation(true)
    await first

    await expect(requestEditConfirmation()).resolves.toBe(true)
    expect(getEditConfirmationState().isOpen).toBe(false)
  })

  it('still asks on the next save after the warning was declined', async () => {
    setEditRequiresConfirmation(true)

    const first = requestEditConfirmation()
    resolveEditConfirmation(false)
    await first

    requestEditConfirmation()
    expect(getEditConfirmationState().isOpen).toBe(true)
  })

  it('asks afresh once the application has been edited and signed again', async () => {
    setEditRequiresConfirmation(true)
    const first = requestEditConfirmation()
    resolveEditConfirmation(true)
    await first

    // The edit dropped it to Draft; re-signing makes it signed again.
    setEditRequiresConfirmation(false)
    setEditRequiresConfirmation(true)

    requestEditConfirmation()
    expect(getEditConfirmationState().isOpen).toBe(true)
  })

  // ── Prompting when the wizard opens ──────────────────────────────

  it('marks an application that was already signed when opened', () => {
    setEditRequiresConfirmation(true)

    expect(getEditConfirmationState().promptOnOpen).toBe(true)
  })

  it('does not prompt on open for one that only became signed during the visit', () => {
    // Opened as a draft, then submitted while the wizard was still on screen.
    setEditRequiresConfirmation(false)
    setEditRequiresConfirmation(true)

    expect(getEditConfirmationState().promptOnOpen).toBe(false)
    expect(getEditConfirmationState().requiresConfirmation).toBe(true)
  })

  it('forgets everything when the wizard closes', async () => {
    setEditRequiresConfirmation(true)
    const pending = requestEditConfirmation()

    resetEditConfirmation()

    // The waiting save is released rather than left hanging.
    await expect(pending).resolves.toBe(true)
    expect(getEditConfirmationState()).toMatchObject({
      requiresConfirmation: false,
      isResolving: false,
      promptOnOpen: null,
      hasConfirmed: false,
      isOpen: false,
      resolver: null,
    })
  })
})
