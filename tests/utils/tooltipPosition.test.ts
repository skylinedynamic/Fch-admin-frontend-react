import { describe, expect, it } from 'vitest'
import { placeTooltip, TOOLTIP_GAP, TOOLTIP_MARGIN } from '../../src/utils/tooltipPosition'

/**
 * Defect: the Funding Sequence card's "Failed Requirements" tooltip was always
 * centred above its card by CSS alone. A tall one (many failed requirements)
 * ran up over the filter bar and the tabs and out of the window, and near an
 * edge it was cut off. It is now placed where it fits, kept in the window, and
 * its arrow still points at the card.
 */
const viewport = { width: 1366, height: 900 }
const card = (top: number, left = 500, width = 290, height = 300) => ({ top, left, width, height, bottom: top + height, right: left + width })

describe('placeTooltip', () => {
  it('sits above the card, centred on it, when it fits there', () => {
    const p = placeTooltip(card(500), { width: 320, height: 200 }, viewport)

    expect(p.placement).toBe('top')
    expect(p.top).toBe(500 - TOOLTIP_GAP - 200)
    expect(p.left).toBe(500 + 145 - 160)
    expect(p.arrowLeft).toBe(160)
    expect(p.maxHeight).toBeUndefined()
  })

  it('goes below the card when there is no room above', () => {
    const p = placeTooltip(card(120), { width: 320, height: 420 }, viewport)

    expect(p.placement).toBe('bottom')
    expect(p.top).toBe(120 + 300 + TOOLTIP_GAP)
  })

  /**
   * Defect: a tall tooltip that fitted neither above nor below its card was cut
   * to the room below and scrolled, so part of the list was hidden. It now
   * opens beside the card, in full, wherever that fits.
   */
  it('opens to the right of the card, in full, when it fits neither above nor below', () => {
    const p = placeTooltip(card(300, 500, 290, 200), { width: 320, height: 700 }, viewport)

    expect(p.placement).toBe('right')
    expect(p.left).toBe(500 + 290 + TOOLTIP_GAP)
    expect(p.maxHeight).toBeUndefined()
    // Centred on the card, then kept inside the window.
    expect(p.top).toBe(Math.min(Math.max(300 + 100 - 350, TOOLTIP_MARGIN), viewport.height - TOOLTIP_MARGIN - 700))
    // The arrow points at the card's middle.
    expect(p.top + p.arrowTop!).toBe(300 + 100)
  })

  it('opens to the left when there is no room on the right', () => {
    const p = placeTooltip(card(300, 1000, 290, 200), { width: 320, height: 700 }, viewport)

    expect(p.placement).toBe('left')
    expect(p.left).toBe(1000 - TOOLTIP_GAP - 320)
    expect(p.maxHeight).toBeUndefined()
    expect(p.top + p.arrowTop!).toBe(300 + 100)
  })

  it('opens beside a card near the bottom of the window (as on the client profile)', () => {
    // Card's top scrolled out of view, window 750 px high: no room above or below.
    const p = placeTooltip(card(-80, 230, 290, 300), { width: 320, height: 520 }, { width: 950, height: 750 })

    expect(p.placement).toBe('right')
    expect(p.maxHeight).toBeUndefined()
    expect(p.top).toBeGreaterThanOrEqual(TOOLTIP_MARGIN)
    expect(p.top + 520).toBeLessThanOrEqual(750 - TOOLTIP_MARGIN)
  })

  it('scrolls only when the window is too small for it anywhere', () => {
    const small = { width: 700, height: 500 }
    const p = placeTooltip(card(150, 200, 300, 200), { width: 320, height: 700 }, small)

    // 132 px above, 132 px below, no side room: below, capped to what is there.
    expect(['top', 'bottom']).toContain(p.placement)
    expect(p.maxHeight).toBeGreaterThan(0)
    expect(p.maxHeight).toBeLessThan(700)
  })

  it('stays inside the window beside the right edge, with the arrow still on the card', () => {
    const p = placeTooltip(card(500, 1200, 150), { width: 320, height: 200 }, viewport)

    expect(p.left).toBe(viewport.width - TOOLTIP_MARGIN - 320)
    expect(p.left + p.arrowLeft!).toBe(1200 + 75)
  })

  it('stays inside the window beside the left edge, with the arrow still on the card', () => {
    const p = placeTooltip(card(500, 0, 100), { width: 320, height: 200 }, viewport)

    expect(p.left).toBe(TOOLTIP_MARGIN)
    expect(p.left + p.arrowLeft!).toBe(50)
  })

  it('never puts the arrow past the rounded corners', () => {
    const p = placeTooltip(card(500, -200, 210), { width: 320, height: 200 }, viewport)

    expect(p.arrowLeft).toBeGreaterThanOrEqual(16)
    expect(p.arrowLeft).toBeLessThanOrEqual(320 - 16)
  })
})
