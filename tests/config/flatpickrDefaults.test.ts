import { afterEach, describe, expect, it, vi } from 'vitest'
import flatpickr from 'flatpickr'
import { applyFlatpickrDefaults } from '../../src/config/flatpickrDefaults'

const PHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

describe('applyFlatpickrDefaults', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('a picker opened on a phone shows the app calendar, not the browser native date picker', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(PHONE)
    applyFlatpickrDefaults()

    const input = document.body.appendChild(document.createElement('input'))
    const fp = flatpickr(input, {}) as flatpickr.Instance

    expect(fp.isMobile).toBe(false)
    expect(fp.mobileInput).toBeUndefined()
    expect(fp.calendarContainer).toBeInstanceOf(HTMLElement)
    fp.destroy()
  })
})
