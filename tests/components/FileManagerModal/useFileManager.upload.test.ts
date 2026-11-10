import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'

vi.mock('react-toastify', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }) }))

import { toast } from 'react-toastify'
import { useFileManager } from '../../../src/components/FileManagerModal/useFileManager'

/**
 * BUG-014 (QA round 2): the API now refuses a picture over 5 MB, any file over
 * 20 MB and a "picture" that does not open as one. The file manager used to
 * say only "Failed to upload file"; it now says why.
 */
const context = { entity_type: 'partners', entity_id: 7 }

describe('file manager upload errors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.use(http.all('*/filemanager/*', () => HttpResponse.json({ status: true, data: [] })))
  })
  afterEach(() => server.resetHandlers())

  const upload = async (name: string) => {
    const { result } = renderHook(() => useFileManager('Profile', '/', { enabled: false }, context))
    await act(async () => {
      await result.current.handleUploadFile(new File(['x'], name, { type: 'image/png' }), '/', false)
    })
  }

  it('shows the API message when the API refuses the file', async () => {
    server.use(
      http.post('*/filemanager/upload', () =>
        HttpResponse.json(
          { status: false, message: 'Validation failed', errors: { file: 'This file is not a valid image.' } },
          { status: 422 }
        )
      )
    )

    await upload('qa-small.png')

    expect(toast.error).toHaveBeenCalledWith('This file is not a valid image.')
  })

  it('says the file is too large when the server cuts the request off (413)', async () => {
    server.use(http.post('*/filemanager/upload', () => new HttpResponse('<html>413</html>', { status: 413 })))

    await upload('qa-12mb.png')

    expect(toast.error).toHaveBeenCalledWith('This file is too large to upload.')
  })

  it('keeps the general message for any other failure', async () => {
    server.use(http.post('*/filemanager/upload', () => HttpResponse.json({ status: false }, { status: 500 })))

    await upload('photo.png')

    expect(toast.error).toHaveBeenCalledWith('Failed to upload file')
  })

  // BUG-014 retest: the upload window said "Files Uploaded Successfully" after a
  // refusal, because it was never told the file failed.
  const outcome = async (name: string) => {
    const { result } = renderHook(() => useFileManager('Profile', '/', { enabled: false }, context))
    let uploaded: boolean | undefined
    await act(async () => {
      uploaded = await result.current.handleUploadFile(new File(['x'], name, { type: 'image/png' }), '/', false)
    })
    return uploaded
  }

  it('reports a refused file as not uploaded', async () => {
    server.use(
      http.post('*/filemanager/upload', () =>
        HttpResponse.json({ status: false, errors: { file: 'This file is not a valid image.' } }, { status: 422 })
      )
    )

    expect(await outcome('qa-fake.png')).toBe(false)
  })

  it('reports an accepted file as uploaded', async () => {
    expect(await outcome('photo.png')).toBe(true)
    expect(toast.error).not.toHaveBeenCalled()
  })
})
