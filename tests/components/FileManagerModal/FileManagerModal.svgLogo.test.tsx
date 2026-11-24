import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { renderWithProviders } from '../../test-utils'

vi.mock('react-toastify', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }) }))

import { toast } from 'react-toastify'
import { FileManagerModal } from '../../../src/components/FileManagerModal/FileManagerModal'

/**
 * R3-BUG-064: Partners > partner > Configuration > Branding > Logos > Choose >
 * Upload an SVG said 'File type "svg" not allowed' and sent nothing, although
 * Branding says a logo may be an SVG and the API takes one into the partner's
 * (public) folder, stripping its scripts. Documents still refuse SVG.
 */
const svg = (name: string) => new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], name, { type: 'image/svg+xml' })

describe('file manager - SVG logo', () => {
  let uploads: number

  beforeEach(() => {
    vi.clearAllMocks()
    uploads = 0
    server.use(
      http.post('*/filemanager/upload', () => {
        uploads += 1
        return HttpResponse.json({ status: true, data: {} })
      }),
      http.all('*/filemanager/*', () => HttpResponse.json({ status: true, data: [] }))
    )
  })
  afterEach(() => server.resetHandlers())

  const upload = async (entityType: string, file: File) => {
    const user = userEvent.setup({ applyAccept: false })
    renderWithProviders(<FileManagerModal isOpen toggle={() => {}} section="Branding" entityType={entityType} entityId={89} />)
    await user.click(await screen.findByRole('button', { name: /upload/i }))
    const input = document.querySelector('.fm-modal input[type="file"]') as HTMLInputElement
    await user.upload(input, file)
    await user.click(screen.getByRole('button', { name: 'Upload (1)' }))
  }

  it('uploads an SVG into a partner\'s branding folder', async () => {
    await upload('partners', svg('qa-r3rt-ui-logo.svg'))

    expect(await screen.findByText('Files Uploaded Successfully')).toBeInTheDocument()
    expect(uploads).toBe(1)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('still refuses an SVG as a partner document, without sending it', async () => {
    await upload('partner-documents', svg('qa-r3rt-ui-logo.svg'))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('File type "svg" not allowed for "qa-r3rt-ui-logo.svg".'))
    expect(uploads).toBe(0)
  })
})
