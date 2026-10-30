import { describe, expect, it } from 'vitest'
import { STARTER_TEMPLATES, defaultTemplateFor } from '../../../../../src/pages/settings/components/AgreementBuilder/starterTemplates'
import { gen } from '../../../../../src/pages/settings/components/AgreementBuilder/utils'

/**
 * The starter templates read like real agreements: a header with the
 * company's details, a title, the parties named once (then "the Company" /
 * "the Client"), numbered sections, a required consent box and a signing card -
 * not a page full of blue fields.
 */
const documents = STARTER_TEMPLATES.filter((t) => t.id !== 'blank')
const MASTERS = ['partner-master', 'client-enrollment']
const shortDocuments = documents.filter((t) => !MASTERS.includes(t.id))
const htmlOf = (id: string) => STARTER_TEMPLATES.find((t) => t.id === id)!.blocks().map(gen).join('')
const count = (html: string, text: string) => html.split(text).length - 1

describe('starter templates', () => {
  it('offers the two FCH master agreements, the business funding agreement, a master loan agreement, a terms acknowledgement and a blank page', () => {
    expect(STARTER_TEMPLATES.map((t) => t.name)).toEqual(['Master partner agreement', 'Client enrollment agreement', 'Business funding agreement', 'Master loan agreement', 'Terms acknowledgement', 'Blank page'])
  })

  it.each(documents.map((t) => [t.name, t.id]))('%s opens with a header and ends with a consent box and a signature', (_name, id) => {
    const html = htmlOf(id)

    expect(html.startsWith('<div class="p-letterhead"')).toBe(true)
    expect(html).toMatch(/type="checkbox"[^>]*required/)
    expect(html).toContain('p-sign-card')
    expect(html.lastIndexOf('p-sign-card')).toBeGreaterThan(html.lastIndexOf('type="checkbox"'))
  })

  it.each(shortDocuments.map((t) => [t.name, t.id]))('%s names each person or detail at most twice, and forces no page break', (_name, id) => {
    const html = htmlOf(id)

    for (const field of ['signer.name', 'signer.business_name', 'owner.company_name', 'signer.email', 'signer.phone']) {
      expect(count(html, `{{${field}}}`)).toBeLessThanOrEqual(2)
    }
    expect(html).not.toContain('p-page-break')
  })

  it('the business funding agreement lists the client\'s details in one table', () => {
    const html = htmlOf('business-funding')
    const table = html.slice(html.indexOf('<table>'), html.indexOf('</table>'))

    for (const field of ['signer.name', 'signer.business_name', 'signer.business_address', 'signer.email', 'signer.phone']) {
      expect(table).toContain(`{{${field}}}`)
    }
    expect(html).toContain('<ol>')
    expect(html).toContain('<ul>')
  })

  it('the signing card does not print the signer\'s name', () => {
    for (const { id } of shortDocuments) {
      const html = htmlOf(id)
      expect(html.slice(html.lastIndexOf('p-sign-card'))).not.toContain('{{signer.name}}')
    }
  })

  it('the master partner agreement has every section, addendum and commercial term of the FCH document', () => {
    const html = htmlOf('partner-master')

    for (const text of ['MASTER PARTNER AGREEMENT', 'Document Ref: #FCH-7618', 'SECTION 1 — INDEPENDENT CONTRACTOR STATUS', 'SECTION 3A — FREE TRIAL PROGRAM',
      'SECTION 23 — SIGNATURE AUTHORITY', 'ADDENDUM C — REGIONAL EXPANSION PARTNER', 'ELECTRONIC SIGNATURE ACKNOWLEDGMENT', '$800.00 per enrolled client.']) {
      expect(html).toContain(text.replace(/&/g, '&amp;'))
    }
    // A heading the document repeats at a page break, and a paragraph it splits there, are one each.
    expect(html).not.toContain('(Continued)')
    expect(html).toContain('override eligibility, and relationship ownership, shall remain subject')
    expect(html).not.toContain('👉')
  })

  it('the master partner agreement asks for the details of the partner, then a consent and the signature', () => {
    const html = htmlOf('partner-master')

    for (const label of ['Full Name *', 'Company *', 'Address *', 'City, State, Zip *']) expect(html).toContain(`>${label}:</label>`)
    expect(html).toContain('>Suite or #:</label>')
    expect(html.lastIndexOf('p-sign-card')).toBeGreaterThan(html.indexOf('I acknowledge that I have read, understand'))
    expect(html).not.toContain('UPLOAD IDENTIFICATION DOCUMENT')
  })

  it('the client enrollment agreement fills the details of the company and the client with merge fields', () => {
    const html = htmlOf('client-enrollment')

    for (const text of ['BUSINESS CREDIT BUILDER &amp; FUNDING PROGRAM', '1. PARTIES &amp; AUTHORITY', '28. NOTICES', 'EXHIBIT A — FEE SCHEDULE SUMMARY',
      'SCHEDULE A — PARTNER IDENTITY &amp; NOTICES', 'SCHEDULE C — GOVERNING LAW &amp; VENUE']) {
      expect(html).toContain(text)
    }
    for (const field of ['owner.company_name', 'owner.address', 'owner.email', 'owner.phone', 'signer.name', 'signer.business_name', 'signer.email', 'today']) {
      expect(html).toContain(`{{${field}}}`)
    }
    for (const placeholder of ['[A-1 Partner Legal Name]', '[FULL NAME]', '[CLIENT COMPANY]', '[EFFECTIVE DATE]', 'Client Initials: [']) {
      expect(html).not.toContain(placeholder)
    }
    // The Schedules' own values are left for the partner to write in.
    expect(html).toContain('[B-1 Program Fee]')
  })

  it('the client enrollment agreement lists each party in its own label and value table', () => {
    const html = htmlOf('client-enrollment')

    expect(html).toContain('<td><strong>Legal Name</strong></td><td>{{owner.company_name}}</td>')
    expect(html).toContain('<td><strong>Website</strong></td><td>[A-10 Website]</td>')
    expect(html).toContain('<td><strong>Authorized Signer</strong></td><td>{{signer.name}}</td>')
    expect(html).toContain('<td><strong>Email</strong></td><td>{{signer.email}}</td>')
    // Not both parties crammed into two cells.
    expect(html).not.toContain('THE COMPANY</strong><br>')
    expect(html.indexOf('THE CLIENT / BORROWER ENTITY')).toBeGreaterThan(html.indexOf('THE COMPANY'))
  })

  it('the client enrollment agreement leaves out the notes to the partner', () => {
    const html = htmlOf('client-enrollment')

    expect(html).not.toContain('SCHEDULE COMPLETION INSTRUCTIONS')
    expect(html).not.toContain('Values shown in blue')
    expect(html).not.toContain('☐')
    for (const label of ['Client initials *', 'Client EIN *', 'Title *']) expect(html).toContain(`>${label}:</label>`)
  })
})

describe('the template a new agreement starts from', () => {
  it('is the master partner agreement for partners, and the client enrollment agreement for borrowers', () => {
    const titleOf = (blocks: { type: string; content?: string }[]) => blocks.find((b) => b.type === 'text')?.content

    expect(titleOf(defaultTemplateFor('partner'))).toBe('MASTER PARTNER AGREEMENT')
    expect(titleOf(defaultTemplateFor('borrower'))).toBe('BUSINESS CREDIT BUILDER &amp; FUNDING PROGRAM')
    expect(defaultTemplateFor('partner')[0].id).not.toBe(defaultTemplateFor('partner')[0].id)
  })
})

describe('the look of the master agreements', () => {
  const blocksOf = (id: string) => STARTER_TEMPLATES.find((t) => t.id === id)!.blocks()

  it.each(MASTERS)('%s sets each numbered section on a shaded band', (id) => {
    const blocks = blocksOf(id)
    const sections = blocks.filter((b) => (b as { paletteType?: string }).paletteType === 'heading' && /^(SECTION|ADDENDUM|SCHEDULE|EXHIBIT|\d+\. )/.test(String(b.content)))

    expect(sections.length).toBeGreaterThan(10)
    for (const section of sections) expect(section).toMatchObject({ bgColor: expect.any(String), padding: expect.any(Number), borderRadius: 4 })
  })

  it('the master partner agreement shows the company details in a panel', () => {
    const panel = blocksOf('partner-master').find((b) => String(b.content).startsWith('Four Corner Holdings, LLC'))

    expect(panel).toMatchObject({ bgColor: expect.any(String), padding: expect.any(Number), borderRadius: 4 })
  })
})

describe('room around the fields', () => {
  // A field right under a table or a paragraph read as part of it, and its toolbar in the canvas covered the block above.
  it.each(documents.map((t) => [t.name, t.id]))('%s leaves space above and below every field, consent and signature', (_name, id) => {
    const fields = STARTER_TEMPLATES.find((t) => t.id === id)!.blocks().filter((b) => ['input', 'checkbox', 'signature'].includes(b.type))

    expect(fields.length).toBeGreaterThan(0)
    for (const field of fields) {
      expect(field.marginTop, `${field.type} ${field.fieldLabel}`).toBeGreaterThanOrEqual(12)
      expect(field.marginBottom, `${field.type} ${field.fieldLabel}`).toBeGreaterThanOrEqual(12)
    }
  })
})

describe('where the client enrollment agreement is signed', () => {
  it('signs at the very end, after the schedules', () => {
    const html = htmlOf('client-enrollment')
    const scheduleC = html.indexOf('SCHEDULE C — GOVERNING LAW &amp; VENUE')

    expect(html.indexOf('ACKNOWLEDGMENT OF AUTHORIZED SIGNATURE')).toBeGreaterThan(scheduleC)
    expect(html.indexOf('p-sign-card')).toBeGreaterThan(html.indexOf('C-4  Statutory Cancellation Period'))
    // Nothing but the company representative follows the signature.
    expect(html.slice(html.indexOf('p-sign-card'))).not.toContain('p-text" style')
  })
})
