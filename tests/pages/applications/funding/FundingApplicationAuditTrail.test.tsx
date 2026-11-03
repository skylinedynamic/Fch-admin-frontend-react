import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders, screen, waitFor, within } from '../../../test-utils'
import { server } from '../../../mocks/server'
import FundingApplicationAuditTrail from '../../../../src/pages/applications/funding/FundingApplicationAuditTrail'
import { useAuthStore } from '../../../../src/store/auth/authStore'
import { AUDIT_EVENT } from '../../../../src/config/auditConfig'
import * as fileDownload from '../../../../src/utils/fileDownload'

const TRAIL = '*/common/request-application/funding-application/42/audit-trail'

const events = [
  {
    id: 3,
    event: AUDIT_EVENT.DOWNLOADED,
    event_label: 'Downloaded',
    occurred_at: '2026-11-03T10:15:00Z',
    actor: { id: 5, name: 'Pat Partner', type: 'Partner' },
    ip_address: '10.0.0.2',
    user_agent: null,
    changes: [],
    context: { file_type: 'application_pdf', password_protected: true },
    file: { sha256: 'a'.repeat(64), downloadable: false, label: 'Application PDF' },
    is_legacy: false,
    hash: 'h3',
  },
  {
    id: 2,
    event: AUDIT_EVENT.SIGNED_COPY_KEPT,
    event_label: 'Signed copy kept',
    occurred_at: '2026-11-03T09:00:00Z',
    actor: { id: 5, name: 'Pat Partner', type: 'Partner' },
    ip_address: '10.0.0.2',
    user_agent: null,
    changes: [],
    context: { name: 'Signed application.pdf', file_type: 'application_pdf' },
    file: { sha256: 'b'.repeat(64), downloadable: true, label: 'Application PDF' },
    is_legacy: false,
    hash: 'h2',
  },
  {
    id: 1,
    event: AUDIT_EVENT.UPDATED,
    event_label: 'Application updated',
    occurred_at: '2026-11-02T08:00:00Z',
    actor: { id: 1, name: 'Hana Host', type: 'Admin' },
    ip_address: null,
    user_agent: null,
    changes: [
      { field: 'business_name', label: 'Business Name', old: 'Acme LLC', new: 'Acme Holdings LLC' },
      { field: 'ssn', label: 'SSN', old: '***-**-6789', new: '***-**-4321' },
    ],
    context: {},
    file: null,
    is_legacy: true,
    hash: 'h1',
  },
]

const respond = (overrides: Record<string, unknown> = {}) =>
  HttpResponse.json({
    status: true,
    data: events,
    pagination: { total: 3, per_page: 25, current_page: 1, last_page: 1 },
    integrity: { valid: true, broken_at: null, checked: 3 },
    ...overrides,
  })

/** The trail's rows, as the table draws them. */
const rows = async () => {
  await screen.findByText(events[0].event_label)
  return Array.from(document.querySelectorAll<HTMLElement>('tr.audit-event-row'))
}

const pickEvent = async (user: ReturnType<typeof userEvent.setup>, label: string) => {
  await user.click(document.querySelector('.audit-event-filter') as HTMLElement)
  await user.click(
    Array.from(document.body.querySelectorAll<HTMLElement>('.p-dropdown-panel .p-dropdown-item')).find((el) => el.textContent === label)!
  )
}

const render = () =>
  renderWithProviders(
    <Routes>
      <Route path="/intake-review/funding-application/:id/audit-history" element={<FundingApplicationAuditTrail />} />
    </Routes>,
    { route: '/intake-review/funding-application/42/audit-history' }
  )

describe('Funding application audit trail', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: 5, is_host: false, partner_id: 2, permissions: [] } as never })
  })

  afterEach(() => {
    server.resetHandlers()
    vi.restoreAllMocks()
  })

  it('lets a partner read its own application’s trail, newest first', async () => {
    server.use(http.get(TRAIL, () => respond()))

    render()

    const list = await rows()
    expect(list).toHaveLength(3)
    expect(within(list[0]).getByText('Downloaded')).toBeInTheDocument()
    expect(within(list[2]).getByText('Application updated')).toBeInTheDocument()
    expect(within(list[2]).getByText('Hana Host')).toBeInTheDocument()
  })

  it('shows each changed field before and after, with SSNs as the API masked them', async () => {
    server.use(http.get(TRAIL, () => respond()))

    render()

    const updated = (await rows())[2]
    const business = within(updated).getByTestId('audit-change-business_name')
    expect(business).toHaveTextContent('Business Name')
    expect(business).toHaveTextContent('Acme LLC')
    expect(business).toHaveTextContent('Acme Holdings LLC')
    expect(within(updated).getByTestId('audit-change-ssn')).toHaveTextContent('***-**-4321')
    expect(within(updated).getByText(/imported/i)).toBeInTheDocument()
  })

  it('shows what was downloaded, that a password protected it, and its hash', async () => {
    server.use(http.get(TRAIL, () => respond()))

    render()

    const download = (await rows())[0]
    expect(within(download).getByText('Application PDF')).toBeInTheDocument()
    expect(within(download).getByText(/password protected/i)).toBeInTheDocument()
    expect(within(download).getByTitle('a'.repeat(64))).toBeInTheDocument()
    // A download keeps no copy: nothing to download again.
    expect(within(download).queryByRole('button', { name: /download file/i })).not.toBeInTheDocument()
  })

  it('downloads the signed copy the trail kept', async () => {
    const saved = vi.spyOn(fileDownload, 'downloadBlob').mockImplementation(() => {})
    server.use(
      http.get(TRAIL, () => respond()),
      http.get(`${TRAIL}/2/file`, () => new HttpResponse('%PDF', { headers: { 'Content-Type': 'application/pdf' } }))
    )
    const user = userEvent.setup()

    render()
    const signedCopy = (await rows())[1]
    await user.click(within(signedCopy).getByRole('button', { name: /download file/i }))

    await waitFor(() => expect(saved).toHaveBeenCalledWith(expect.any(Blob), 'Signed application.pdf', 'application/pdf'))
  })

  it("shows a document's hash with nothing to download: no copy is kept", async () => {
    const hash = 'd'.repeat(64)
    server.use(
      http.get(TRAIL, () =>
        respond({
          data: [
            {
              id: 9,
              event: AUDIT_EVENT.DOCUMENT_ADDED,
              event_label: 'Document added',
              occurred_at: '2026-11-03T09:00:00Z',
              actor: { id: 5, name: 'Pat Partner', type: 'Partner' },
              ip_address: '10.0.0.2',
              user_agent: null,
              changes: [],
              context: { name: 'Tax return.pdf', document_id: 8 },
              file: { sha256: hash, downloadable: false, label: null },
              is_legacy: false,
              hash: 'h9',
            },
          ],
          pagination: { total: 1, per_page: 25, current_page: 1, last_page: 1 },
        })
      )
    )

    render()
    await screen.findByText('Document added')
    const [document] = Array.from(window.document.querySelectorAll<HTMLElement>('tr.audit-event-row'))

    expect(within(document).getByText(hash)).toBeInTheDocument()
    expect(within(document).queryByRole('button', { name: /download file/i })).not.toBeInTheDocument()
  })

  it('says the chain is intact, or where it broke', async () => {
    server.use(http.get(TRAIL, () => respond()))
    const { unmount } = render()
    expect(await screen.findByText(/integrity verified/i)).toBeInTheDocument()
    unmount()

    server.use(http.get(TRAIL, () => respond({ integrity: { valid: false, broken_at: 2, checked: 1 } })))
    render()
    expect(await screen.findByText(/integrity check failed at event #2/i)).toBeInTheDocument()
  })

  it('filters by event when Filters is pressed, like the other lists', async () => {
    const asked: (string | null)[] = []
    server.use(
      http.get(TRAIL, ({ request }) => {
        asked.push(new URL(request.url).searchParams.get('event'))
        return respond()
      })
    )
    const user = userEvent.setup()

    render()
    await rows()
    await pickEvent(user, 'Status changed')
    expect(asked).not.toContain(AUDIT_EVENT.STATUS_CHANGED)
    await user.click(screen.getByRole('button', { name: /filters/i }))

    await waitFor(() => expect(asked).toContain(AUDIT_EVENT.STATUS_CHANGED))

    await user.click(screen.getByRole('button', { name: /clear/i }))
    await waitFor(() => expect(asked[asked.length - 1]).toBeNull())
  })

  it('exports the trail as CSV with the same filters from the Actions menu', async () => {
    const saved = vi.spyOn(fileDownload, 'downloadBlob').mockImplementation(() => {})
    let exported: string | null = null
    server.use(
      http.get(TRAIL, () => respond()),
      http.get(`${TRAIL}/export`, ({ request }) => {
        exported = new URL(request.url).search
        return new HttpResponse('Date (UTC)\n', { headers: { 'Content-Type': 'text/csv' } })
      })
    )
    const user = userEvent.setup()

    render()
    await rows()
    await user.click(screen.getByRole('button', { name: /^actions$/i }))
    await user.click(screen.getByRole('button', { name: /export csv/i }))

    await waitFor(() => expect(saved).toHaveBeenCalled())
    expect(exported).not.toBeNull()
    expect(new URLSearchParams(exported!).get('format')).toBe('csv')
  })

  it('exports the trail as PDF from the Actions menu', async () => {
    const saved = vi.spyOn(fileDownload, 'downloadBlob').mockImplementation(() => {})
    let exported: string | null = null
    server.use(
      http.get(TRAIL, () => respond()),
      http.get(`${TRAIL}/export`, ({ request }) => {
        exported = new URL(request.url).search
        return new HttpResponse('%PDF', { headers: { 'Content-Type': 'application/pdf' } })
      })
    )
    const user = userEvent.setup()

    render()
    await rows()
    await user.click(screen.getByRole('button', { name: /^actions$/i }))
    await user.click(screen.getByRole('button', { name: /export pdf/i }))

    await waitFor(() => expect(saved).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/\.pdf$/), 'application/pdf'))
    expect(new URLSearchParams(exported!).get('format')).toBe('pdf')
  })

  it('says so when nothing has been recorded yet', async () => {
    server.use(http.get(TRAIL, () => respond({ data: [], pagination: { total: 0, per_page: 25, current_page: 1, last_page: 1 } })))

    render()

    expect(await screen.findByText(/no audit events/i)).toBeInTheDocument()
  })

  it('says so when the application is not one the user may review', async () => {
    server.use(http.get(TRAIL, () => HttpResponse.json({ status: false, message: 'Funding application not found.' }, { status: 404 })))

    render()

    expect(await screen.findByText('Funding application not found.')).toBeInTheDocument()
  })
})
