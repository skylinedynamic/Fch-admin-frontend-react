import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import SignatureDialog from '../../../../src/components/Common/Modals/SignatureDialog'

/**
 * Adopting a signature, as e-signature tools do: type your name (shown in a
 * handwriting style), draw it, or upload a picture of it (at least
 * MIN_UPLOAD_WIDTH x MIN_UPLOAD_HEIGHT pixels), then apply it to the signing line.
 */
const PNG = 'data:image/png;base64,SIGNED'
const ctx = {
  fillText: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
  measureText: vi.fn(() => ({ width: 200 })), setTransform: vi.fn(), drawImage: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray([255, 255, 255, 255, 10, 20, 60, 255]) })), putImageData: vi.fn(),
  font: '', fillStyle: '', strokeStyle: '', lineWidth: 0, lineCap: '', lineJoin: '', textAlign: '', textBaseline: '',
}

/** An image the browser "loads" at the given size. */
let imageSize = { width: 900, height: 300 }
class FakeImage {
  naturalWidth = 0
  naturalHeight = 0
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  set src(_url: string) {
    this.naturalWidth = imageSize.width
    this.naturalHeight = imageSize.height
    setTimeout(() => this.onload?.(), 0)
  }
}

beforeEach(() => {
  imageSize = { width: 900, height: 300 }
  vi.stubGlobal('Image', FakeImage)
  URL.createObjectURL = vi.fn(() => 'blob:signature')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(PNG)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const upload = (file: File) => fireEvent.change(screen.getByLabelText('Upload a picture of your signature'), { target: { files: [file] } })
const png = (bytes = 2000) => new File([new Uint8Array(bytes)], 'signature.png', { type: 'image/png' })

describe('SignatureDialog', () => {
  it('signs with the typed name, filled with the signer\'s name to start', async () => {
    const onApply = vi.fn()
    const user = userEvent.setup()
    render(<SignatureDialog name="Jane Doe" onApply={onApply} onClose={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: 'Adopt your signature' })).toBeInTheDocument()
    expect(screen.getByLabelText('Your name')).toHaveValue('Jane Doe')
    await user.click(screen.getByRole('button', { name: 'Apply signature' }))

    expect(ctx.fillText).toHaveBeenCalledWith('Jane Doe', expect.any(Number), expect.any(Number))
    expect(onApply).toHaveBeenCalledWith(PNG)
  })

  it('cannot apply an empty name', async () => {
    const user = userEvent.setup()
    render(<SignatureDialog name="" onApply={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Apply signature' })).toBeDisabled()
    await user.type(screen.getByLabelText('Your name'), 'J Doe')
    expect(screen.getByRole('button', { name: 'Apply signature' })).toBeEnabled()
  })

  it('signs with a drawn signature once something is drawn', async () => {
    const onApply = vi.fn()
    const user = userEvent.setup()
    render(<SignatureDialog name="Jane Doe" onApply={onApply} onClose={vi.fn()} />)

    await user.click(screen.getByRole('tab', { name: 'Draw' }))
    expect(screen.getByRole('button', { name: 'Apply signature' })).toBeDisabled()
    const pad = screen.getByLabelText('Draw your signature')
    fireEvent.pointerDown(pad, { clientX: 10, clientY: 10, pointerId: 1 })
    fireEvent.pointerMove(pad, { clientX: 60, clientY: 30, pointerId: 1 })
    fireEvent.pointerUp(pad, { pointerId: 1 })
    await user.click(screen.getByRole('button', { name: 'Apply signature' }))

    expect(ctx.stroke).toHaveBeenCalled()
    expect(onApply).toHaveBeenCalledWith(PNG)
  })

  it('clears a drawing', async () => {
    const user = userEvent.setup()
    render(<SignatureDialog name="Jane Doe" onApply={vi.fn()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('tab', { name: 'Draw' }))
    const pad = screen.getByLabelText('Draw your signature')
    fireEvent.pointerDown(pad, { clientX: 10, clientY: 10, pointerId: 1 })
    fireEvent.pointerUp(pad, { pointerId: 1 })
    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(screen.getByRole('button', { name: 'Apply signature' })).toBeDisabled()
  })

  it('closes on Cancel and on Escape', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<SignatureDialog name="Jane Doe" onApply={vi.fn()} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('signs with an uploaded picture of the signature', async () => {
    const onApply = vi.fn()
    const user = userEvent.setup()
    render(<SignatureDialog name="Jane Doe" onApply={onApply} onClose={vi.fn()} />)

    await user.click(screen.getByRole('tab', { name: 'Upload' }))
    expect(screen.getByText(/at least 300 × 100 pixels/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply signature' })).toBeDisabled()
    upload(png())

    expect(await screen.findByRole('img', { name: 'Your uploaded signature' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Apply signature' }))
    expect(ctx.drawImage).toHaveBeenCalled()
    // The paper around the signature is made transparent, so it sits on the signing line.
    expect(ctx.putImageData).toHaveBeenCalled()
    expect(onApply).toHaveBeenCalledWith(PNG)
  })

  it('refuses a picture smaller than the minimum size', async () => {
    const user = userEvent.setup()
    imageSize = { width: 240, height: 80 }
    render(<SignatureDialog name="Jane Doe" onApply={vi.fn()} onClose={vi.fn()} />)

    await user.click(screen.getByRole('tab', { name: 'Upload' }))
    upload(png())

    expect(await screen.findByRole('alert')).toHaveTextContent('This image is 240 × 80 pixels. Upload one at least 300 × 100 pixels.')
    expect(screen.getByRole('button', { name: 'Apply signature' })).toBeDisabled()
  })

  it('refuses a file that is not an image, or is too large', async () => {
    const user = userEvent.setup()
    render(<SignatureDialog name="Jane Doe" onApply={vi.fn()} onClose={vi.fn()} />)
    await user.click(screen.getByRole('tab', { name: 'Upload' }))

    upload(new File(['%PDF'], 'signature.pdf', { type: 'application/pdf' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Upload a PNG, JPG or WebP image.')

    upload(png(6 * 1024 * 1024))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('The image must be 5 MB or smaller.'))
    expect(screen.getByRole('button', { name: 'Apply signature' })).toBeDisabled()
  })

  it('uses the same buttons as the rest of the app', () => {
    render(<SignatureDialog name="Jane Doe" onApply={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Apply signature' })).toHaveClass('btn', 'btn-primary')
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('btn', 'btn-light')
  })
})
