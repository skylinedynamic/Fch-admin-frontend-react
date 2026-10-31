import { describe, expect, it } from 'vitest'
import { collectAgreementFields } from '../../src/utils/agreementFields'

/**
 * The values a signer entered in the agreement, by field - what signing
 * sends; the server builds the signed record from them (fch-api
 * SignedAgreementBuilder), naming fields the same way.
 */
const doc = (body: string) => new DOMParser().parseFromString(`<html><body>${body}</body></html>`, 'text/html')

describe('collectAgreementFields', () => {
  it('collects each field by its id: text, checkbox, signature image and date', () => {
    const d = doc(`
      <form id="agreement-form">
        <input type="text" class="p-input" data-field-id="b1" value="Jane Doe"/>
        <input type="checkbox" class="p-checkbox" data-field-id="b2" checked/>
        <div class="preview-dropzone"><input type="text" class="p-input" data-field-id="b3" value="data:image/png;base64,AAA="/></div>
        <input type="text" class="flatpickr p-sig-input" data-field-id="b3:date" value="30 Oct, 2026"/>
        <textarea data-field-id="b4">Notes</textarea>
      </form>`)

    expect(collectAgreementFields(d)).toEqual({
      b1: 'Jane Doe', b2: true, b3: 'data:image/png;base64,AAA=', 'b3:date': '30 Oct, 2026', b4: 'Notes',
    })
  })

  it('reads what was typed, not what the page first held', () => {
    const d = doc('<input type="text" data-field-id="b1" value=""/><input type="checkbox" data-field-id="b2"/>')
    ;(d.querySelector('[data-field-id="b1"]') as HTMLInputElement).value = 'Typed'
    ;(d.querySelector('[data-field-id="b2"]') as HTMLInputElement).checked = true

    expect(collectAgreementFields(d)).toEqual({ b1: 'Typed', b2: true })
  })

  it('leaves out the upload input, hidden inputs and buttons', () => {
    const d = doc(`
      <input type="text" data-field-id="b1" value="x"/>
      <input type="file" id="preview-upload"/><input type="hidden" value="h"/><input type="submit" id="hidden-submit"/>`)

    expect(collectAgreementFields(d)).toEqual({ b1: 'x' })
  })

  it('names the fields of an older template, saved without ids, by their order', () => {
    const d = doc('<input type="text" value="Jane"/><input type="file"/><input type="checkbox" checked/><input type="text" value="Date"/>')

    expect(collectAgreementFields(d)).toEqual({ field_0: 'Jane', field_1: true, field_2: 'Date' })
  })

  /**
   * A block taller than the space left on a page is shown in slices, each a
   * copy of the block: its fields appear once per slice but are one field.
   */
  it('counts a field shown on two pages once, keeping what was entered in either copy', () => {
    const slice = (top: number, value: string) =>
      `<div class="ab4-block-clip-window"><div style="top:-${top}px"><input type="text" data-field-id="b1" value="${value}"/><input type="text" value="${value}"/></div></div>`
    const d = doc(slice(0, '') + slice(600, 'Entered on page 2') + '<input type="text" value="After"/>')

    expect(collectAgreementFields(d)).toEqual({ b1: 'Entered on page 2', field_1: '', field_2: 'After' })
  })
})
