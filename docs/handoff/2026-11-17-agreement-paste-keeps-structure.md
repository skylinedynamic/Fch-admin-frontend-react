# Agreement editor: pasted content keeps the look of its source

Date: 2026-11-17

## Problem

In Settings › Agreement Builder, text pasted into a text block lost its formatting. The paste handler (`pastedText.ts`) reduced everything to bold, italic, underline, lists, tables and line breaks, and stripped every font, size and colour:
- **Headings** became plain bold text. A heading pasted after existing text ran on to the same line.
- **Links, quotes, horizontal lines, code and strikethrough** were lost.
- **From Microsoft Word** (checked with the real clipboard HTML of `partner_agreement.docx` and `partner_agreement_with_logo.docx`, captured read-only through Word):
  - Every bold clause label lost its bold. The Google Docs "not bold" rule matched Word's `mso-bidi-font-weight:normal`, and the label's trailing space was cut.
  - The Title (`<p class=MsoTitle>`) became plain text.
  - Runs of spaces collapsed to one.
  - Border-less signature tables got borders.
  - Table heading rows lost their shading.
  - Word's fonts, sizes, colours and paragraph spacing were all dropped.

## Decisions (2026-11-17, in this order)

1. **Keep structure, in the agreement's own look.** Superseded.
2. **Keep the source's exact look** for Word, ChatGPT, Claude, PDF, "anywhere". This is the current rule.

## Solution

`pastedText.ts` was rewritten. Pasted HTML keeps the look it had in its source:
- **Text:** fonts, sizes, colours, highlights.
- **Paragraphs:** bold and italic, paragraph spacing (margins), line height, alignment (`text-align`, or `align=`), indents.
- **Tables:** cell borders, shading, padding and widths.
- **Structure:** headings, links, quotes, horizontal lines, code, strikethrough, sub/superscript, nested lists.
- **Old `<font>` markup:** its colour and face are kept.

**Word's class styles:** Word gives most of its look by class (`MsoNormal`, `MsoTitle`, `h1`). The rules in the clipboard's own `<style>` blocks are read, using simple selectors (`tag`, `.class`, `tag.class`, by specificity). Each element gets its class style plus its inline style.

**Word specifics:**
- The Title becomes `<h1>` and Word's headings move one level down.
- Non-breaking-space runs are kept.
- An empty paragraph keeps its line.
- A table with `border="0"` and no cell borders gets `class="ab-plain-table"`, drawn without borders.

**List items and table cells:** their paragraphs become lines joined by `<br>`. Each line keeps its font, and the cell takes the paragraph's font size and line height, so rows are as tall as in Word.

**A paragraph with no spacing of its own** (markdown, plain text, bare HTML) gets `margin-top:0;margin-bottom:0.75em`. Existing `<p>` content in templates is not touched.

**Never kept:**
- **Anything unsafe:**
  - scripts, images, embeds and buttons
  - links other than `http(s)`, `mailto` and `tel`
  - style values with `url()`, `expression()`, `javascript:` or `var()`
  - every property outside an allowlist, which covers text, box, border and cell properties, and so excludes `position`, `display`, `float` and heights
  - `mso-*` properties
- **A dark-mode page's theme:**
  - The background of page containers (`div`, `section`, …) is dropped. Backgrounds on text, cells, code and paragraphs stay.
  - Near-white text (luminance > 0.85) with no background under it is dropped, because it would be invisible on the white page.

  So a dark ChatGPT or Claude copy keeps its fonts and sizes but not its black page and white text. A code block keeps its own dark background and light text.

**PDF:** Chrome and Edge put only plain text on the clipboard when copying from a PDF, with no formatting at all. It goes through the markdown/plain path: lines and paragraphs stay, but bold, fonts and tables cannot be recovered. This limit comes from the clipboard, not the code.

**Logo in `partner_agreement_with_logo.docx`:** the logo is in Word's page header. Word's body copy holds no header, footer or image, so the logo never reaches the editor. Add it with the **Company Logo** block.

**CSS:** `PREVIEW_CSS` (`utils.ts`, used by the saved page, signing page and PDF) and `.ab4-editor` (`assets/css/agreement-builder.css`, the canvas) style the new elements for when the source gave no look of its own:
- h1–h4 sizes in `em`
- blockquote, hr, code, pre and links
- `table.ab-plain-table` without borders (the canvas shows a faint dashed cell guide)

## Files changed

- `src/pages/settings/components/AgreementBuilder/pastedText.ts`: rewritten as described above. It has two paths:
  - HTML: walker with style resolution and the allowlist
  - markdown/plain text: converted to HTML, then the same walker
- `src/pages/settings/components/AgreementBuilder/utils.ts`: `PREVIEW_CSS` for h1–h4, blockquote, hr, code, pre, a and `ab-plain-table`.
- `assets/css/agreement-builder.css`: the same for the canvas.
- `tests/pages/settings/components/AgreementBuilder/pastedText.test.ts`: rewritten, 18 cases:
  - **Word:** class styles with the title and its line, spaces and empty paragraphs, the layout table, cell font and line height, borders and shading.
  - **Chat and web:** source fonts and colours, the dark-mode theme dropped with code colours kept, Google Docs, `align=` and `<font>`, headings and lists, tables, inline and quote/hr/pre, links, unsafe content, escaping.
  - **Markdown, plain text and PDF.**
- `tests/pages/settings/components/AgreementBuilder/TextBlock.longText.test.tsx`: paste expectations now keep the source styles.
- `tests/pages/settings/components/AgreementBuilder/utils.test.ts`: `PREVIEW_CSS` styles each new element.
- `e2e/sidebar/settings/agreement-builder.spec.ts`: two paste tests.
  - A dark-mode chat answer keeps its font (Söhne) and size (24px), but not its white text or `#212121` page. Its link colour is kept.
  - A Word document keeps its title with Word's line under it, headings, the bold label and the border-less table.

## Testing

- **Seen failing first:**
  - against the previous implementation, 16 of the 17 rewritten `pastedText` cases
  - the cell-font case, and the cell line-height case
- **After the fix:**
  - Vitest `tests/pages/settings/components/AgreementBuilder`: 210 passed
  - `npm run typecheck`: clean
  - Playwright `agreement-builder.spec.ts` (mock project, after `npm run build`): 22 passed
- **Compared by eye:** both real Word copies were run through the new code and screenshotted next to Word's own rendering of the same clipboard HTML. They match:
  - title size and its blue line
  - 9pt Aptos body in `#23282E`
  - heading sizes and colour
  - bordered tables with shaded heading rows and compact rows
  - the border-less signature table

  Line wraps differ only because the agreement page is narrower than Word's.

## Open items

- **Fonts not installed:** a font missing on the viewer's machine, or in dompdf for the PDF (e.g. Aptos, Söhne), falls back to the stack's next font. dompdf only has its own core fonts.
- **The signed PDF** (dompdf, fch-api) has not been generated and checked by eye with pasted Word content.
- **Markdown nested lists** (indented `-` items) are read as one flat list. HTML nested lists are kept.
- **Pasted content is larger:** with styles kept, Word content repeats its font on every line and cell.
