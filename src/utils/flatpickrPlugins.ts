export const yearDropdownPlugin = (minYear = 1900, maxYear?: number) => {
  const max = maxYear ?? new Date().getFullYear()

  return (fp: any) => {
    const cal = fp.calendarContainer as HTMLElement
    let dropdown: HTMLElement | null = null
    let trigger: HTMLElement | null = null

    const isOpen = () => dropdown?.style.display === 'block'

    const close = () => { if (dropdown) dropdown.style.display = 'none' }

    const positionDropdown = () => {
      if (!dropdown || !trigger) return
      const tRect = trigger.getBoundingClientRect()
      const cRect = cal.getBoundingClientRect()
      dropdown.style.left = (tRect.left - cRect.left) + 'px'
      dropdown.style.top = (tRect.bottom - cRect.top + 2) + 'px'
      dropdown.style.width = tRect.width + 'px'
    }

    const open = () => {
      if (!dropdown) return
      dropdown.style.display = 'block'
      dropdown.querySelectorAll('.fp-yd-active').forEach(el => el.classList.remove('fp-yd-active'))
      const cur = dropdown.querySelector(`[data-year="${fp.currentYear}"]`)
      if (cur) { cur.classList.add('fp-yd-active'); cur.scrollIntoView({ block: 'center' }) }
      positionDropdown()
    }

    const toggle = (e: Event) => {
      e.stopPropagation()
      e.preventDefault()
      isOpen() ? close() : open()
    }

    const build = () => {
      const wrapper = cal.querySelector('.numInputWrapper') as HTMLElement | null
      if (!wrapper) return

      trigger = cal.querySelector('.fp-yd-trigger') as HTMLElement | null
      if (trigger) { trigger.textContent = String(fp.currentYear); return }

      wrapper.classList.add('fp-has-custom-year')
      const input = wrapper.querySelector('input.cur-year') as HTMLElement | null
      if (input) input.style.cssText = 'position:absolute;width:0;height:0;opacity:0;overflow:hidden;border:0;padding:0;margin:0;pointer-events:none'
      wrapper.querySelectorAll<HTMLElement>('span.arrowUp, span.arrowDown').forEach(el => el.style.display = 'none')

      trigger = document.createElement('button')
      ;(trigger as HTMLButtonElement).type = 'button'
      trigger.className = 'fp-yd-trigger'
      trigger.textContent = String(fp.currentYear)
      trigger.addEventListener('click', toggle)
      wrapper.insertBefore(trigger, wrapper.firstChild)

      dropdown = document.createElement('div')
      dropdown.className = 'fp-yd-list'

      for (let y = minYear; y <= max; y++) {
        const row = document.createElement('div')
        row.className = 'fp-yd-opt' + (y === fp.currentYear ? ' fp-yd-active' : '')
        row.dataset.year = String(y)
        row.textContent = String(y)
        row.addEventListener('click', () => {
          fp.changeYear(y)
          trigger!.textContent = String(y)
          close()
        })
        dropdown.appendChild(row)
      }

      cal.appendChild(dropdown)

      cal.addEventListener('click', (e: Event) => {
        if (e.target !== trigger && !dropdown!.contains(e.target as Node)) close()
      })
    }

    return {
      onReady: () => setTimeout(build, 0),
      onOpen: () => setTimeout(build, 0),
      onYearChange: () => {
        const t = cal.querySelector('.fp-yd-trigger') as HTMLElement | null
        if (t) t.textContent = String(fp.currentYear)
        close()
      },
      onClose: close,
    }
  }
}