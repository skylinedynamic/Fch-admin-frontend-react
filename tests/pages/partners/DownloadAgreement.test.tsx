import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, screen } from '../../test-utils'
import { server } from '../../mocks/server'
import DownloadAgreement from '../../../src/pages/partners/DownloadAgreement'

let params: Record<string, string> = {}
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn(), useParams: () => params }
})

afterEach(() => {
  params = {}
  server.resetHandlers()
})

describe('DownloadAgreement', () => {
  /**
   * The host's team opens other users' signed agreements here, signed in as
   * themselves. One made before the server built the record is HTML the
   * signer's browser sent and may hold a script that would act as the host
   * user - so it is shown in a frame where no script can run.
   */
  it('shows a signed agreement in a frame where no script can run', async () => {
    params = { userId: '5' }
    server.use(
      http.get('*/common/agreement-sign/html/5', () =>
        HttpResponse.json({ status: true, data: { content_html: '<p>Terms</p><img src=x onerror="steal()">' } })
      )
    )

    renderWithProviders(<DownloadAgreement />)

    const frame = await screen.findByTitle('Agreement')
    const sandbox = (frame.getAttribute('sandbox') ?? 'missing').split(/\s+/)
    expect(sandbox).not.toContain('allow-scripts')
    // Same origin so the page can size and print it; modals for the print dialog.
    expect(sandbox).toEqual(expect.arrayContaining(['allow-same-origin', 'allow-modals']))
  })
})
