/**
 * Guided signing of an agreement page (the Agreement Builder's saved HTML,
 * shown in an iframe): the fields to fill, in page order; the date signed,
 * filled with today; and a drawn or typed signature put on its signing line.
 * The values are read back by `collectAgreementFields` and the server builds
 * the signed record from them.
 *
 * The borrower (client-fch) and partner (Fch-admin-frontend-react) portals
 * carry identical copies of this file; keep the two in sync.
 */

export type SigningFieldKind = 'text' | 'checkbox' | 'signature' | 'date-signed'

export interface SigningField {
  key: string
  kind: SigningFieldKind
  required: boolean
  filled: boolean
  input: HTMLInputElement | HTMLTextAreaElement
  /** What to scroll to and mark: the field's box on the page. */
  target: HTMLElement
}

const SKIPPED_TYPES = ['file', 'hidden', 'submit', 'button', 'image', 'reset']
const SKIPPED_IDS = ['preview-upload', 'hidden-submit']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** A later page's copy of a block split over two pages (see agreementFields). */
const isLaterSlice = (el: Element): boolean => {
  const slice = el.closest('.ab4-block-clip-window')
  const top = (slice?.firstElementChild as HTMLElement | null)?.style.top || ''
  return top !== '' && parseFloat(top) !== 0
}

const kindOf = (input: HTMLInputElement | HTMLTextAreaElement): SigningFieldKind => {
  if (input.getAttribute('type') === 'checkbox') return 'checkbox'
  if (input.closest('.preview-dropzone')) return 'signature'
  const key = input.getAttribute('data-field-id') || ''
  if (key.endsWith(':date') || input.classList.contains('p-sig-input')) return 'date-signed'
  return 'text'
}

export function listSigningFields(doc: Document): SigningField[] {
  const fields: SigningField[] = []
  const seen = new Set<string>()
  let position = 0
  doc.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea').forEach((input) => {
    const type = (input.getAttribute('type') || '').toLowerCase()
    if (SKIPPED_TYPES.includes(type) || SKIPPED_IDS.includes(input.id) || isLaterSlice(input)) return
    const key = input.getAttribute('data-field-id') || `field_${position}`
    position++
    if (seen.has(key)) return
    seen.add(key)
    const kind = kindOf(input)
    fields.push({
      key,
      kind,
      required: input.hasAttribute('required'),
      filled: kind === 'checkbox' ? (input as HTMLInputElement).checked : input.value.trim() !== '',
      input,
      target: (kind === 'signature' ? input.closest('.preview-dropzone') : input.closest('.p-field')) as HTMLElement || input,
    })
  })
  return fields
}

/** "30 Oct, 2026": the agreement calendar's format (flatpickr 'd M, Y'). */
export const formatSigningDate = (date: Date): string =>
  `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`

const notify = (input: HTMLElement) => {
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

/** The date signed is the day of signing: filled in, and not a field to change. */
export function prefillSigningDates(doc: Document, today: Date = new Date()): void {
  const value = formatSigningDate(today)
  listSigningFields(doc).filter((f) => f.kind === 'date-signed').forEach(({ input }) => {
    // Already filled: nothing to change (and no event, which would ask for another fill).
    if (input.readOnly && input.value === value) return
    const picker = (input as HTMLInputElement & { _flatpickr?: { destroy: () => void } })._flatpickr
    picker?.destroy()
    input.value = value
    input.setAttribute('value', input.value)
    input.readOnly = true
    input.removeAttribute('data-app-calendar')
    input.classList.remove('flatpickr')
    notify(input)
  })
}

/**
 * Puts a signature image (a PNG data URL) on the signing line of block
 * `blockId` and in its field. False when that block is not a signature.
 */
export function placeSignature(doc: Document, blockId: string, dataUrl: string): boolean {
  const pad = doc.querySelector(`.preview-dropzone[data-block-id="${CSS.escape(blockId)}"]`)
  const input = pad?.querySelector<HTMLInputElement>('input[type="text"], input:not([type])')
  if (!pad || !input) return false
  Array.from(pad.childNodes).forEach((node) => { if (node !== input) pad.removeChild(node) })
  const img = doc.createElement('img')
  img.src = dataUrl
  img.alt = 'Signature'
  img.className = 'p-sign-img'
  pad.insertBefore(img, input)
  input.value = dataUrl
  pad.classList.add('is-signed')
  pad.closest('.p-field')?.classList.remove('is-invalid')
  notify(input)
  return true
}

/**
 * Marks for the guide, added to the agreement page: fields still to fill
 * carry a yellow flag, the current one a ring.
 */
export const SIGNING_GUIDE_CSS = `
  .asg-todo { position: relative; outline: 2px solid #facc15; outline-offset: 3px; border-radius: 4px; background-color: rgba(254, 249, 195, 0.55); transition: outline-color .2s, background-color .2s; }
  .asg-todo.p-sign-col, .asg-todo.preview-dropzone { background-color: transparent; }
  .asg-current { outline: 3px solid #2563eb !important; outline-offset: 4px; background-color: rgba(219, 234, 254, 0.6) !important; }
  .asg-current.preview-dropzone { background-color: transparent !important; }
  .p-sign .p-sign-date[readonly] { cursor: default; }
  .preview-dropzone.is-signed { cursor: pointer; }
`
