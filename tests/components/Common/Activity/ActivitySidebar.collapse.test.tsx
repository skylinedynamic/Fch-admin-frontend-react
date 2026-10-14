import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { server } from '../../../mocks/server'
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// The edit modal's summernote import crashes under jsdom (no <canvas>); nothing
// here edits rich text.
vi.mock('../../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

const { default: ActivitySidebar } = await import('../../../../src/components/Common/Activity/ActivitySidebar')

/**
 * Every activity entry starts collapsed so a long history stays a short list.
 * An entry holding a list of changed fields or signatures says so on its row
 * ("View changes" / "View signatures"), and opening it flips the link to "Hide".
 */

const activity = (overrides: Record<string, unknown>) => ({
  id: 1,
  event_label: 'Lead updated',
  description: null,
  created_at: '2026-10-14T10:00:00Z',
  attachments: [],
  field_changes: null,
  signatures: null,
  ...overrides,
})

const serve = (rows: unknown[]) =>
  server.use(
    http.post('*/common/activity-logs/fetch-all-activities', () =>
      HttpResponse.json({ status: true, data: rows })
    )
  )

const rowOf = async (title: string) =>
  (await screen.findByText(title)).closest('.accordion-button') as HTMLElement

describe('ActivitySidebar - entries start collapsed', () => {
  afterEach(() => server.resetHandlers())

  it('an entry with changed fields starts collapsed and offers "View changes"', async () => {
    serve([activity({ id: 1, event_label: 'Lead details changed', field_changes: { status: { label: 'Status', from: 'New', to: 'Won' } } })])
    const user = userEvent.setup()
    renderWithProviders(<ActivitySidebar entityId={1} entityType="Lead" />)

    const row = await rowOf('Lead details changed')
    expect(row).toHaveAttribute('aria-expanded', 'false')
    expect(row).toHaveTextContent('View changes')

    await user.click(row)

    expect(row).toHaveAttribute('aria-expanded', 'true')
    expect(row).toHaveTextContent('Hide changes')
  })

  it('an entry with signatures starts collapsed and offers "View signatures"', async () => {
    serve([activity({ id: 2, event_label: 'Application signed', signatures: { previous: null, new: { type: 'typed', name: 'Jane Doe' } } })])
    renderWithProviders(<ActivitySidebar entityId={1} entityType="Lead" />)

    const row = await rowOf('Application signed')
    expect(row).toHaveAttribute('aria-expanded', 'false')
    expect(row).toHaveTextContent('View signatures')
  })

  it('a plain entry has no details link', async () => {
    serve([activity({ id: 3, event_label: 'Note added', description: 'Called the client' })])
    renderWithProviders(<ActivitySidebar entityId={1} entityType="Lead" />)

    const row = await rowOf('Note added')
    expect(row).toHaveAttribute('aria-expanded', 'false')
    expect(row).not.toHaveTextContent(/View (changes|signatures)/)
  })
})
