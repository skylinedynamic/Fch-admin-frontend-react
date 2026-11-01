import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '../../test-utils'
import { server } from '../../mocks/server'

// Real Bootstrap transitions never finish under jsdom; the shared fake opens
// and closes the modal at once.
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))

const { default: DownloadAgreement } = await import('../../../src/pages/partners/DownloadAgreement')

/**
 * BUG-106: View Agreement (/partners|borrowers/download-agreement/:userId)
 * went to the 404 page whenever there was no signed copy.
 *
 *   - never signed            → "No signed agreement", no 404
 *   - marked signed, no copy  → a popup offering Re-sign (has_sign → false)
 *   - a signed copy           → the agreement, no popup
 *   - not allowed (API 404)   → still the 404 page, as before
 */
function serveAgreement(data: { content_html: string; has_sign: boolean } | null, status = 200) {
  server.use(
    http.get('*/common/agreement-sign/html/221', () =>
      data
        ? HttpResponse.json({ status: true, data }, { status })
        : HttpResponse.json({ status: false, message: 'Agreement template not found' }, { status: 404 })
    )
  )
}

function renderPage() {
  renderWithProviders(
    <Routes>
      <Route path="/partners/download-agreement/:userId" element={<DownloadAgreement />} />
      <Route path="/not-found" element={<p>Not Found Page</p>} />
    </Routes>,
    { route: '/partners/download-agreement/221' }
  )
}

describe('DownloadAgreement (BUG-106)', () => {
  it('says there is no signed agreement instead of going to the 404 page', async () => {
    serveAgreement({ content_html: '', has_sign: false })
    renderPage()

    expect(await screen.findByText('No signed agreement')).toBeInTheDocument()
    expect(screen.queryByText('Not Found Page')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Print or Download PDF/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Re-sign' })).not.toBeInTheDocument()
    expect(document.querySelector('.modal.show')).toBeNull()
  })

  it('offers Re-sign when the record is marked signed but its signed copy is missing', async () => {
    serveAgreement({ content_html: '', has_sign: true })
    let cancelled = false
    server.use(
      http.post('*/common/agreement-sign/cancel/221', () => {
        cancelled = true
        return HttpResponse.json({ status: true, message: 'Agreement cancelled successfully', data: null })
      })
    )
    renderPage()

    expect(await screen.findByText('Signed agreement not found', { selector: 'h5' })).toBeInTheDocument()
    await waitFor(() => expect(document.querySelector('.modal.show')).toHaveTextContent('Signed agreement not found'))
    expect(screen.queryByText('Not Found Page')).not.toBeInTheDocument()

    const popup = document.querySelector('.modal.show') as HTMLElement
    fireEvent.click(within(popup).getByRole('button', { name: 'Re-sign', hidden: true }))

    await waitFor(() => expect(cancelled).toBe(true))
    expect(await screen.findByText(/will be asked to sign the agreement again/)).toBeInTheDocument()
    await waitFor(() => expect(document.querySelector('.modal.show')).toBeNull())
    expect(document.querySelector('.card button')).toBeNull()
  })

  it('shows the signed agreement, with no Re-sign, when there is a copy', async () => {
    serveAgreement({ content_html: '<html><body><p>Signed terms</p></body></html>', has_sign: true })
    renderPage()

    expect(await screen.findByRole('button', { name: /Print or Download PDF/ })).toBeVisible()
    expect(screen.getByTitle('Agreement')).toBeInTheDocument()
    expect(document.querySelector('.modal.show')).toBeNull()
    expect(screen.queryByText('No signed agreement')).not.toBeInTheDocument()
  })

  it("still goes to the 404 page when the agreement can't be reached (someone else's)", async () => {
    serveAgreement(null)
    renderPage()

    expect(await screen.findByText('Not Found Page')).toBeInTheDocument()
  })

  /**
   * The host's team opens other users' signed agreements here, signed in as
   * themselves. One made before the server built the record is HTML the
   * signer's browser sent and may hold a script that would act as the host
   * user - so it is shown in a frame where no script can run.
   */
  it('shows a signed agreement in a frame where no script can run', async () => {
    serveAgreement({ content_html: '<p>Terms</p><img src=x onerror="steal()">', has_sign: true })
    renderPage()

    const frame = await screen.findByTitle('Agreement')
    const sandbox = (frame.getAttribute('sandbox') ?? 'missing').split(/\s+/)
    expect(sandbox).not.toContain('allow-scripts')
    // Same origin so the page can size and print it; modals for the print dialog.
    expect(sandbox).toEqual(expect.arrayContaining(['allow-same-origin', 'allow-modals']))
  })
})
