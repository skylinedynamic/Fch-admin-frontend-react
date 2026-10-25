import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { screen, waitFor } from '../../test-utils'
import { allowBackgroundCalls, renderPage, signIn } from '../pageHarness'
import { server } from '../../mocks/server'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

import CreditAccountForm from '../../../src/pages/credit-builder/credit-accounts/components/CreditAccountForm'

/**
 * BUG-042: a card is made Active or Inactive on its details page. An inactive
 * card is no longer offered to borrowers - in Credit Accounts or in any
 * Capital Access play.
 */
const card = {
  id: 71, card_name: 'Ink Business Cash', issuer: 'Chase', credit_category: 'Business Card',
  typical_personal_fico_min: 680, time_in_business_min_months: 6, reference_url: 'https://chase.test/ink',
  image_url: 'credit-accounts/ink.png', full_image_url: 'http://api.test/storage/credit-accounts/ink.png', status: 'Active',
}

let saved: Record<string, unknown> | null = null

beforeEach(() => {
  saved = null
  signIn({ permissions: ['view credit accounts', 'update credit accounts'] })
  allowBackgroundCalls()
  server.use(
    http.get('*/admin/credit-builder/credit-accounts/71', () => HttpResponse.json({ status: true, data: card })),
    http.put('*/admin/credit-builder/credit-accounts/71', async ({ request }) => {
      saved = (await request.json()) as Record<string, unknown>
      return HttpResponse.json({ status: true, data: { ...card, ...saved } })
    })
  )
})
afterEach(() => server.resetHandlers())

const statusSwitch = () => screen.getByRole('switch', { name: 'Active' })

describe('Credit account details - status', () => {
  it('shows the card\'s status and saves the one chosen', async () => {
    const user = userEvent.setup()
    renderPage(<CreditAccountForm />, { path: '/credit-accounts/:id', route: '/credit-accounts/71' })

    await screen.findByDisplayValue('Ink Business Cash')
    expect(statusSwitch()).toBeChecked()

    await user.click(statusSwitch())
    expect(statusSwitch()).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(saved).not.toBeNull())
    expect(saved).toMatchObject({ status: 'Inactive' })
  })

  it('says what Inactive means for borrowers', async () => {
    const user = userEvent.setup()
    renderPage(<CreditAccountForm />, { path: '/credit-accounts/:id', route: '/credit-accounts/71' })

    await screen.findByDisplayValue('Ink Business Cash')
    expect(screen.getByText(/offered to borrowers in credit accounts and in capital access plays/i)).toBeInTheDocument()
    await user.click(statusSwitch())

    expect(screen.getByText(/no longer offered to borrowers/i)).toBeInTheDocument()
  })
})
