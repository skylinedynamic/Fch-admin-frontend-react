import { describe, expect, it } from 'vitest'
import { containWheel } from '../../src/utils/containWheel'

const wheel = (el: HTMLElement, deltaY: number, deltaMode = 0) => {
  const event = new WheelEvent('wheel', { deltaY, deltaMode, bubbles: true, cancelable: true })
  el.dispatchEvent(event)
  return event
}

describe('containWheel', () => {
  it('keeps a wheel over the element from scrolling the page behind it', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    containWheel(el)

    expect(wheel(el, 120).defaultPrevented).toBe(true)
  })

  it('scrolls the element itself by the wheel distance, in pixels or lines', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    containWheel(el)

    wheel(el, 50)
    expect(el.scrollTop).toBe(50)

    wheel(el, 2, 1) // two lines
    expect(el.scrollTop).toBe(50 + 2 * 16)
  })

  it('returns a function that removes the handling again', () => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    const release = containWheel(el)

    release()

    expect(wheel(el, 120).defaultPrevented).toBe(false)
  })
})
