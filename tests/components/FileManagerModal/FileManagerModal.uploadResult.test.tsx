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

  /**
   * R3-BUG-063: a small picture with a 6 MB one. The browser refused the big
   * one before sending it (toast), sent only the small one - and the window
   * said "Files Uploaded Successfully". A file refused in the browser counts
   * as not uploaded, the same as one the API refuses.
   */
  it('counts a file the browser refuses for its size as not uploaded', async () => {
    answers = ['accept']
    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'qa-r3-sec08-6mb.jpg', { type: 'image/jpeg' })
    await uploadFiles(png('qa-r3-sec08-small.png'), big)

    expect(await screen.findByText('1 of 2 files uploaded')).toBeInTheDocument()
    expect(screen.queryByText('Files Uploaded Successfully')).not.toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith('File "qa-r3-sec08-6mb.jpg" exceeds 5MB limit.')
  })

  it('counts a file the browser refuses for its type as not uploaded', async () => {
    answers = ['accept']
    await uploadFiles(png('photo.png'), new File(['x'], 'tool.exe', { type: 'application/octet-stream' }))

    expect(await screen.findByText('1 of 2 files uploaded')).toBeInTheDocument()
    expect(screen.queryByText('Files Uploaded Successfully')).not.toBeInTheDocument()
  })

  it('does not carry a refused file into the next upload\'s count', async () => {
    answers = ['accept', 'accept']
    const big = new File([new Uint8Array(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' })
    const user = userEvent.setup()
    renderWithProviders(<FileManagerModal isOpen toggle={() => {}} section="Profile" entityType="partners" entityId={7} />)
    await user.click(await screen.findByRole('button', { name: /upload/i }))
    const input = () => document.querySelector('.fm-modal input[type="file"]') as HTMLInputElement

    // Only the refused file: nothing is sent, the window stays on the picker.
    await user.upload(input(), big)
    await user.click(screen.getByRole('button', { name: 'Upload (1)' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    await user.click(screen.getByRole('button', { name: '×' }))

    // Then one good file: all of it went in.
    await user.upload(input(), png('photo.png'))
    await user.click(screen.getByRole('button', { name: 'Upload (1)' }))
    expect(await screen.findByText('Files Uploaded Successfully')).toBeInTheDocument()
  })

  it('says how many went in when only some are added', async () => {
    answers = ['accept', 'refuse']
    await uploadFiles(png('photo.png'), png('qa-fake.png'))

    expect(await screen.findByText('1 of 2 files uploaded')).toBeInTheDocument()
    expect(screen.queryByText('Files Uploaded Successfully')).not.toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith(REFUSAL)
  })
})
