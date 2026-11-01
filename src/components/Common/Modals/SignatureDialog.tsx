import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './SignatureDialog.css'

interface SignatureDialogProps {
  /** The signer's name, to start the typed signature with. */
  name: string
  /** The signature as a PNG data URL. */
  onApply: (dataUrl: string) => void
  onClose: () => void
}

type Mode = 'type' | 'draw' | 'upload'

// Stored at a fixed size, so every signature has the same resolution; CSS scales the pad.
const WIDTH = 720
const HEIGHT = 200
const INK = '#0b1f4d'
// A handwriting face the signer's computer already has; the stored image does not depend on it later.
export const SIGNATURE_FONT = '"Segoe Script", "Brush Script MT", "Lucida Handwriting", "Apple Chancery", cursive'
// An uploaded picture smaller than this is too blurry on the signed PDF.
export const MIN_UPLOAD_WIDTH = 300
export const MIN_UPLOAD_HEIGHT = 100
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp']
// Pixels lighter than this are paper, made transparent so the signature sits on the line.
const PAPER = 225

const TABS: { mode: Mode; label: string; icon: string }[] = [
  { mode: 'type', label: 'Type', icon: 'ri-keyboard-line' },
  { mode: 'draw', label: 'Draw', icon: 'ri-edit-2-line' },
  { mode: 'upload', label: 'Upload', icon: 'ri-upload-2-line' },
]

const loadImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = () => reject(new Error('unreadable'))
  image.src = url
})

/**
 * Adopt a signature: type it (the name in a handwriting style), draw it with
 * a mouse, finger or pen, or upload a picture of it. The result is a
 * transparent PNG of a fixed size for the signing line.
 */
export default function SignatureDialog({ name, onApply, onClose }: SignatureDialogProps) {
  const titleId = useId()
  const [mode, setMode] = useState<Mode>('type')
  const [typed, setTyped] = useState(name)
  const [hasInk, setHasInk] = useState(false)
  const padRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef<{ x: number; y: number } | null>(null)
  const [uploaded, setUploaded] = useState<{ url: string; image: HTMLImageElement } | null>(null)
  const [uploadError, setUploadError] = useState('')

  useEffect(() => () => { if (uploaded) URL.revokeObjectURL(uploaded.url) }, [uploaded])

  const chooseFile = async (file: File | undefined) => {
    setUploaded(null)
    setUploadError('')
    if (!file) return
    if (!UPLOAD_TYPES.includes(file.type)) return setUploadError('Upload a PNG, JPG or WebP image.')
    if (file.size > MAX_UPLOAD_BYTES) return setUploadError('The image must be 5 MB or smaller.')
    const url = URL.createObjectURL(file)
    try {
      const image = await loadImage(url)
      const { naturalWidth: w, naturalHeight: h } = image
      if (w < MIN_UPLOAD_WIDTH || h < MIN_UPLOAD_HEIGHT) {
        URL.revokeObjectURL(url)
        return setUploadError(`This image is ${w} × ${h} pixels. Upload one at least ${MIN_UPLOAD_WIDTH} × ${MIN_UPLOAD_HEIGHT} pixels.`)
      }
      setUploaded({ url, image })
    } catch {
      URL.revokeObjectURL(url)
      setUploadError('This image could not be read. Try another file.')
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const pointAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const sx = rect.width ? WIDTH / rect.width : 1
    const sy = rect.height ? HEIGHT / rect.height : 1
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy }
  }

  const startStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drawing.current = pointAt(e)
    setHasInk(true)
  }

  const continueStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const from = drawing.current
    const ctx = padRef.current?.getContext('2d')
    if (!from || !ctx) return
    const to = pointAt(e)
    ctx.strokeStyle = INK
    ctx.lineWidth = 3.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
    drawing.current = to
  }

  const clear = useCallback(() => {
    padRef.current?.getContext('2d')?.clearRect(0, 0, WIDTH, HEIGHT)
    setHasInk(false)
  }, [])

  const typedImage = (): string => {
    const canvas = document.createElement('canvas')
    canvas.width = WIDTH
    canvas.height = HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    let size = 84
    ctx.font = `${size}px ${SIGNATURE_FONT}`
    // Long names are made smaller to fit, rather than cut off.
    while (size > 28 && ctx.measureText(typed.trim()).width > WIDTH - 40) {
      size -= 4
      ctx.font = `${size}px ${SIGNATURE_FONT}`
    }
    ctx.fillStyle = INK
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(typed.trim(), WIDTH / 2, HEIGHT / 2)
    return canvas.toDataURL('image/png')
  }

  // The picture is fitted into the same fixed size as the other signatures, centred, with its paper removed.
  const uploadedImage = (): string => {
    if (!uploaded) return ''
    const canvas = document.createElement('canvas')
    canvas.width = WIDTH
    canvas.height = HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    const { image } = uploaded
    const scale = Math.min((WIDTH - 20) / image.naturalWidth, (HEIGHT - 20) / image.naturalHeight)
    const w = image.naturalWidth * scale
    const h = image.naturalHeight * scale
    ctx.drawImage(image, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h)
    const pixels = ctx.getImageData(0, 0, WIDTH, HEIGHT)
    const d = pixels.data
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > PAPER && d[i + 1] > PAPER && d[i + 2] > PAPER) d[i + 3] = 0
    }
    ctx.putImageData(pixels, 0, 0)
    return canvas.toDataURL('image/png')
  }

  const canApply = mode === 'type' ? typed.trim() !== '' : mode === 'draw' ? hasInk : uploaded !== null
  const apply = () => {
    const image = mode === 'type' ? typedImage() : mode === 'draw' ? padRef.current?.toDataURL('image/png') || '' : uploadedImage()
    if (image) onApply(image)
  }

  return createPortal(
    <div className="sgd-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sgd-card" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sgd-head">
          <h2 id={titleId} className="sgd-title">Adopt your signature</h2>
          <button type="button" className="sgd-close" aria-label="Close" onClick={onClose}><i className="ri-close-line" aria-hidden="true" /></button>
        </div>

        <div className="sgd-tabs" role="tablist" aria-label="How to sign">
          {TABS.map((tab) => (
            <button key={tab.mode} type="button" role="tab" aria-selected={mode === tab.mode}
              className={`sgd-tab ${mode === tab.mode ? 'sgd-tab--on' : ''}`} onClick={() => setMode(tab.mode)}>
              <i className={tab.icon} aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </div>

        {mode === 'type' ? (
          <div className="sgd-body">
            <label className="sgd-label" htmlFor={`${titleId}-name`}>Your name</label>
            <input id={`${titleId}-name`} className="sgd-input" value={typed} autoFocus
              onChange={(e) => setTyped(e.target.value)} maxLength={60} autoComplete="name" />
            <div className="sgd-preview" aria-hidden="true">
              <span className="sgd-preview__x">&times;</span>
              <span className="sgd-preview__ink" style={{ fontFamily: SIGNATURE_FONT }}>{typed || ' '}</span>
            </div>
          </div>
        ) : mode === 'upload' ? (
          <div className="sgd-body">
            <label className={`sgd-drop ${uploaded ? 'sgd-drop--filled' : ''}`}>
              <input type="file" className="sgd-file" accept={UPLOAD_TYPES.join(',')}
                aria-label="Upload a picture of your signature"
                onChange={(e) => { void chooseFile(e.target.files?.[0]); e.target.value = '' }} />
              {uploaded ? (
                <>
                  <img src={uploaded.url} alt="Your uploaded signature" className="sgd-drop__img" />
                  <span className="sgd-drop__change"><i className="ri-refresh-line" aria-hidden="true" /> Choose a different image</span>
                </>
              ) : (
                <>
                  <i className="ri-image-add-line sgd-drop__icon" aria-hidden="true" />
                  <span className="sgd-drop__title">Choose a picture of your signature</span>
                  <span className="sgd-drop__hint">
                    PNG, JPG or WebP, at least {MIN_UPLOAD_WIDTH} × {MIN_UPLOAD_HEIGHT} pixels, up to 5 MB.
                    Sign on white paper for the cleanest result.
                  </span>
                </>
              )}
            </label>
            {uploadError && <p className="sgd-error" role="alert"><i className="ri-error-warning-line" aria-hidden="true" /> {uploadError}</p>}
          </div>
        ) : (
          <div className="sgd-body">
            <div className="sgd-pad-wrap">
              <canvas ref={padRef} width={WIDTH} height={HEIGHT} className="sgd-pad" aria-label="Draw your signature"
                onPointerDown={startStroke} onPointerMove={continueStroke}
                onPointerUp={() => { drawing.current = null }} onPointerLeave={() => { drawing.current = null }} />
              <span className="sgd-pad__x" aria-hidden="true">&times;</span>
              <span className="sgd-pad__line" aria-hidden="true" />
              {!hasInk && <span className="sgd-pad__hint" aria-hidden="true">Sign here with your mouse or finger</span>}
            </div>
            <div className="sgd-pad-actions">
              <button type="button" className="sgd-link" onClick={clear} disabled={!hasInk}>Clear</button>
            </div>
          </div>
        )}

        <p className="sgd-legal">
          By selecting Apply signature, I agree that this signature is the electronic representation of my signature
          for this agreement, with the same legal effect as my handwritten signature.
        </p>

        <div className="sgd-foot">
          <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={!canApply} onClick={apply}>
            <i className="ri-quill-pen-line align-bottom me-1" aria-hidden="true" /> Apply signature
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
