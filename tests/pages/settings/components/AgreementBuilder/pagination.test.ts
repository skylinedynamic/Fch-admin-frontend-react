import { describe, expect, it } from 'vitest'
import { planPages, type PageItem } from '../../../../../src/pages/settings/components/AgreementBuilder/pagination'

const USABLE = 1000

/** A text block of `lines` lines, each `lineH` tall with no gap between them. */
const text = (lines: number, lineH = 20, extra: Partial<PageItem> = {}): PageItem => ({
  height: lines * lineH,
  marginTop: 0,
  marginBottom: 0,
  boxes: Array.from({ length: lines }, (_, i) => ({ top: i * lineH, bottom: (i + 1) * lineH })),
  ...extra,
})
const solid = (height: number, extra: Partial<PageItem> = {}): PageItem => ({ height, marginTop: 0, marginBottom: 0, boxes: null, ...extra })

const shape = (pages: ReturnType<typeof planPages>) =>
  pages.map((page) => page.map((e) => `${e.index}${e.isSplit ? `[${e.clipTop}+${e.clipHeight}]` : ''}`).join(' '))

describe('planPages', () => {
  it('keeps blocks that fit on one page', () => {
    expect(shape(planPages([solid(300), text(10), solid(200)], USABLE))).toEqual(['0 1 2'])
  })

  it('splits a text block between lines to fill the rest of the page instead of leaving a gap', () => {
    const pages = planPages([solid(900), text(10)], USABLE)

    expect(shape(pages)).toEqual(['0 1[0+100]', '1[100+100]'])
  })

  it('moves a block that cannot be split to the next page', () => {
    expect(shape(planPages([solid(900), solid(200)], USABLE))).toEqual(['0', '1'])
  })

  it('keeps a heading with the first line of the text after it', () => {
    const heading = solid(30, { keepWithNext: true })

    expect(shape(planPages([solid(960), heading, text(5)], USABLE))).toEqual(['0', '1 2'])
  })

  it('leaves a heading where it is when the first line after it still fits', () => {
    const heading = solid(30, { keepWithNext: true })

    expect(shape(planPages([solid(900), heading, text(5)], USABLE))).toEqual(['0 1 2[0+60]', '2[60+40]'])
  })

  it('starts a new page after a page break', () => {
    expect(shape(planPages([solid(100), solid(0, { pageBreak: true }), solid(100)], USABLE))).toEqual(['0 1', '2'])
  })

  it('flows a very long block over several pages without losing or repeating any of it', () => {
    const pages = planPages([solid(500), text(120)], USABLE)
    const slices = pages.flat().filter((e) => e.index === 1)

    expect(pages).toHaveLength(3)
    expect(slices[0].clipTop).toBe(0)
    for (let i = 1; i < slices.length; i++) expect(slices[i].clipTop).toBe(slices[i - 1].clipTop + slices[i - 1].clipHeight)
    expect(slices.reduce((sum, s) => sum + s.clipHeight, 0)).toBe(2400)
    slices.forEach((s) => expect(s.clipHeight).toBeLessThanOrEqual(USABLE))
  })

  it('cuts in the middle of the gap between lines, never through a line', () => {
    const spaced: PageItem = { height: 300, marginTop: 0, marginBottom: 0, boxes: [{ top: 0, bottom: 90 }, { top: 110, bottom: 200 }, { top: 210, bottom: 300 }] }

    expect(shape(planPages([solid(850), spaced], USABLE))).toEqual(['0 1[0+100]', '1[100+200]'])
  })

  it('cuts a block taller than a page that has no lines to cut between at the page edge', () => {
    expect(shape(planPages([solid(2200)], USABLE))).toEqual(['0[0+1000]', '0[1000+1000]', '0[2000+200]'])
  })

  it('counts collapsed margins between blocks but not at the top of a page', () => {
    // 950 + max(10, 5) + 40 = 1000: fits exactly.
    expect(shape(planPages([solid(950, { marginBottom: 10 }), solid(40, { marginTop: 5 })], USABLE))).toEqual(['0 1'])
    // 940 + max(30, 20) + 40 = 1010: over. On the next page the top margin is dropped, so 960 + 40 fits.
    expect(shape(planPages([solid(940, { marginBottom: 30 }), solid(40, { marginTop: 20 }), solid(960)], USABLE))).toEqual(['0', '1 2'])
  })
})
