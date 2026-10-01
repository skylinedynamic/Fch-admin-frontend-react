import { afterEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../../../src/store/auth'
import CreditProfileRequestDetailsLoader from '../../../src/components/Loader/CreditProfileRequestDetailsLoader'
import { renderWithProviders, screen } from '../../test-utils'

/**
 * The waiting state should look like a loader, not like the page with the
 * words already filled in.
 *
 * A card title, a table column header and a body of copy are all real
 * information - what this section is, what each column means - and none of it
 * is known to have changed between one render of the skeleton and the next.
 * Printing it as real text made the skeleton a preview of the copy rather than
 * a placeholder for the data, and looked inconsistent with a screen that is
 * still visibly loading everywhere else. Every one of those strings is now a
 * bar, matched in width to what it stands in for, same as the field values
 * always were.
 *
 * The Credit Authorization section keeps only a `data-testid` to find it by -
 * gating it on the host role (see the tests below) needs a signal, and a test
 * cannot reach for text that is no longer there.
 */
const reset = () =>
  useAuthStore.setState({ token: undefined, user: null, userSubscription: null, rememberMe: true })

describe('CreditProfileRequestDetailsLoader', () => {
  afterEach(reset)

  it('names no section - every card heading is a bar, not real text', () => {
    useAuthStore.setState({ user: { id: 1, is_host: 1 } })

    renderWithProviders(<CreditProfileRequestDetailsLoader />)

    expect(screen.queryByText('Applicant Details')).not.toBeInTheDocument()
    expect(screen.queryByText('Address Details')).not.toBeInTheDocument()
    expect(screen.queryByText('Borrower Account')).not.toBeInTheDocument()
    expect(screen.queryByText(/personal and contact/i)).not.toBeInTheDocument()
  })

  it('names no table column while the Credit Authorization panel loads', () => {
    useAuthStore.setState({ user: { id: 1, is_host: 1 } })

    renderWithProviders(<CreditProfileRequestDetailsLoader />)

    expect(screen.queryByText('Agreed (UTC)')).not.toBeInTheDocument()
    expect(screen.queryByText('iSoftPull txn')).not.toBeInTheDocument()
    expect(screen.queryByText('Credit Authorization')).not.toBeInTheDocument()
  })

  // -- the panel is still gated on the role, just found a different way -----

  it('shows the Credit Authorization skeleton for a host user', () => {
    useAuthStore.setState({ user: { id: 1, is_host: 1 } })

    renderWithProviders(<CreditProfileRequestDetailsLoader />)

    expect(screen.getByTestId('credit-authorization-panel-skeleton')).toBeInTheDocument()
  })

  it('does not show it for a non-host user', () => {
    // A partner never sees this panel once loaded, so drawing it here would be
    // a reflow of its own - content disappearing rather than appearing.
    useAuthStore.setState({ user: { id: 1, is_host: 0 } })

    renderWithProviders(<CreditProfileRequestDetailsLoader />)

    expect(screen.queryByTestId('credit-authorization-panel-skeleton')).not.toBeInTheDocument()
  })

  it('does not show it before the user has loaded', () => {
    useAuthStore.setState({ user: null })

    renderWithProviders(<CreditProfileRequestDetailsLoader />)

    expect(screen.queryByTestId('credit-authorization-panel-skeleton')).not.toBeInTheDocument()
  })

  it('survives rendering with no auth state at all', () => {
    expect(() => renderWithProviders(<CreditProfileRequestDetailsLoader />)).not.toThrow()
  })
})
