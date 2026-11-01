import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { toast } from 'react-toastify'
import { renderWithProviders, screen } from '../../../test-utils'
import { server } from '../../../mocks/server'
import TenantConfigSection from '../../../../src/pages/partners/components/TenantConfigSection'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const CONFIG_URL = '*/admin/partners/tenant-config/5'
const PARTNER_HOST = 'Enter a valid domain, e.g. admin.example.com.'

const renderSection = () =>
  renderWithProviders(
    <>
      <TenantConfigSection partnerId={5} setIsSaving={() => {}} />
      <button type="submit" form="tenant-config-form">Update</button>
    </>
  )

beforeEach(() => {
  vi.clearAllMocks()
  server.use(
    http.get(CONFIG_URL, () =>
      HttpResponse.json({ status: true, data: { active_custom_url: true, partner_domain: 'portal.acme.test', borrower_domain: 'apply.acme.test', partner_subdomain: 'acme' } })
    )
  )
})
afterEach(() => server.resetHandlers())

// BUG-121, the same as Settings > Custom Domain: the borrower domain is
// optional, and a refused domain is shown under its field only.
describe('Partner profile > Tenant Config', () => {
  it('leaves both domains to the API - the browser never stops the form', async () => {
    const { container } = renderSection()
    const borrower = (await screen.findByDisplayValue('apply.acme.test')) as HTMLInputElement

    expect(borrower).not.toBeRequired()
    expect(container.querySelector('input[name="partner_domain"]')).not.toBeRequired()
    const label = screen.getByText(/Custom Borrower Portal URL/)
    expect(label.querySelector('.text-danger')).toBeNull()
  })

  it('shows a refused domain under its field, outlines the whole field and shows no toast', async () => {
    server.use(
      http.post(CONFIG_URL, () =>
        HttpResponse.json({ status: false, message: PARTNER_HOST, errors: { partner_domain: PARTNER_HOST } }, { status: 422 })
      )
    )
    const user = userEvent.setup()
    const { container } = renderSection()
    await screen.findByDisplayValue('portal.acme.test')

    await user.click(screen.getByRole('button', { name: 'Update' }))

    expect(await screen.findByText(PARTNER_HOST)).toBeInTheDocument()
    const partner = container.querySelector('input[name="partner_domain"]') as HTMLInputElement
    expect(partner).toHaveClass('is-invalid')
    expect(partner.closest('.input-group')!.querySelector('.input-group-text')).toHaveClass('border-danger')
    expect(toast.error).not.toHaveBeenCalled()
  })
})
