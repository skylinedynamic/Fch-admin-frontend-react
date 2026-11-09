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
 * BUG-014 retest (08-Nov-26): uploading a fake PNG, the API refused it and the
 * toast said "This file is not a valid image." - but the upload window still
 * said "Files Uploaded Successfully - Your files have been added to the
 * folder." The window now says success only for files that were added.
 */
const REFUSAL = 'This file is not a valid image.'

const png = (name: string) => new File(['x'], name, { type: 'image/png' })

describe('file manager upload window result', () => {
  // How the API answers each upload, in the order they are sent (one at a time).
  let answers: Array<'accept' | 'refuse'>

  beforeEach(() => {
    vi.clearAllMocks()
    answers = []
    // The first matching handler answers, so the upload goes before the catch-all.
    server.use(
      http.post('*/filemanager/upload', () =>
        answers.shift() === 'refuse'
          ? HttpResponse.json({ status: false, errors: { file: REFUSAL } }, { status: 422 })
          : HttpResponse.json({ status: true, data: {} })
      ),
      http.all('*/filemanager/*', () => HttpResponse.json({ status: true, data: [] }))
    )
  })
  afterEach(() => server.resetHandlers())

  const uploadFiles = async (...files: File[]) => {
    const user = userEvent.setup()
    renderWithProviders(<FileManagerModal isOpen toggle={() => {}} section="Profile" entityType="partners" entityId={7} />)
    await user.click(await screen.findByRole('button', { name: /upload/i }))
    const input = document.querySelector('.fm-modal input[type="file"]') as HTMLInputElement
    await user.upload(input, files)
    await user.click(screen.getByRole('button', { name: `Upload (${files.length})` }))
  }

  it('says nothing went in when the only file is refused, and shows the reason', async () => {
    answers = ['refuse']
    await uploadFiles(png('qa-fake.png'))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(REFUSAL))
    expect(screen.queryByText('Files Uploaded Successfully')).not.toBeInTheDocument()
    expect(screen.queryByText('Your files have been added to the folder.')).not.toBeInTheDocument()
    // Back to the picker, with the file still listed so it can be removed or swapped.
    expect(await screen.findByText(/qa-fake\.png/)).toBeInTheDocument()
  })

  it('says success when every file is added', async () => {
    answers = ['accept']
    await uploadFiles(png('photo.png'))

    expect(await screen.findByText('Files Uploaded Successfully')).toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('says how many went in when only some are added', async () => {
    answers = ['accept', 'refuse']
    await uploadFiles(png('photo.png'), png('qa-fake.png'))

    expect(await screen.findByText('1 of 2 files uploaded')).toBeInTheDocument()
    expect(screen.queryByText('Files Uploaded Successfully')).not.toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith(REFUSAL)
  })
})
