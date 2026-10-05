import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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

/**
 * The partner-facing half of the re-signature rule.
 *
 * A partner preparing an application for the first time must not be interrupted
 * on every step - nothing has been signed, so there is nothing to lose. Once the
 * borrower has signed and submitted, every subsequent save asks first, because
 * it withdraws the *borrower's* signature and sends the application back out of
 * review for someone who is not in the room.
 *
 * Driven through the real mutation hook and the real apiClient against MSW, so
 * what is exercised is "does a request reach the server".
 */

const BUSINESS_INFO_URL = '*/common/funding-application/business-info'

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
    useEditConfirmationStore.setState({ requiresConfirmation: false, isOpen: false, resolver: null })
  })

  it('stays out of the way while the partner is still preparing the application', async () => {
    // On Hold / Draft: the borrower has not signed, so the API reports no cost.
    setEditRequiresConfirmation(false)

    renderWithProviders(<SaveHarness />)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(requests).toBe(1))
    expect(screen.queryByText(/clear the borrower/i)).not.toBeInTheDocument()
  })

  it('asks before changing an application the borrower has already submitted', async () => {
    setEditRequiresConfirmation(true)

    renderWithProviders(<SaveHarness />)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText(/clear the borrower/i)).toBeInTheDocument()
    expect(requests).toBe(0)
  })

  it('makes clear it is the borrower who has to act, not the partner', async () => {
    setEditRequiresConfirmation(true)

    renderWithProviders(<SaveHarness />)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText(/withdraws their signature/i)).toBeInTheDocument()
    expect(screen.getByText(/until the borrower signs it again/i)).toBeInTheDocument()
    expect(screen.getByText(/recorded against your account/i)).toBeInTheDocument()
  })

  it('sends the save once the partner accepts the consequence', async () => {
    setEditRequiresConfirmation(true)

    renderWithProviders(<SaveHarness />)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await userEvent.click(await screen.findByRole('button', { name: /save and request re-signature/i }))

    await waitFor(() => expect(requests).toBe(1))
    await waitFor(() => expect(screen.queryByText(/clear the borrower/i)).not.toBeInTheDocument())
  })

  it('sends nothing when the partner leaves the application as submitted', async () => {
    setEditRequiresConfirmation(true)

    renderWithProviders(<SaveHarness />)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await userEvent.click(await screen.findByRole('button', { name: /leave it as submitted/i }))

    await waitFor(() => expect(screen.queryByText(/clear the borrower/i)).not.toBeInTheDocument())
    expect(requests).toBe(0)
  })

  it('asks again on the next edit, not just the first one', async () => {
    setEditRequiresConfirmation(true)

    renderWithProviders(<SaveHarness />)

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await userEvent.click(await screen.findByRole('button', { name: /save and request re-signature/i }))
    await waitFor(() => expect(requests).toBe(1))

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText(/clear the borrower/i)).toBeInTheDocument()
    expect(requests).toBe(1)
  })
})
