import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { toast } from 'react-toastify'
import { renderWithProviders, screen } from '../../../test-utils'
import { server } from '../../../mocks/server'
import TenantDomainConfig from '../../../../src/pages/settings/components/TenantDomainConfig'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const MINE = '*/common/partner/tenant-config'
const BORROWER_HOST = 'Enter a valid domain, e.g. app.example.com.'

beforeEach(() => {
  vi.clearAllMocks()
  server.use(
    http.get(MINE, () =>
      HttpResponse.json({ status: true, data: { active_custom_url: true, partner_domain: 'admin.mine.test', borrower_domain: 'clients.mine.test' } })
    )
  )
})
afterEach(() => server.resetHandlers())

// BUG-121: the API answers one message per field (a string, as BaseApiRequest
// sends it). The message under the field is enough - no toast besides it.
describe('Settings > Custom Domain - a refused domain', () => {
  it('shows the API message under the field and no toast', async () => {
    server.use(
      http.post(MINE, () =>
        HttpResponse.json({ status: false, message: BORROWER_HOST, errors: { borrower_domain: BORROWER_HOST } }, { status: 422 })
      )
    )
    const user = userEvent.setup()
    renderWithProviders(<TenantDomainConfig />)

    await user.click(await screen.findByRole('button', { name: /Update Configuration/ }))

    expect(await screen.findByText(BORROWER_HOST)).toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('outlines the whole field in red - the icon box too, not only the input', async () => {
    server.use(
      http.post(MINE, () =>
        HttpResponse.json({ status: false, message: BORROWER_HOST, errors: { borrower_domain: BORROWER_HOST } }, { status: 422 })
      )
    )
    const user = userEvent.setup()
    const { container } = renderWithProviders(<TenantDomainConfig />)

    await user.click(await screen.findByRole('button', { name: /Update Configuration/ }))
    await screen.findByText(BORROWER_HOST)

    const borrower = container.querySelector('input[name="borrower_domain"]') as HTMLInputElement
    expect(borrower).toHaveClass('is-invalid')
    expect(borrower.closest('.input-group')!.querySelector('.input-group-text')).toHaveClass('border-danger')
    const partner = container.querySelector('input[name="partner_domain"]') as HTMLInputElement
    expect(partner.closest('.input-group')!.querySelector('.input-group-text')).not.toHaveClass('border-danger')
  })
})

// Only the API validates the domains: the browser never stops the form.
describe('Settings > Custom Domain - no browser validation', () => {
  it('leaves both domains to the API', async () => {
    const { container } = renderWithProviders(<TenantDomainConfig />)
    await screen.findByRole('button', { name: /Update Configuration/ })

    expect(container.querySelector('input[name="borrower_domain"]')).not.toBeRequired()
    expect(container.querySelector('input[name="partner_domain"]')).not.toBeRequired()
  })
})
