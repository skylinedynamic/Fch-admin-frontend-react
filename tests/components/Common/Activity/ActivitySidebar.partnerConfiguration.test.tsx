import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { act, screen, within } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { server } from '../../../mocks/server'
import { LOG_TYPE_PARTNER_CONFIGURATION_UPDATE, REFRESH_ACTIVITIES_EVENT } from '../../../../src/config/appConfig'
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// The edit modal's summernote import crashes under jsdom (no <canvas>).
vi.mock('../../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

const { default: ActivitySidebar } = await import('../../../../src/components/Common/Activity/ActivitySidebar')

/**
 * Partner profile › activity: a change the host made in the Configuration tab
 * is an entry whose "Show changes" table lists each field, old → new (a
 * credential only reads "Changed"), and the sidebar picks it up as soon as the
 * save fires REFRESH_ACTIVITIES_EVENT - no page reload.
 */

const configEntry = {
  id: 41,
  log_type_raw: LOG_TYPE_PARTNER_CONFIGURATION_UPDATE,
  log_name: LOG_TYPE_PARTNER_CONFIGURATION_UPDATE,
  event_label: 'Configuration updated',
  description: 'Hana Host updated the SMS configuration.',
  created_at: '2026-10-24T10:00:00Z',
  attachments: [],
  signatures: null,
  field_changes: {
    is_enabled: { label: 'Enabled', from: 'No', to: 'Yes' },
    from_number: { label: 'From number', from: '+15005550006', to: '+15005550007' },
    auth_token: { label: 'Auth token', from: null, to: 'Changed' },
  },
}

const serve = (rows: unknown[]) => {
  const calls = { count: 0 }
  server.use(
    http.post('*/common/activity-logs/fetch-all-activities', () => {
      calls.count++
      return HttpResponse.json({ status: true, data: rows })
    })
  )
  return calls
}

const props = { entityId: 7, entityType: 'Partner', partnerId: null, borrowerEmail: null, partnerEmail: null, hostEmail: null, isHost: true }

describe('ActivitySidebar - partner configuration changes', () => {
  afterEach(() => server.resetHandlers())

  it('lists each changed field with its previous and new value', async () => {
    serve([configEntry])
    const user = userEvent.setup()
    renderWithProviders(<ActivitySidebar {...props} />)

    const row = (await screen.findByText('Configuration updated')).closest('.accordion-button') as HTMLElement
    expect(row).toHaveTextContent('View changes')
    await user.click(row)

    const table = await screen.findByRole('table')
    const rows = within(table).getAllByRole('row').map(r => r.textContent)
    expect(rows).toEqual(expect.arrayContaining([
      expect.stringMatching(/Enabled\s*No\s*Yes/),
      expect.stringMatching(/From number\s*\+15005550006\s*\+15005550007/),
      // A credential: no old value, and the new one is never shown.
      expect.stringMatching(/Auth token\s*—\s*Changed/),
    ]))
    // Never a list position as the field name (the old "0 — —" row).
    expect(within(table).queryByText('0')).not.toBeInTheDocument()
  })

  it('reloads when a configuration change is saved, so the entry shows without a page reload', async () => {
    const calls = serve([])
    renderWithProviders(<ActivitySidebar {...props} />)
    await vi.waitFor(() => expect(calls.count).toBeGreaterThan(0))
    expect(screen.queryByText('Configuration updated')).not.toBeInTheDocument()

    serve([configEntry])
    await act(async () => {
      window.dispatchEvent(new Event(REFRESH_ACTIVITIES_EVENT))
    })

    expect(await screen.findByText('Configuration updated')).toBeInTheDocument()
  })
})
