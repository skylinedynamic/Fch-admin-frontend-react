import { describe, expect, it } from 'vitest'
import { buildEmbedSnippet, buildEmbedUrl } from '../../src/utils/embedSnippet'
import { DEFAULT_EMBED_OPTIONS, EMBED_HEIGHT, EMBED_RADIUS_MAX } from '../../src/config/embedFormDisplay'

const FORM = 'https://forms.fcf.test/form/pk_live_abc123'
const SCRIPT = 'https://forms.fcf.test/form/assets/embed.js'

describe('buildEmbedUrl', () => {
  it('keeps the plain link when nothing differs from the defaults', () => {
    expect(buildEmbedUrl(FORM, DEFAULT_EMBED_OPTIONS)).toBe(FORM)
  })

  it('adds only the options that differ', () => {
    const url = buildEmbedUrl(FORM, { ...DEFAULT_EMBED_OPTIONS, header: false, background: 'transparent', frame: false })

    expect(url).toBe(`${FORM}?header=0&bg=transparent&frame=0`)
  })

  it('leaves a link it cannot read as it is', () => {
    expect(buildEmbedUrl('not a url', { ...DEFAULT_EMBED_OPTIONS, header: false })).toBe('not a url')
  })
})

describe('buildEmbedSnippet', () => {
  it('with automatic height, marks the iframe and adds the script', () => {
    const code = buildEmbedSnippet(FORM, SCRIPT, { ...DEFAULT_EMBED_OPTIONS, autoHeight: true, radius: 8 }, 'Apply')

    expect(code).toBe(
      `<iframe src="${FORM}" data-fch-embed width="100%" height="${EMBED_HEIGHT.DEFAULT}" frameborder="0" style="border:none;border-radius:8px;" title="Apply"></iframe>\n`
      + `<script src="${SCRIPT}" async></script>`,
    )
  })

  it('with a fixed height, has no script', () => {
    const code = buildEmbedSnippet(FORM, SCRIPT, { ...DEFAULT_EMBED_OPTIONS, autoHeight: false, height: 950 })

    expect(code).toContain('height="950"')
    expect(code).not.toContain('<script')
    expect(code).not.toContain('data-fch-embed')
  })

  it('without a script address, falls back to the fixed height', () => {
    const code = buildEmbedSnippet(FORM, null, { ...DEFAULT_EMBED_OPTIONS, autoHeight: true })

    expect(code).not.toContain('<script')
    expect(code).toContain(`height="${EMBED_HEIGHT.DEFAULT}"`)
  })

  it('keeps the height and corner radius in bounds', () => {
    const tall = buildEmbedSnippet(FORM, null, { ...DEFAULT_EMBED_OPTIONS, autoHeight: false, height: 99999, radius: 300 })
    const short = buildEmbedSnippet(FORM, null, { ...DEFAULT_EMBED_OPTIONS, autoHeight: false, height: 5, radius: -4 })

    expect(tall).toContain(`height="${EMBED_HEIGHT.MAX}"`)
    expect(tall).toContain(`border-radius:${EMBED_RADIUS_MAX}px`)
    expect(short).toContain(`height="${EMBED_HEIGHT.MIN}"`)
    expect(short).toContain('border-radius:0px')
  })

  it('escapes what goes into an attribute', () => {
    const code = buildEmbedSnippet(`${FORM}?x="y"`, null, DEFAULT_EMBED_OPTIONS, 'A "quoted" <title>')

    expect(code).toContain('&quot;quoted&quot; &lt;title&gt;')
    expect(code).not.toContain('"y"')
  })

  it('separates the options with &amp; in the markup', () => {
    const code = buildEmbedSnippet(FORM, null, { ...DEFAULT_EMBED_OPTIONS, header: false, footer: false })

    expect(code).toContain(`src="${FORM}?header=0&amp;footer=0"`)
  })
})

describe('buildEmbedUrl › colour-code background', () => {
  it('sends the colour code without the #', () => {
    const url = buildEmbedUrl(FORM, { ...DEFAULT_EMBED_OPTIONS, background: 'custom', backgroundColor: '#F5F7FA' })

    expect(url).toBe(`${FORM}?bg=f5f7fa`)
  })

  it('leaves an unreadable colour out, so the form keeps its default', () => {
    for (const backgroundColor of ['', '#abc', 'red', '#12345g', '#1a2b3c;x']) {
      expect(buildEmbedUrl(FORM, { ...DEFAULT_EMBED_OPTIONS, background: 'custom', backgroundColor })).toBe(FORM)
    }
  })
})

describe('buildEmbedUrl › primary colour', () => {
  it('sends the primary colour without the #, only when one is chosen', () => {
    expect(buildEmbedUrl(FORM, { ...DEFAULT_EMBED_OPTIONS, primaryColor: '#2D9A96' })).toBe(`${FORM}?color=2d9a96`)
    expect(buildEmbedUrl(FORM, { ...DEFAULT_EMBED_OPTIONS, primaryColor: '' })).toBe(FORM)
  })

  it('leaves an unreadable colour out, so the form keeps the brand colour', () => {
    for (const primaryColor of ['#abc', 'teal', '#2d9a9g']) {
      expect(buildEmbedUrl(FORM, { ...DEFAULT_EMBED_OPTIONS, primaryColor })).toBe(FORM)
    }
  })
})
