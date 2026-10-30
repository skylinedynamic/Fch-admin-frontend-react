import { beforeEach, describe, expect, it } from 'vitest'
import {
  formatSigningDate,
  listSigningFields,
  placeSignature,
  prefillSigningDates,
} from '../../src/utils/agreementSigning'
import { collectAgreementFields } from '../../src/utils/agreementFields'

/**
 * Signing an agreement the way e-signature tools guide it: the signer is taken
 * from one field to the next, the date signed fills itself, and a signature is
 * drawn or typed rather than uploaded.
 */
const PNG = 'data:image/png;base64,iVBORw0KGgo='

// What the Agreement Builder saves (gen): a name field, a consent box, an optional
// note and a signing line with its date. The signing line is split over two pages,
// so its later slice is a second copy.
const PAGE = `
  <div class="p-field"><label class="p-label">Full name *:</label><input type="text" class="p-input" data-field-id="name" required/></div>
  <div class="p-field"><input type="checkbox" class="p-checkbox" data-field-id="agree" required/><label class="p-cb-label">I agree *</label></div>
  <div class="p-field"><label class="p-label">Note:</label><input type="text" class="p-input" data-field-id="note"/></div>
  <div class="p-sign">
    <div class="p-field p-sign-col">
      <div class="p-sign-pad preview-dropzone" data-block-id="sig">
        <span class="p-sign-tag">Sign here</span>
        <input type="text" class="p-input" data-field-id="sig" required value=""/>
      </div>
      <div class="p-sign-role">Client signature *</div>
    </div>
    <div class="p-field p-sign-col p-sign-col--date">
      <div class="p-sign-pad"><input type="text" class="flatpickr p-sig-input p-sign-date" data-field-id="sig:date" required/></div>
    </div>
  </div>
  <div class="ab4-block-clip-window"><div style="top: -40px"><input type="text" data-field-id="name" required/></div></div>
  <input type="file" id="preview-upload"/>
`

let doc: Document
beforeEach(() => {
  doc = document.implementation.createHTMLDocument('agreement')
  doc.body.innerHTML = PAGE
})

describe('listSigningFields', () => {
  it('lists each field once, in page order, with what kind it is and whether it is required', () => {
    expect(listSigningFields(doc).map(({ key, kind, required }) => ({ key, kind, required }))).toEqual([
      { key: 'name', kind: 'text', required: true },
      { key: 'agree', kind: 'checkbox', required: true },
      { key: 'note', kind: 'text', required: false },
      { key: 'sig', kind: 'signature', required: true },
      { key: 'sig:date', kind: 'date-signed', required: true },
    ])
  })

  it('knows which are filled in', () => {
    ;(doc.querySelector('[data-field-id="name"]') as HTMLInputElement).value = 'Jane Doe'
    ;(doc.querySelector('[data-field-id="agree"]') as HTMLInputElement).checked = true

    expect(listSigningFields(doc).filter((f) => f.filled).map((f) => f.key)).toEqual(['name', 'agree'])
  })
})

describe('prefillSigningDates', () => {
  it('fills the date signed with today, and it cannot be changed', () => {
    prefillSigningDates(doc, new Date(2026, 9, 30))

    const date = doc.querySelector('[data-field-id="sig:date"]') as HTMLInputElement
    expect(date.value).toBe('30 Oct, 2026')
    expect(date.readOnly).toBe(true)
    expect(collectAgreementFields(doc)['sig:date']).toBe('30 Oct, 2026')
  })

  it('writes dates the way the agreement calendar does', () => {
    expect(formatSigningDate(new Date(2026, 0, 5))).toBe('05 Jan, 2026')
  })
})

describe('placeSignature', () => {
  it('puts the signature on the signing line and in its field', () => {
    placeSignature(doc, 'sig', PNG)

    const pad = doc.querySelector('[data-block-id="sig"]')!
    expect(pad.querySelector('img')?.getAttribute('src')).toBe(PNG)
    expect(pad.querySelector('.p-sign-tag')).toBeNull()
    expect(collectAgreementFields(doc).sig).toBe(PNG)
    expect(listSigningFields(doc).find((f) => f.key === 'sig')?.filled).toBe(true)
  })

  it('replaces an earlier signature', () => {
    placeSignature(doc, 'sig', PNG)
    placeSignature(doc, 'sig', 'data:image/png;base64,AAAA')

    expect(doc.querySelectorAll('[data-block-id="sig"] img')).toHaveLength(1)
    expect(collectAgreementFields(doc).sig).toBe('data:image/png;base64,AAAA')
  })

  it('ignores a block that is not a signature (a logo)', () => {
    doc.body.insertAdjacentHTML('beforeend', '<div class="preview-dropzone" data-block-id="logo"><img src="logo.png"/></div>')

    expect(placeSignature(doc, 'logo', PNG)).toBe(false)
    expect(doc.querySelector('[data-block-id="logo"] img')?.getAttribute('src')).toBe('logo.png')
  })
})

describe('prefillSigningDates, again', () => {
  it('leaves a date it already filled alone, without announcing a change', () => {
    prefillSigningDates(doc, new Date(2026, 9, 30))
    const date = doc.querySelector('[data-field-id="sig:date"]') as HTMLInputElement
    let events = 0
    date.addEventListener('input', () => events++)

    prefillSigningDates(doc, new Date(2026, 9, 30))

    expect(events).toBe(0)
  })
})
