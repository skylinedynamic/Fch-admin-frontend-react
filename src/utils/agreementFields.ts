/**
 * The values entered in an agreement, by field - what signing sends. The server
 * builds the signed record from them (fch-api SignedAgreementBuilder) and names
 * the fields the same way: by `data-field-id`, or `field_{n}` by order in
 * templates saved before fields had ids.
 */
export type AgreementFieldValues = Record<string, string | boolean>

const SKIPPED_TYPES = ['file', 'hidden', 'submit', 'button', 'image', 'reset']
const SKIPPED_IDS = ['preview-upload', 'hidden-submit']

/**
 * A block split over two pages is shown as one copy per page slice; only the
 * first slice (offset 0) is counted as the field's place in the order.
 */
const isLaterSlice = (el: Element): boolean => {
  const window = el.closest('.ab4-block-clip-window')
  if (!window) return false
  const top = (window.firstElementChild as HTMLElement | null)?.style.top || ''
  return top !== '' && parseFloat(top) !== 0
}

export function collectAgreementFields(doc: Document): AgreementFieldValues {
  const values: AgreementFieldValues = {}
  let position = 0

  doc.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea').forEach((el) => {
    const type = (el.getAttribute('type') || '').toLowerCase()
    if (SKIPPED_TYPES.includes(type) || SKIPPED_IDS.includes(el.id)) return

    const value = type === 'checkbox' ? (el as HTMLInputElement).checked : el.value
    const id = el.getAttribute('data-field-id')

    if (isLaterSlice(el)) {
      // Another copy of a field already counted: keep what was entered in it.
      if (id && !values[id] && value) values[id] = value
      return
    }

    const key = id || `field_${position}`
    position++
    if (!(key in values) || (!values[key] && value)) values[key] = value
  })

  return values
}
