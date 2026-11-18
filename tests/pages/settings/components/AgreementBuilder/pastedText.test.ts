import { describe, expect, it } from 'vitest'
import { pastedToHtml } from '../../../../../src/pages/settings/components/AgreementBuilder/pastedText'

/**
 * Pasted content keeps the look it had where it was copied from - Word,
 * ChatGPT, Claude, Google Docs or any web page: fonts, sizes, colours, bold,
 * paragraph spacing, alignment, indents and table borders and shading, with
 * Word's class styles applied from its own <style> block.
 *
 * Two things are never kept: anything unsafe (scripts, images, unsafe links,
 * url()/expression styles, layout properties like position), and a dark
 * page's theme - the background of page containers, and near-white text with
 * no background of its own, which would vanish on the white page.
 *
 * Markdown and plain text (an AI chat's Copy button, or a PDF, whose copy
 * holds no formatting at all) become the same structure.
 */
const P = '<p style="margin-top:0;margin-bottom:0.75em">'
const LINK = 'target="_blank" rel="noopener noreferrer"'
const NBSP = ' '

describe('pastedToHtml', () => {
  describe('from Microsoft Word', () => {
    const WORD_STYLES = '<head><style><!-- /* Style Definitions */\n'
      + 'p.MsoNormal, li.MsoNormal, div.MsoNormal {margin-top:0in; margin-bottom:5.0pt; line-height:115%; font-size:9.0pt; font-family:"Aptos",sans-serif; mso-fareast-font-family:Aptos;}\n'
      + 'h1 {mso-style-link:"Heading 1 Char"; margin-top:12.0pt; margin-bottom:4.0pt; font-size:11.0pt; font-family:"Aptos Display",sans-serif; color:#1E2A37; font-weight:bold;}\n'
      + 'p.MsoTitle, li.MsoTitle, div.MsoTitle {margin:0in; font-size:17.0pt; font-family:"Aptos Display",sans-serif; color:#1E2A37; font-weight:bold;}\n'
      + '@page WordSection1 {size:8.5in 11.0in; margin:1.0in;}\ndiv.WordSection1 {page:WordSection1;}\n--></style></head>'

    it("applies Word's class styles: the title, its line, headings, paragraph font and spacing, and coloured text", () => {
      const html = `<html>${WORD_STYLES}<body><!--StartFragment-->`
        + "<div style='mso-element:para-border-div;border:none;border-bottom:solid #4F81BD 1.0pt;padding:0in 0in 4.0pt 0in'><p class=MsoTitle>PARTNER AGREEMENT<o:p></o:p></p></div>"
        + '<h1>1. Purpose<o:p></o:p></h1>'
        + "<p class=MsoNormal><b style='mso-bidi-font-weight:normal'>1.1. Purpose. </b>Company <span style='color:#C00000;mso-themecolor:accent2'>operates</span>.<o:p></o:p></p>"
        + '<!--EndFragment--></body></html>'

      expect(pastedToHtml({ html })).toBe(
        '<div style="border:none;border-bottom:solid #4F81BD 1.0pt;padding:0in 0in 4.0pt 0in">'
        + '<h1 style="margin:0in;font-size:17.0pt;font-family:\'Aptos Display\',sans-serif;color:#1E2A37;font-weight:bold">PARTNER AGREEMENT</h1></div>'
        + '<h2 style="margin-top:12.0pt;margin-bottom:4.0pt;font-size:11.0pt;font-family:\'Aptos Display\',sans-serif;color:#1E2A37;font-weight:bold">1. Purpose</h2>'
        + '<p style="margin-top:0in;margin-bottom:5.0pt;line-height:115%;font-size:9.0pt;font-family:\'Aptos\',sans-serif">'
        + '<strong>1.1. Purpose.</strong> Company <span style="color:#C00000">operates</span>.</p>',
      )
    })

    it('keeps runs of spaces and the empty paragraphs between clauses', () => {
      const run = `<span style='mso-spacerun:yes'>${NBSP}${NBSP}${NBSP}</span>`
      const html = `<p class=MsoNormal>Effective Date: [DATE]${run}|${run}ID: [N]<o:p></o:p></p>`
        + '<p class=MsoNormal><o:p>&nbsp;</o:p></p><p class=MsoNormal>Next.<o:p></o:p></p>'

      expect(pastedToHtml({ html })).toBe(`${P}Effective Date: [DATE]${NBSP.repeat(3)}|${NBSP.repeat(3)}ID: [N]</p>${P}<br></p>${P}Next.</p>`)
    })

    it('keeps a layout table without borders, its paragraphs one per line, with its cell sizes', () => {
      const html = "<table class=MsoNormalTable border=0 cellspacing=0 cellpadding=0 style='border-collapse:collapse;mso-table-layout-alt:fixed'>\n <tr>\n  "
        + "<td width=329 style='width:246.95pt;padding:0in 5.4pt 0in 5.4pt'><p class=MsoNormal><b style='mso-bidi-font-weight:normal'>COMPANY</b><o:p></o:p></p>"
        + '<p class=MsoNormal>Signature: ____<o:p></o:p></p></td>\n </tr>\n</table>'

      expect(pastedToHtml({ html })).toBe('<table class="ab-plain-table" style="border-collapse:collapse"><tbody><tr>'
        + '<td style="width:246.95pt;padding:0in 5.4pt 0in 5.4pt"><strong>COMPANY</strong><br>Signature: ____</td></tr></tbody></table>')
    })

    // The cell takes its paragraphs' size and line height, so its rows are as tall as in Word.
    it("keeps the font and line height of a cell's paragraphs, one per line", () => {
      const html = `<html>${WORD_STYLES}<body><table class=MsoTableGrid border=1><tr><td style='border:solid windowtext 1.0pt'>`
        + "<p class=MsoNormal style='line-height:normal'>Line one<o:p></o:p></p><p class=MsoNormal>Line two<o:p></o:p></p></td></tr></table></body></html>"
      const font = '<span style="font-size:9.0pt;font-family:\'Aptos\',sans-serif">'

      expect(pastedToHtml({ html })).toBe('<table><tbody><tr><td style="border:solid windowtext 1.0pt;line-height:normal;font-size:9.0pt">'
        + `${font}Line one</span><br>${font}Line two</span></td></tr></tbody></table>`)
    })

    it('keeps cell borders, shading and the small font of a table', () => {
      const html = "<table class=MsoTableGrid border=1 cellspacing=0 cellpadding=0><tr>"
        + "<td style='border:solid windowtext 1.0pt;mso-border-alt:solid windowtext .5pt;background:#EDEFF1;padding:0in 5.4pt'>"
        + "<p class=MsoNormal><b><span style='font-size:8.0pt;mso-bidi-font-size:11.0pt'>COMPANY</span></b><o:p></o:p></p></td></tr></table>"

      expect(pastedToHtml({ html })).toBe('<table><tbody><tr><td style="border:solid windowtext 1.0pt;background-color:#EDEFF1;padding:0in 5.4pt">'
        + '<strong><span style="font-size:8.0pt">COMPANY</span></strong></td></tr></tbody></table>')
    })
  })

  describe('from ChatGPT, Claude or a web page', () => {
    it("keeps the source's fonts, sizes, colours and spacing", () => {
      const html = '<p style="color:rgb(13, 13, 13);font-size:16px;font-family:Söhne, ui-sans-serif">x <span style="color:#c00000;background-color:#ffff00">red</span></p>'

      expect(pastedToHtml({ html })).toBe('<p style="color:rgb(13, 13, 13);font-size:16px;font-family:Söhne, ui-sans-serif;margin-top:0;margin-bottom:0.75em">'
        + 'x <span style="color:#c00000;background-color:#ffff00">red</span></p>')
    })

    it("drops a dark page's background and the white text that would vanish without it, but keeps a code block's own colours", () => {
      const html = '<div style="background-color:#212121;color:#ececec">'
        + '<h2 style="font-size:20px;font-weight:600;color:#ffffff;margin:16px 0 8px">1. Purpose</h2>'
        + '<p style="color:#ececec;margin:0 0 12px">The <strong style="font-weight:600">Company</strong> helps.</p>'
        + '<pre style="background-color:#0d0d0d;color:#f8f8f2;padding:8px"><code>a = 1</code></pre></div>'

      expect(pastedToHtml({ html })).toBe('<h2 style="font-size:20px;font-weight:600;margin:16px 0 8px">1. Purpose</h2>'
        + '<p style="margin:0 0 12px">The <strong style="font-weight:600">Company</strong> helps.</p>'
        + '<pre style="background-color:#0d0d0d;color:#f8f8f2;padding:8px">a = 1</pre>')
    })

    it('keeps the inline styles Google Docs gives, without the bold wrapper it puts around a whole copy', () => {
      const html = '<b style="font-weight:normal;" id="docs-internal-guid-1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;">'
        + '<span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;font-weight:700;">Bold</span></p></b>'

      expect(pastedToHtml({ html })).toBe('<p style="line-height:1.38;margin-top:0pt;margin-bottom:0pt">'
        + '<span style="font-size:11pt;font-family:Arial,sans-serif;color:#000000;font-weight:700">Bold</span></p>')
    })

    it('keeps alignment given by attribute, and old <font> colours and faces', () => {
      expect(pastedToHtml({ html: '<p align="center"><font color="#c00000" face="Georgia">Title</font></p>' }))
        .toBe('<p style="text-align:center;margin-top:0;margin-bottom:0.75em"><span style="color:#c00000;font-family:Georgia">Title</span></p>')
    })

    it('keeps headings, lists without the paragraphs a chat puts in each item, and nested lists', () => {
      const html = '<h1>A</h1><h3>B</h3><h6>C</h6><ul><li><p>give info;</p></li><li>use funds.<ol><li>a</li></ol></li></ul>'

      expect(pastedToHtml({ html })).toBe('<h1>A</h1><h3>B</h3><h4>C</h4><ul><li>give info;</li><li>use funds.<ol><li>a</li></ol></li></ul>')
    })

    it('keeps tables cell by cell', () => {
      const html = '<table class="t"><thead><tr><th>Term</th><th>Detail</th></tr></thead><tbody><tr><td><p>APR</p></td><td>12 %</td></tr></tbody></table>'

      expect(pastedToHtml({ html })).toBe('<table><thead><tr><th>Term</th><th>Detail</th></tr></thead><tbody><tr><td>APR</td><td>12 %</td></tr></tbody></table>')
    })

    it('keeps strikethrough, superscript, subscript, code, quotes, lines and code blocks', () => {
      const html = '<p>Rate <del>10%</del> 8%<sup>1</sup> H<sub>2</sub>O <code class="x">npm</code>.</p>'
        + '<blockquote><p>Q1.</p><p>Q2.</p></blockquote><hr><pre><code class="language-js">a\nb</code></pre>'

      expect(pastedToHtml({ html })).toBe(`${P}Rate <s>10%</s> 8%<sup>1</sup> H<sub>2</sub>O <code>npm</code>.</p>`
        + `<blockquote>${P}Q1.</p>${P}Q2.</p></blockquote><hr><pre>a\nb</pre>`)
    })

    it('keeps web, email and phone links, with their colour', () => {
      const html = '<p>See <a href="https://example.com/t?a=1&amp;b=2" style="color:#06c" class="x">terms</a> or <a href="mailto:help@example.com">mail</a>.</p>'

      expect(pastedToHtml({ html })).toBe(`${P}See <a href="https://example.com/t?a=1&amp;b=2" ${LINK} style="color:#06c">terms</a> or <a href="mailto:help@example.com" ${LINK}>mail</a>.</p>`)
    })

    it('drops scripts, images, buttons, unsafe links and unsafe or layout styles', () => {
      const html = '<style>p{color:red}</style><p style="position:fixed;background:url(javascript:alert(1));width:9999px;color:#333">'
        + 'See <a href="javascript:alert(1)" onclick="x()">our terms</a> <a href="/relative">this</a><img src="x" onerror="alert(1)"><script>alert(1)</script><button>Copy</button></p>'

      expect(pastedToHtml({ html })).toBe('<p style="color:#333;margin-top:0;margin-bottom:0.75em">See our terms this</p>')
    })

    it('escapes text that looks like markup, and keeps merge fields', () => {
      expect(pastedToHtml({ html: '<p>&lt;b&gt; for {{signer.name}} &amp; co</p>' })).toBe(`${P}&lt;b&gt; for {{signer.name}} &amp; co</p>`)
    })
  })

  describe('from markdown or plain text (a chat Copy button, or a PDF)', () => {
    it('turns markdown into the same structure', () => {
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
        '---',
        '| Term | Detail |',
        '| --- | --- |',
        '| APR | 12 % |',
      ].join('\r\n')

      expect(pastedToHtml({ text })).toBe(
        '<h1>Business Funding Agreement</h1>'
        + `${P}This agreement is between <strong>the Company</strong> and <em>the Client</em>.<br>It starts today.</p>`
        + '<h2>2. Services</h2><ul><li>review the profile;</li><li>submit applications.</li></ul><hr>'
        + '<table><thead><tr><th>Term</th><th>Detail</th></tr></thead><tbody><tr><td>APR</td><td>12 %</td></tr></tbody></table>',
      )
    })

    it('turns markdown links, strikethrough, code, quotes and code fences into the same structure', () => {
      const text = [
        'See [the terms](https://example.com/t?a=1&b=2) and ~~old~~ `code`.',
        '',
        '> Quoted',
        '> more',
        '',
        '```js',
        'line 1',
        'line 2',
        '```',
        '',
        '[bad](javascript:alert(1))',
      ].join('\n')

      expect(pastedToHtml({ text })).toBe(
        `${P}See <a href="https://example.com/t?a=1&amp;b=2" ${LINK}>the terms</a> and <s>old</s> <code>code</code>.</p>`
        + `<blockquote>${P}Quoted<br>more</p></blockquote><pre>line 1\nline 2</pre>${P}bad</p>`,
      )
    })

    it("keeps a PDF's lines and paragraphs as they were copied, apart from escaping", () => {
      expect(pastedToHtml({ text: 'Clause one\r\nClause 2 < 3\r\n\r\nNext paragraph' })).toBe(`${P}Clause one<br>Clause 2 &lt; 3</p>${P}Next paragraph</p>`)
    })
  })
})
