import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { server } from '../../../mocks/server'

vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// The edit modal's summernote import crashes under jsdom (no <canvas>).
vi.mock('../../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

const { default: ActivitySidebar } = await import('../../../../src/components/Common/Activity/ActivitySidebar')

/**
 * Defect: on a partner's activity, every entry showed that partner's image -
 * the host's own entries too. An entry shows the image of who did it
 * (causer_image); only an entry nobody did (System) falls back to the record's.
 */
const entry = (id: number, overrides: Record<string, unknown>) => ({
  id,
  log_type: 'Partner Updated',
  log_type_raw: 'partner_update',
  event_label: `Entry ${id}`,
  partner_image: 'https://cdn.test/acme-logo.png',
  created_at: '2026-11-19 10:00:00',
  attachments: [],
  ...overrides,
})

const serve = (rows: unknown[]) =>
  server.use(
    http.post('*/common/activity-logs/fetch-all-activities', () => HttpResponse.json({ status: true, data: rows }))
  )

const props = { entityId: 21, entityType: 'Partner', partnerId: 21, borrowerEmail: null, partnerEmail: null, hostEmail: null, isHost: true }

const avatarOf = async (title: string) =>
  (await screen.findByText(title)).closest('.accordion-button')!.querySelector('img') as HTMLImageElement

describe('ActivitySidebar - each entry shows who did it', () => {
  afterEach(() => server.resetHandlers())

  it("shows the host's image on the host's entry and the partner's on the partner's", async () => {
    serve([
      entry(1, { causer: { id: 1, name: 'Host Admin' }, causer_name: 'Host Admin', causer_image: 'https://cdn.test/host-logo.png' }),
      entry(2, { causer: { id: 7, name: 'Acme Lending' }, causer_name: 'Acme Lending', causer_image: 'https://cdn.test/acme-logo.png' }),
    ])
    renderWithProviders(<ActivitySidebar {...props} />)

    const host = await avatarOf('Entry 1')
    expect(host).toHaveAttribute('src', 'https://cdn.test/host-logo.png')
    expect(host).toHaveAttribute('alt', 'Host Admin')
    expect(await avatarOf('Entry 2')).toHaveAttribute('src', 'https://cdn.test/acme-logo.png')
  })

  it("an entry nobody did (System) shows the record's image", async () => {
    serve([entry(3, { causer: null, causer_name: 'System', causer_image: 'https://cdn.test/acme-logo.png' })])
    renderWithProviders(<ActivitySidebar {...props} />)

    expect(await avatarOf('Entry 3')).toHaveAttribute('src', 'https://cdn.test/acme-logo.png')
  })
})
