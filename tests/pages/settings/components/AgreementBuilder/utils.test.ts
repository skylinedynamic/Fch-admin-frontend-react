import { describe, expect, it } from 'vitest'
import { gen, makeBlock, moveBlock, PALETTE, addTableRow, removeTableRow, addTableColumn, removeTableColumn, hasTable, keepsWithNext, PREVIEW_JS, LAYOUT_CSS, PREVIEW_CSS, withMergeSamples } from '../../../../../src/pages/settings/components/AgreementBuilder/utils'

/**
 * Each field in a saved agreement carries the id of its block
 * (`data-field-id`), so the values a signer enters are sent and matched by
 * field - the server builds the signed record from them (fch-api
 * SignedAgreementBuilder) - not by the fields' order on the page.
 */
const fieldIds = (html: string) => Array.from(html.matchAll(/data-field-id="([^"]+)"/g), (m) => m[1])

describe('agreement field ids', () => {
  it.each(['input', 'textarea', 'date', 'checkbox'])('a %s field is named by its block id', (type) => {
    const block = { ...makeBlock(type), id: 'b42' }

    expect(fieldIds(gen(block))).toEqual(['b42'])
  })

  it('a signature has its image and its date as two fields of the block', () => {
    const block = { ...makeBlock('signature'), id: 'b7' }

    expect(fieldIds(gen(block))).toEqual(['b7', 'b7:date'])
  })

  it('fields inside a parties row keep their own block ids', () => {
    const block = {
      ...makeBlock('parties'),
      partyA: [{ ...makeBlock('input'), id: 'a1' }],
      partyB: [{ ...makeBlock('signature'), id: 's1' }],
    }

    expect(fieldIds(gen(block))).toEqual(['a1', 's1', 's1:date'])
  })

  it('blocks that are not fields carry no field id', () => {
    for (const type of ['text', 'logo', 'divider', 'spacer', 'page-break']) {
      expect(fieldIds(gen({ ...makeBlock(type), id: 'x' }))).toEqual([])
    }
  })
})

describe('moveBlock', () => {
  const list = ['a', 'b', 'c', 'd'].map((id) => ({ id }))
  const ids = (blocks: { id: string }[]) => blocks.map((b) => b.id).join('')

  it('moves a block down, landing before the block it was dropped on', () => {
    expect(ids(moveBlock(list, 'a', 3))).toBe('bcad')
  })

  it('moves a block up', () => {
    expect(ids(moveBlock(list, 'd', 1))).toBe('adbc')
  })

  it('moves a block to the end', () => {
    expect(ids(moveBlock(list, 'b', 4))).toBe('acdb')
  })

  it('leaves the order alone when dropped where it already is, or for an unknown block', () => {
    expect(ids(moveBlock(list, 'b', 1))).toBe('abcd')
    expect(ids(moveBlock(list, 'b', 2))).toBe('abcd')
    expect(ids(moveBlock(list, 'x', 0))).toBe('abcd')
  })
})

describe('text presets: heading, lists and table', () => {
  it('a heading is a bold, larger text block', () => {
    const block = makeBlock('heading')
    expect(block).toMatchObject({ type: 'text', paletteType: 'heading', fontWeight: '800' })
    expect(block.fontSize).toBeGreaterThanOrEqual(16)
    expect(block.content).toBe('Section heading')
  })

  it('bulleted and numbered lists are text blocks holding a list', () => {
    expect(makeBlock('bullet-list')).toMatchObject({ type: 'text' })
    expect(makeBlock('bullet-list').content).toMatch(/^<ul>(<li>[^<]+<\/li>){3}<\/ul>$/)
    expect(makeBlock('numbered-list').content).toMatch(/^<ol>(<li>[^<]+<\/li>){3}<\/ol>$/)
  })

  it('a table is a text block holding a header row and two rows of three columns', () => {
    const div = document.createElement('div')
    div.innerHTML = makeBlock('table').content
    expect(makeBlock('table').type).toBe('text')
    expect(div.querySelectorAll('thead tr th')).toHaveLength(3)
    expect(div.querySelectorAll('tbody tr')).toHaveLength(2)
    expect(div.querySelectorAll('tbody tr:first-child td')).toHaveLength(3)
  })

  it('offers them in the palette', () => {
    const types = PALETTE.flatMap((g: { items: { type: string }[] }) => g.items.map((i) => i.type))
    expect(types).toEqual(expect.arrayContaining(['heading', 'bullet-list', 'numbered-list', 'table']))
  })
})

describe('table editing', () => {
  const table = makeBlock('table').content
  const count = (html: string, selector: string) => {
    const div = document.createElement('div')
    div.innerHTML = html
    return div.querySelectorAll(selector).length
  }

  it('adds and removes rows, keeping at least one', () => {
    expect(count(addTableRow(table), 'tbody tr')).toBe(3)
    expect(count(addTableRow(table), 'tbody tr:last-child td')).toBe(3)
    expect(count(removeTableRow(table), 'tbody tr')).toBe(1)
    expect(count(removeTableRow(removeTableRow(table)), 'tbody tr')).toBe(1)
  })

  it('adds and removes columns in every row, keeping at least one', () => {
    expect(count(addTableColumn(table), 'thead th')).toBe(4)
    expect(count(addTableColumn(table), 'tbody tr:first-child td')).toBe(4)
    const one = removeTableColumn(removeTableColumn(removeTableColumn(table)))
    expect(count(one, 'thead th')).toBe(1)
    expect(count(one, 'tbody tr:first-child td')).toBe(1)
  })

  it('keeps what is already in the cells and around the table', () => {
    const filled = table.replace('<th>Item</th>', '<th>Fee {{owner.company_name}}</th>')
    expect(addTableRow(`<p>Fees:</p>${filled}`)).toContain('<p>Fees:</p>')
    expect(addTableColumn(filled)).toContain('<th>Fee {{owner.company_name}}</th>')
  })

  it('leaves text without a table unchanged', () => {
    expect(addTableRow('<p>No table</p>')).toBe('<p>No table</p>')
    expect(hasTable('<p>No table</p>')).toBe(false)
    expect(hasTable(table)).toBe(true)
  })
})

/** A heading is never left alone at the bottom of a page (see pagination.ts). */
describe('keeping headings with their text', () => {
  it('a heading block keeps with the text after it', () => {
    expect(keepsWithNext(makeBlock('heading'))).toBe(true)
    expect(gen(makeBlock('heading'))).toContain('data-keep="1"')
  })

  it('a short bold line, as older templates write their section titles, keeps with the text after it', () => {
    const title = { ...makeBlock('text'), content: '1. PRINCIPAL LOAN AMOUNT', fontWeight: '800' }

    expect(keepsWithNext(title)).toBe(true)
  })

  it('a paragraph, a bold paragraph or a list does not', () => {
    expect(keepsWithNext({ ...makeBlock('text'), content: 'Plain words' })).toBe(false)
    expect(keepsWithNext({ ...makeBlock('text'), content: 'x'.repeat(200), fontWeight: '700' })).toBe(false)
    expect(keepsWithNext({ ...makeBlock('bullet-list'), fontWeight: '700' })).toBe(false)
    expect(gen(makeBlock('text'))).not.toContain('data-keep')
  })

  it('the template script carries the shared page layout', () => {
    expect(PREVIEW_JS).toContain('var planPages = function')
    expect(PREVIEW_JS).toContain('var measureLineBoxes = function')
    new Function(PREVIEW_JS.replace(/attachDropzone\(\);[\s\S]*$/, '')) // parses
  })
})

/** The Company Logo block is the logo alone; the Header block is a letterhead with its own text. */
describe('logo and header blocks', () => {
  it('a logo block is only the logo', () => {
    const html = gen(makeBlock('logo'))

    expect(html).toContain('p-logo-wrapper')
    expect(html).not.toContain('p-letterhead')
  })

  it('a header has the logo on the left and its own text on the right, starting with the company details', () => {
    const header = makeBlock('header')
    const html = gen(header)

    expect(header.type).toBe('header')
    expect(html).toContain('p-letterhead')
    for (const field of ['owner.company_name', 'owner.address', 'owner.email', 'owner.phone']) expect(html).toContain(`{{${field}}}`)
  })

  it('a header shows the text written in it', () => {
    const html = gen({ ...makeBlock('header'), content: 'Acme Lending<br>Licensed lender #123' })

    expect(html).toContain('Acme Lending<br>Licensed lender #123')
    expect(html).not.toContain('{{owner.email}}')
  })

  it('is offered in the Layout group', () => {
    expect(PALETTE.find((g) => g.group === 'Layout')!.items.map((i) => i.type)).toEqual(expect.arrayContaining(['logo', 'header']))
  })

  it('a logo block saved as a letterhead keeps showing as one', () => {
    expect(gen({ ...makeBlock('logo'), logoLayout: 'letterhead' })).toContain('p-letterhead')
  })
})

/**
 * A signature reads like a signed paper: a "Sign here" tag on a signing line,
 * the signer's name and role under it, and the date signed beside it.
 */
describe('tables', () => {
  // A label column squeezed by a long second column broke words mid-word ("Approva l Notice Date").
  it('give the label column room, and break words only when one does not fit', () => {
    expect(PREVIEW_CSS).toMatch(/\.p-text tr > :first-child:nth-last-child\(2\)\s*\{[^}]*width:\s*30%/)
    expect(PREVIEW_CSS).toMatch(/\.p-text th, \.p-text td\s*\{[^}]*word-break:\s*normal;[^}]*overflow-wrap:\s*break-word/)
  })
})

describe('signature block', () => {
  const block = { ...makeBlock('signature'), id: 'b7', fieldLabel: 'Client signature', fieldRequired: true }

  it('shows a Sign here tag on a line, with the signer\'s name and role under it', () => {
    const html = gen(block)

    expect(html).toContain('p-sign-card')
    expect(html).toContain('Sign here')
    // The signer's name is not printed under the line unless asked for.
    expect(html).not.toContain('{{signer.name}}')
    expect(html).toContain('Client signature')
    expect(html).toContain('Date signed')
  })

  it('keeps the signature and date fields the signing page fills', () => {
    const html = gen(block)

    expect(html).toMatch(/class="[^"]*preview-dropzone[^"]*"[^>]*data-block-id="b7"/)
    expect(fieldIds(html)).toEqual(['b7', 'b7:date'])
  })

  it('can print the signer\'s name under the line', () => {
    expect(gen({ ...block, showSignerName: true })).toContain('{{signer.name}}')
  })

  it('says the signature is recorded in the signature certificate attached to the agreement', () => {
    expect(gen(block)).toMatch(/<div class="p-sign-foot">[\s\S]*Recorded in the signature certificate at the end of this agreement[\s\S]*<\/div>/)
  })

  it('has 4px corners like the rest of the app, and a tinted signing area', () => {
    expect(LAYOUT_CSS).toMatch(/\.p-sign-card\s*\{[^}]*border-radius:\s*4px/)
    expect(LAYOUT_CSS).toMatch(/\.p-sign-col:not\(\.p-sign-col--date\) \.p-sign-pad\s*\{[^}]*background:/)
  })
})

describe('merge fields in the preview', () => {
  const page = '<html><head></head><body><p>{{owner.company_name}} and {{signer.name}} at {{owner.address}}</p></body></html>'

  it('shows the real details of the owner where they are known, and examples for the rest', () => {
    const html = withMergeSamples(page, { 'owner.company_name': 'Four Corner Holdings, LLC', 'owner.address': '' })

    expect(html).toContain('title="{{owner.company_name}}">Four Corner Holdings, LLC</span>')
    // Nothing on file: the example stays.
    expect(html).toContain('title="{{owner.address}}">1 Main St, Austin, TX 78701</span>')
    // A signer has no real value while a template is built.
    expect(html).toContain('title="{{signer.name}}">Jane Doe</span>')
  })

  it('escapes the real details', () => {
    expect(withMergeSamples(page, { 'owner.company_name': 'A&B <Lending>' })).toContain('>A&amp;B &lt;Lending&gt;</span>')
  })
})
