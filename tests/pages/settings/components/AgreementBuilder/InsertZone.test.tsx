import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { InsertZone } from '../../../../../src/pages/settings/components/AgreementBuilder/BlockComponents'

/**
 * Agreement Builder › the + between blocks opens a menu of blocks. Each A4 page
 * cuts off whatever runs past its edge, so the menu opens towards the side of
 * the page (and window) with room for it - not only by the window's height.
 * Defect: near the bottom of a page it opened downwards and was cut off.
 */

type Rect = Partial<DOMRect>
let rects: Record<string, Rect> = {}

const rectFor = (el: Element): DOMRect => {
  const key = Object.keys(rects).find((cls) => el.classList.contains(cls))
  const r = { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, ...(key ? rects[key] : {}) }
  return { ...r, toJSON: () => r } as DOMRect
}

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) { return rectFor(this) })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 2000 })
})
afterEach(() => { vi.restoreAllMocks(); rects = {} })

const openMenu = (onInsert = vi.fn()) => {
  const { container } = render(<div className="ab4-doc"><InsertZone onInsert={onInsert} /></div>)
  const zone = container.querySelector('.ab4-iz') as HTMLElement
  fireEvent.mouseEnter(zone)
  fireEvent.click(zone.querySelector('.ab4-iz-btn') as HTMLElement)
  return { picker: zone.querySelector('.ab4-iz-picker') as HTMLElement, onInsert }
}

describe('InsertZone menu', () => {
  it('opens upwards near the bottom of a page, even with room left in the window', () => {
    rects = { 'ab4-doc': { top: 0, bottom: 1122 }, 'ab4-iz': { top: 1040, bottom: 1040 }, 'ab4-iz-picker': { height: 330 } }

    const { picker } = openMenu()

    expect(picker.style.bottom).toBe('calc(100% + 8px)')
  })

  it('opens downwards when the page has room below', () => {
    rects = { 'ab4-doc': { top: 0, bottom: 1122 }, 'ab4-iz': { top: 200, bottom: 200 }, 'ab4-iz-picker': { height: 330 } }

    const { picker } = openMenu()

    expect(picker.style.bottom).toBe('')
  })

  it('opens upwards near the bottom of the window, inside a long page', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 })
    rects = { 'ab4-doc': { top: 0, bottom: 1122 }, 'ab4-iz': { top: 700, bottom: 700 }, 'ab4-iz-picker': { height: 330 } }

    const { picker } = openMenu()

    expect(picker.style.bottom).toBe('calc(100% + 8px)')
  })

  it('adds the block picked, a page break among them', () => {
    rects = { 'ab4-doc': { top: 0, bottom: 1122 }, 'ab4-iz': { top: 1040, bottom: 1040 }, 'ab4-iz-picker': { height: 330 } }

    const { picker, onInsert } = openMenu()
    fireEvent.click(within(picker).getByRole('button', { name: 'Page Break' }))

    expect(onInsert).toHaveBeenCalledWith('page-break')
    expect(screen.queryByText('Page Break')).not.toBeInTheDocument()
  })
})
