import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { toast } from 'react-toastify'
import { renderWithProviders, screen, waitFor, within } from '../../../test-utils'
import { server } from '../../../mocks/server'
import CreditProfileSection from '../../../../src/pages/clients/components/CreditProfileSection'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// The Bootstrap modal itself is not what is under test.
vi.mock('../../../../src/components/Common/Modals/DynamicActionModal', () => ({
  default: (props: { show: boolean; title: string; description: ReactNode; warningText?: string; confirmText?: string; cancelText?: string; onConfirm: () => void; onClose: () => void }) =>
    props.show ? (
      <div role="dialog" aria-label={props.title}>
        <div>{props.description}</div>
        {props.warningText && <div>{props.warningText}</div>}
        <button type="button" onClick={props.onConfirm}>{props.confirmText ?? 'Confirm'}</button>
        <button type="button" onClick={props.onClose}>{props.cancelText ?? 'Cancel'}</button>
      </div>
    ) : null,
}))

/**
 * The section locks scrolling on .page-content. That makes .page-content the
 * sticky page header's scroll container, so the header's `top: 70px` (meant to
 * clear the fixed topbar) pushed it 70px down inside the page instead.
 */
describe('Client credit profile section', () => {
  const mountInPage = () => {
    const page = document.createElement('div')
    page.className = 'page-content'
    document.body.appendChild(page)
    const view = renderWithProviders(<CreditProfileSection clientId={3} />, { container: page })
    return { page, view }
  }

  it('marks the page as scroll-locked while it is shown', () => {
    const { page, view } = mountInPage()

    expect(page).toHaveClass('page-content-scroll-locked')

    view.unmount()
    expect(page).not.toHaveClass('page-content-scroll-locked')
    page.remove()
  })
})

/**
 * Only the host partner's team uploads a client's iSoftPull report, updates it,
 * or removes it; every other partner only reads it. Removing it asks first.
 */
describe('Client credit profile section - who may change it', () => {
  const savedProfile = {
    id: 1,
    pdf_url: 'http://localhost/storage/borrowers/3/credit_report_1.pdf',
    document_id: 9,
    personal_info: { name: 'Odessa Mccall' },
    metrics: { fico_score: 712 },
    addresses: [],
    trade_accounts: [],
    inquiries: [],
  }

  const serveProfile = (profile: unknown) =>
    server.use(http.get('*/common/borrowers/get-credit-profile/3', () => HttpResponse.json({ status: true, data: profile })))

  afterEach(() => server.resetHandlers())

  it('lets another partner read a saved profile but not upload, update or remove it', async () => {
    serveProfile(savedProfile)

    renderWithProviders(<CreditProfileSection clientId={3} isHost={false} />)

    expect(await screen.findByText('Extracted Credit Metrics')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /re-upload pdf/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save credit profile/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete credit profile/i })).not.toBeInTheDocument()
  })

  it('offers another partner no upload when there is no profile yet', async () => {
    serveProfile(null)

    renderWithProviders(<CreditProfileSection clientId={3} isHost={false} />)

    expect(await screen.findByText(/no credit profile yet/i)).toBeInTheDocument()
    expect(screen.queryByText(/choose pdf report/i)).not.toBeInTheDocument()
    expect(document.querySelector('#credit-report-upload')).toBeNull()
  })

  it('lets the host upload a report when there is none', async () => {
    serveProfile(null)

    renderWithProviders(<CreditProfileSection clientId={3} isHost />)

    expect(await screen.findByText(/choose pdf report/i)).toBeInTheDocument()
  })

  it('lets the host remove all of it, once confirmed', async () => {
    serveProfile(savedProfile)
    let deleted = false
    server.use(
      http.delete('*/common/borrowers/3/credit-profile', () => {
        deleted = true
        serveProfile(null)
        return HttpResponse.json({ status: true, message: 'Credit profile data removed.', data: null })
      })
    )
    const user = userEvent.setup()

    renderWithProviders(<CreditProfileSection clientId={3} isHost />)
    await user.click(await screen.findByRole('button', { name: /delete credit profile/i }))

    // Nothing goes until it is confirmed.
    expect(deleted).toBe(false)
    const dialog = await screen.findByRole('dialog', { name: 'Delete Credit Profile Data' })
    expect(dialog).not.toHaveTextContent(/authorization records/i)
    await user.click(within(dialog).getByRole('button', { name: 'Yes, Delete All' }))

    await waitFor(() => expect(deleted).toBe(true))
    expect(await screen.findByText(/choose pdf report/i)).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Credit profile data removed.')
  })

  it('keeps it when the host cancels', async () => {
    serveProfile(savedProfile)
    let deleted = false
    server.use(http.delete('*/common/borrowers/3/credit-profile', () => { deleted = true; return HttpResponse.json({ status: true }) }))
    const user = userEvent.setup()

    renderWithProviders(<CreditProfileSection clientId={3} isHost />)
    await user.click(await screen.findByRole('button', { name: /delete credit profile/i }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }))

    expect(deleted).toBe(false)
    expect(screen.getByText('Extracted Credit Metrics')).toBeInTheDocument()
  })
})
