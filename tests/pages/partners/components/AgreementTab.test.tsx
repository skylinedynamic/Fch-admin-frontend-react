import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../../test-utils'
import { server } from '../../../mocks/server'
import AgreementTab from '../../../../src/pages/partners/components/AgreementTab'

const toastSuccess = vi.hoisted(() => vi.fn())
const toastError = vi.hoisted(() => vi.fn())
vi.mock('react-toastify', () => ({
  toast: Object.assign(vi.fn(), { success: toastSuccess, error: toastError, info: vi.fn(), warn: vi.fn() }),
  ToastContainer: () => null,
}))

/**
 * The host can excuse one partner from the partner agreement, or one client
 * from their borrower agreement, from that partner's / client's Agreement tab,
 * while signing stays on for everyone else.
 */
// GET /required/:userId - whether they must sign, and whether the host can
// change it now (signing and the agreement they would sign both on in Settings).
const GLOBAL_OFF = 'Agreement signing is turned off in Settings › Agreement.'
const PARTNER_TEMPLATE_OFF = 'The partner agreement is turned off in Settings › Agreement.'
const BORROWER_TEMPLATE_OFF = "This client's partner has their borrower agreement turned off."
const requirementStatus = (overrides: Record<string, unknown> = {}) =>
  http.get('*/common/agreement-sign/required/:userId', ({ params }) =>
    HttpResponse.json({
      status: true,
      message: 'ok',
      data: {
        user_id: Number(params.userId), agreement_required: true, signing_enabled: true, template_active: true,
        can_change: true, locked_reason: null, ...overrides,
      },
    })
  )

beforeEach(() => {
  server.use(requirementStatus())
})

afterEach(() => {
  server.resetHandlers()
  vi.clearAllMocks()
})

const requirementSwitch = () => screen.getByRole('switch', { name: /require.*to sign/i })

describe('AgreementTab - requiring the agreement', () => {
  it('shows the host that a partner is asked to sign, by default', async () => {
    renderWithProviders(<AgreementTab signer="partner" isHost formData={{ user_id: 7, has_sign: false, agreement_required: true }} />)

    await waitFor(() => expect(requirementSwitch()).toBeEnabled())
    expect(requirementSwitch()).toBeChecked()
    expect(screen.getByText('This partner is asked to sign the partner agreement.')).toBeInTheDocument()
    expect(screen.getByText('Awaiting signature')).toBeInTheDocument()
  })

  it('excuses a client in place: posts the change, confirms it and updates the switch without reloading the page', async () => {
    let body: unknown = null
    server.use(
      http.post('*/common/agreement-sign/required/12', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ status: true, message: 'Agreement requirement updated successfully', data: { user_id: 12, agreement_required: false } })
      })
    )
    const onRefresh = vi.fn()
    const onRequiredChange = vi.fn()
    renderWithProviders(
      <AgreementTab
        signer="client"
        isHost
        formData={{ user_id: 12, has_sign: false, agreement_required: true }}
        onRefresh={onRefresh}
        onRequiredChange={onRequiredChange}
      />
    )

    await waitFor(() => expect(requirementSwitch()).toBeEnabled())
    await userEvent.click(requirementSwitch())

    await waitFor(() => expect(body).toEqual({ required: false }))
    await waitFor(() => expect(requirementSwitch()).not.toBeChecked())
    expect(screen.getByText('No signature needed')).toBeInTheDocument()
    expect(onRequiredChange).toHaveBeenCalledWith(false)
    expect(onRefresh).not.toHaveBeenCalled()
    expect(toastSuccess).toHaveBeenCalledWith('Agreement requirement updated successfully')
  })

  it('says so when someone is excused, and can require it again', async () => {
    let body: unknown = null
    server.use(
      http.post('*/common/agreement-sign/required/12', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ status: true, message: 'ok', data: { user_id: 12, agreement_required: true } })
      })
    )
    server.use(requirementStatus({ agreement_required: false }))
    renderWithProviders(<AgreementTab signer="client" isHost formData={{ user_id: 12, has_sign: false, agreement_required: false }} />)

    expect(await screen.findByText('No signature needed')).toBeInTheDocument()
    expect(requirementSwitch()).not.toBeChecked()
    expect(screen.getByText(/This client is not asked to sign/)).toBeInTheDocument()
    expect(screen.queryByText('Awaiting signature')).not.toBeInTheDocument()

    await waitFor(() => expect(requirementSwitch()).toBeEnabled())
    await userEvent.click(requirementSwitch())
    await waitFor(() => expect(body).toEqual({ required: true }))
  })

  it('keeps the switch as it was and reports a failed change', async () => {
    server.use(
      http.post('*/common/agreement-sign/required/12', () =>
        HttpResponse.json({ status: false, message: 'Failed to update the agreement requirement' }, { status: 500 })
      )
    )
    renderWithProviders(<AgreementTab signer="client" isHost formData={{ user_id: 12, has_sign: false, agreement_required: true }} />)

    await waitFor(() => expect(requirementSwitch()).toBeEnabled())
    await userEvent.click(requirementSwitch())

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Failed to update the agreement requirement'))
    expect(requirementSwitch()).toBeChecked()
  })

  it('cannot be changed for someone with no login yet', () => {
    renderWithProviders(<AgreementTab signer="client" isHost formData={{ user_id: null, has_sign: false, agreement_required: true }} />)

    expect(requirementSwitch()).toBeDisabled()
  })

  it('is not offered to anyone but the host', () => {
    renderWithProviders(<AgreementTab signer="client" isHost={false} formData={{ user_id: 12, has_sign: false, agreement_required: true }} />)

    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('shows only the signed agreement once signed - there is nothing left to require or waive', () => {
    renderWithProviders(<AgreementTab signer="partner" isHost formData={{ user_id: 7, has_sign: true, agreement_required: true }} />)

    expect(screen.getByText('Your Signed Agreement')).toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    expect(screen.queryByText('Awaiting signature')).not.toBeInTheDocument()
  })
})

describe('AgreementTab - locked by Settings › Agreement', () => {
  it('while signing is off for everyone: the switch is off and locked, and says where to turn it on', async () => {
    server.use(requirementStatus({ signing_enabled: false, can_change: false, locked_reason: GLOBAL_OFF }))
    renderWithProviders(<AgreementTab signer="partner" isHost formData={{ user_id: 7, has_sign: false, agreement_required: true }} />)

    expect(await screen.findByText(GLOBAL_OFF)).toBeInTheDocument()
    expect(requirementSwitch()).not.toBeChecked()
    expect(requirementSwitch()).toBeDisabled()
    expect(screen.getByText('Off for everyone')).toBeInTheDocument()
    expect(screen.queryByText('Awaiting signature')).not.toBeInTheDocument()
    expect(screen.getByText(/Turn it on there to require or waive the partner agreement for this partner/)).toBeInTheDocument()
  })

  it('while the partner agreement is off: the switch is off and locked, with the reason', async () => {
    server.use(requirementStatus({ template_active: false, can_change: false, locked_reason: PARTNER_TEMPLATE_OFF }))
    renderWithProviders(<AgreementTab signer="partner" isHost formData={{ user_id: 7, has_sign: false, agreement_required: true }} />)

    expect(await screen.findByText(PARTNER_TEMPLATE_OFF)).toBeInTheDocument()
    expect(requirementSwitch()).not.toBeChecked()
    expect(requirementSwitch()).toBeDisabled()
    expect(screen.getByText('Agreement off')).toBeInTheDocument()
    expect(screen.getByText(/Turn it on there to require or waive the partner agreement for this partner/)).toBeInTheDocument()
  })

  it("while the client's partner has their borrower agreement off: locked, and says where to turn it on", async () => {
    server.use(requirementStatus({ template_active: false, can_change: false, locked_reason: BORROWER_TEMPLATE_OFF }))
    renderWithProviders(<AgreementTab signer="client" isHost formData={{ user_id: 12, has_sign: false, agreement_required: true }} />)

    expect(await screen.findByText(BORROWER_TEMPLATE_OFF)).toBeInTheDocument()
    expect(requirementSwitch()).toBeDisabled()
    expect(screen.getByText(/Turn it on in that partner's Configuration › Agreement to require or waive it for this client/)).toBeInTheDocument()
  })

  it('keeps the switch locked until the status has loaded', () => {
    server.use(
      http.get('*/common/agreement-sign/required/:userId', async () => {
        await new Promise(() => {})
      })
    )
    renderWithProviders(<AgreementTab signer="client" isHost formData={{ user_id: 12, has_sign: false, agreement_required: true }} />)

    expect(requirementSwitch()).toBeDisabled()
  })
})
