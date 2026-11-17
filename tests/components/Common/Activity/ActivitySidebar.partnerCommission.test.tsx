import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { server } from '../../../mocks/server'
import { LOG_TYPE_PARTNER_COMMISSION_UPDATE } from '../../../../src/config/appConfig'
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

const { default: ActivitySidebar } = await import('../../../../src/components/Common/Activity/ActivitySidebar')

/**
 * Partner profile › activity: the host added, changed or removed the partner's
 * commission (fch-api PartnerService::logCommissionChange). The entry has its
 * own percent icon and a "Show changes" row, Commission old → new.
 */
const entry = (overrides: Record<string, unknown> = {}) => ({
  id: 51,
  log_type_raw: LOG_TYPE_PARTNER_COMMISSION_UPDATE,
  log_name: LOG_TYPE_PARTNER_COMMISSION_UPDATE,
  event_label: 'Commission updated',
  description: 'Hana Host changed the commission from 20% to 25%.',
  created_at: '2026-11-11T10:00:00Z',
  attachments: [],
  signatures: null,
  field_changes: { commission: { label: 'Commission', from: '20%', to: '25%' } },
  ...overrides,
})

const serve = (rows: unknown[]) =>
  server.use(http.post('*/common/activity-logs/fetch-all-activities', () => HttpResponse.json({ status: true, data: rows })))

const props = { entityId: 7, entityType: 'Partner', partnerId: null, borrowerEmail: null, partnerEmail: null, hostEmail: null, isHost: true }

describe('ActivitySidebar - partner commission changes', () => {
  afterEach(() => server.resetHandlers())

  it('shows "Commission updated" with its percent icon and the old and new rate', async () => {
    serve([entry()])
    const user = userEvent.setup()
    const { container } = renderWithProviders(<ActivitySidebar {...props} />)

    const row = (await screen.findByText('Commission updated')).closest('.accordion-button') as HTMLElement
    expect(container.querySelector('.ri-percent-line')).not.toBeNull()
    await user.click(row)

    expect(await screen.findByText('Hana Host changed the commission from 20% to 25%.')).toBeInTheDocument()
    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('row').map(r => r.textContent)).toEqual(
      expect.arrayContaining([expect.stringMatching(/Commission\s*20%\s*25%/)])
    )
  })

  it('shows an added commission with no previous rate', async () => {
    serve([entry({ event_label: 'Commission added', description: 'Hana Host set the commission to 25%.', field_changes: { commission: { label: 'Commission', from: null, to: '25%' } } })])
    const user = userEvent.setup()
    renderWithProviders(<ActivitySidebar {...props} />)

    await user.click((await screen.findByText('Commission added')).closest('.accordion-button') as HTMLElement)

    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('row').map(r => r.textContent)).toEqual(
      expect.arrayContaining([expect.stringMatching(/Commission\s*—\s*25%/)])
    )
  })
})
