import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test-utils'
import { server } from '../../../mocks/server'
import EditConfirmationModal from '../../../../src/pages/applications/fundapplication/components/shared/EditConfirmationModal'
import { useSaveBusinessInfo } from '../../../../src/modules/funding-application/queries'
import { isEditConfirmationCancelled } from '../../../../src/modules/funding-application/editConfirmation'
import {
  useEditConfirmationStore,
  setEditRequiresConfirmation,
} from '../../../../src/store/fundApplication/editConfirmationStore'

// The shared ConfirmationModal drives Bootstrap's real Modal class, whose
// transition callbacks fire after the test's component has unmounted and throw
// against a ref that is already gone. A synchronous fake avoids depending on
// transition events at all.
vi.mock('bootstrap/js/dist/modal', () => {
  class FakeModal {
    private el: HTMLElement
    constructor(el: HTMLElement) {
      this.el = el
    }
    show() {
      this.el.classList.add('show')
      this.el.style.display = 'block'
      this.el.removeAttribute('aria-hidden')
      this.el.setAttribute('aria-modal', 'true')
    }
    hide() {
      this.el.classList.remove('show')
      this.el.style.display = 'none'
      this.el.setAttribute('aria-hidden', 'true')
      this.el.removeAttribute('aria-modal')
    }
    dispose() {}
  }
  return { default: FakeModal }
})

/**
 * The partner-facing half of the re-signature rule.
 *
 * While nothing has been signed, saving must be silent. Once the application
 * has been signed and submitted, opening it asks first - before any typing -
 * because a saved change clears the signature and takes the application out of
 * review until it is signed again. Accepting covers the rest of that visit.
 *
 * The dialog is the portal's shared flip confirmation, which keeps its markup
 * mounted while closed, so "is it open" is read from the store that drives it
 * and its buttons are found with `hidden: true`.
 *
 * Driven through the real mutation hook and the real apiClient against MSW, so
 * what is exercised is "does a request reach the server".
 */

const BUSINESS_INFO_URL = '*/common/funding-application/business-info'

const isOpen = () => useEditConfirmationStore.getState().isOpen
const confirmButton = () => screen.getByRole('button', { name: /yes, edit application/i, hidden: true })
const cancelButton = () => screen.getByRole('button', { name: /cancel/i, hidden: true })

/** A step's Save button, standing in for any of the six that save this way. */
function SaveHarness() {
  const { mutateAsync: save } = useSaveBusinessInfo()

  const onClick = async () => {
    try {
      await save({ business_name: 'Alpha Tech Solutions LLC' } as any)
    } catch (error) {
      // Mirrors what the real steps do: a cancellation is not a failure.
      if (!isEditConfirmationCancelled(error)) throw error
    }
  }

  return (
    <>
      <button type="button" onClick={onClick}>
        Save
      </button>
      <EditConfirmationModal />
    </>
  )
}

describe('EditConfirmationModal (partner)', () => {
  let requests: number

  beforeEach(() => {
    requests = 0
    server.use(
      http.post(BUSINESS_INFO_URL, () => {
        requests += 1
        return HttpResponse.json({ status: true, message: 'Saved', data: { id: 1 } })
      })
    )
  })

  afterEach(() => {
    useEditConfirmationStore.setState({
      requiresConfirmation: false,
      isResolving: false,
      promptOnOpen: null,
      hasConfirmed: false,
      isOpen: false,
      resolver: null,
    })
  })

  it('stays out of the way while nothing has been signed', async () => {
    // On Hold / Draft: the API reports no cost.
    setEditRequiresConfirmation(false)

    renderWithProviders(<SaveHarness />)
    expect(isOpen()).toBe(false)

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(requests).toBe(1))
    expect(isOpen()).toBe(false)
  })

  it('asks as soon as an already-submitted application is opened', async () => {
    setEditRequiresConfirmation(true)

    renderWithProviders(<SaveHarness />)

    await waitFor(() => expect(isOpen()).toBe(true))
    expect(requests).toBe(0)
  })

  it('spells out that a change costs the signature and needs a re-signature', async () => {
    setEditRequiresConfirmation(true)

    renderWithProviders(<SaveHarness />)
    await waitFor(() => expect(isOpen()).toBe(true))

    expect(screen.getByText('Edit Submitted Application?')).toBeInTheDocument()
    expect(screen.getByText(/already been signed and submitted/i)).toBeInTheDocument()
    expect(screen.getByText(/Re-signature required/i)).toBeInTheDocument()
    expect(screen.getByText(/Editing any field on this application will require/i)).toBeInTheDocument()
    expect(screen.getByText(/returns to Submitted status/i)).toBeInTheDocument()
    expect(screen.getByText(/verify (your|the) updated application and make a decision/i)).toBeInTheDocument()
    expect(screen.getByText(/The borrower must review and re-sign the application/i)).toBeInTheDocument()
  })

  it('lets saves through for the rest of the visit once the warning is accepted', async () => {
    setEditRequiresConfirmation(true)

    renderWithProviders(<SaveHarness />)
    await waitFor(() => expect(isOpen()).toBe(true))
    await userEvent.click(confirmButton())
    expect(isOpen()).toBe(false)
    expect(requests).toBe(0)

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(requests).toBe(1))

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(requests).toBe(2))
    expect(isOpen()).toBe(false)
  })

  it('sends nothing when the warning is declined', async () => {
    setEditRequiresConfirmation(true)

    renderWithProviders(<SaveHarness />)
    await waitFor(() => expect(isOpen()).toBe(true))
    await userEvent.click(cancelButton())

    expect(isOpen()).toBe(false)
    expect(requests).toBe(0)
  })

  it('asks on save when the application only became signed during the visit', async () => {
    // Opened unsigned, so no dialog on open...
    setEditRequiresConfirmation(false)
    renderWithProviders(<SaveHarness />)
    expect(isOpen()).toBe(false)

    // ...then it was submitted with the wizard still on screen.
    setEditRequiresConfirmation(true)
    expect(isOpen()).toBe(false)

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(isOpen()).toBe(true))
    expect(requests).toBe(0)

    await userEvent.click(confirmButton())
    await waitFor(() => expect(requests).toBe(1))
  })
})
