import { describe, expect, it } from 'vitest'
import { pastedToHtml } from '../../../../../src/pages/settings/components/AgreementBuilder/pastedText'

/**
 * Text copied from ChatGPT, Claude, Word or a web page keeps its structure -
 * bold, italics, headings, lists, tables, paragraphs - but none of the source's
 * fonts, colours, classes or scripts. Markdown (what the "Copy" button of an AI
 * chat gives) is turned into the same structure. Blocks show text with
 * white-space: pre-wrap, so paragraphs are separated by line breaks (a break
 * just before a list or table is absorbed, so a blank line there takes two).
 */
describe('pastedToHtml', () => {
  it('keeps headings, paragraphs and bold text from a copied chat answer, without its styles', () => {
    const html = `<h2 style="color:red" class="x">1. Purpose</h2>
      <p data-start="1">The <strong>Company</strong> helps the <em>Client</em>.</p>
      <p>Second paragraph.</p>`

    expect(pastedToHtml({ html })).toBe('<strong>1. Purpose</strong>\nThe <strong>Company</strong> helps the <em>Client</em>.\n\nSecond paragraph.')
  })

  it('keeps lists, without the paragraphs a chat puts inside each item', () => {
    const html = '<p>The Client will:</p><ul>\n<li><p>give true information;</p></li>\n<li>use funds lawfully.</li></ul><p>After.</p>'

    expect(pastedToHtml({ html })).toBe('The Client will:\n\n<ul><li>give true information;</li><li>use funds lawfully.</li></ul>\nAfter.')
  })

  it('keeps tables, cell by cell', () => {
    const html = '<table class="t"><thead><tr><th>Term</th><th>Detail</th></tr></thead><tbody><tr><td><p>APR</p></td><td>12 %</td></tr></tbody></table>'

    expect(pastedToHtml({ html })).toBe('<table><thead><tr><th>Term</th><th>Detail</th></tr></thead><tbody><tr><td>APR</td><td>12 %</td></tr></tbody></table>')
  })

  it('drops scripts, styles, images, buttons and links, keeping the link text', () => {
    const html = '<style>p{color:red}</style><p>See <a href="javascript:alert(1)" onclick="x()">our terms</a><img src="x" onerror="alert(1)"><script>alert(1)</script><button>Copy</button></p>'

    expect(pastedToHtml({ html })).toBe('See our terms')
  })

  it('escapes text that looks like markup, and keeps merge fields', () => {
    expect(pastedToHtml({ html: '<p>&lt;b&gt; for {{signer.name}} &amp; co</p>' })).toBe('&lt;b&gt; for {{signer.name}} &amp; co')
  })

  it('turns markdown from a chat copy button into the same structure', () => {
    const text = [
      '# Business Funding Agreement',
      '',
      'This agreement is between **the Company** and *the Client*.',
      'It starts today.',
      '',
      '## 2. Services',
      '- review the profile;',
      '- submit applications.',
      '',
      '1. First',
      '2. Second',
      '',
      '---',
      '| Term | Detail |',
      '| --- | --- |',
      '| APR | 12 % |',
    ].join('\r\n')

    expect(pastedToHtml({ text })).toBe(
      '<strong>Business Funding Agreement</strong>\n'
      + 'This agreement is between <strong>the Company</strong> and <em>the Client</em>.\nIt starts today.\n\n'
      + '<strong>2. Services</strong>\n'
      + '<ul><li>review the profile;</li><li>submit applications.</li></ul>\n'
      + '<ol><li>First</li><li>Second</li></ol>\n'
      + '<table><thead><tr><th>Term</th><th>Detail</th></tr></thead><tbody><tr><td>APR</td><td>12 %</td></tr></tbody></table>',
    )
  })

  it('leaves plain text as it is, apart from escaping', () => {
    expect(pastedToHtml({ text: 'Clause one\r\nClause 2 < 3' })).toBe('Clause one\nClause 2 &lt; 3')
  })
})
