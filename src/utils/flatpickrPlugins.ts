import type { Instance } from 'flatpickr/dist/types/instance'
import { containWheel } from './containWheel'

/**
 * Month and year dropdown plugin for Flatpickr.
 *
 * Replaces Flatpickr's native month <select> and typeable year box with two
 * identical button-and-list dropdowns, so both share one look - including the
 * hover and selected colours, which a native <select> does not let CSS style.
 * The year list runs from `minYear` to `maxYear` (default: the current year),
 * narrowed to the picker's own minDate/maxDate; the month list offers exactly
 * the months Flatpickr itself allows for the year on screen. Styled by the
 * `.fp-yd-*` rules in assets/css/custom.min.css.
 *
 * The borrower (client-fch) and partner (Fch-admin-frontend-react) portals
 * carry identical copies of this file; keep the two in sync.
 */
const OPEN_CLASS = 'fp-yd-open'

type Kind = 'month' | 'year'

interface Item {
  value: string
  label: string
}

interface Dropdown {
  kind: Kind
  trigger: HTMLButtonElement
  list: HTMLElement
  close: () => void
  refresh: () => void
}

export const yearDropdownPlugin = (minYear = 1900, maxYear?: number) => {
  return (fp: Instance) => {
    const cal = () => fp.calendarContainer as HTMLElement | undefined
    let dropdowns: Dropdown[] = []
    let observer: MutationObserver | null = null

    const closeAll = () => dropdowns.forEach(d => d.close())
    const refreshAll = () => dropdowns.forEach(d => d.refresh())

    const yearItems = (): Item[] => {
      let lo = minYear
      let hi = maxYear ?? new Date().getFullYear()
      if (fp.config.minDate) lo = Math.max(lo, fp.config.minDate.getFullYear())
      if (fp.config.maxDate) hi = Math.min(hi, fp.config.maxDate.getFullYear())
      // Never hide the year already on screen, whatever the range says.
      lo = Math.min(lo, fp.currentYear)
      hi = Math.max(hi, fp.currentYear)

      const items: Item[] = []
      for (let y = lo; y <= hi; y++) items.push({ value: String(y), label: String(y) })
      return items
    }

    // Flatpickr rebuilds its own <select> per year with only the allowed
    // months, so the list is read from it rather than recomputed here.
    const monthSelect = () =>
      cal()?.querySelector<HTMLSelectElement>('select.flatpickr-monthDropdown-months') ?? null

    const monthItems = (): Item[] =>
      Array.from(monthSelect()?.options ?? []).map(o => ({ value: o.value, label: o.textContent ?? '' }))

    const monthLabel = () =>
      fp.l10n.months[fp.config.shorthandCurrentMonth ? 'shorthand' : 'longhand'][fp.currentMonth]

    const createDropdown = (
      kind: Kind,
      container: HTMLElement,
      getItems: () => Item[],
      getCurrent: () => string,
      getLabel: () => string,
      pick: (value: string) => void,
    ): Dropdown => {
      const trigger = document.createElement('button')
      trigger.type = 'button'
      trigger.className = 'fp-yd-trigger'
      trigger.dataset.kind = kind
      trigger.setAttribute('aria-haspopup', 'listbox')
      trigger.setAttribute('aria-label', kind === 'month' ? 'Month' : 'Year')

      const list = document.createElement('div')
      list.className = 'fp-yd-list'
      list.dataset.kind = kind
      list.setAttribute('role', 'listbox')
      // Lives as long as the list, which goes with the calendar.
      containWheel(list)

      const render = () => {
        list.innerHTML = ''
        const current = getCurrent()
        getItems().forEach(item => {
          const row = document.createElement('div')
          row.className = 'fp-yd-opt' + (item.value === current ? ' fp-yd-active' : '')
          row.dataset.value = item.value
          row.setAttribute('role', 'option')
          row.textContent = item.label
          row.addEventListener('click', e => {
            e.stopPropagation()
            pick(item.value)
            dropdown.close()
            refreshAll()
          })
          list.appendChild(row)
        })
      }

      const position = () => {
        const tRect = trigger.getBoundingClientRect()
        const cRect = container.getBoundingClientRect()
        list.style.left = (tRect.left - cRect.left) + 'px'
        list.style.top = (tRect.bottom - cRect.top + 2) + 'px'
        list.style.width = tRect.width + 'px'
      }

      // Toggled by class, not inline style: the stylesheet hides the list with
      // display:none !important, which an inline display:block cannot override.
      const open = () => {
        closeAll()
        render()
        list.classList.add(OPEN_CLASS)
        trigger.setAttribute('aria-expanded', 'true')
        position()
        // Centre the selected option by scrolling the list itself. Not
        // scrollIntoView(): that scrolls every scrollable ancestor too, which
        // threw the page behind a modal down to the bottom.
        const active = list.querySelector<HTMLElement>('.fp-yd-active')
        if (active) list.scrollTop = active.offsetTop - (list.clientHeight - active.offsetHeight) / 2
      }

      const dropdown: Dropdown = {
        kind,
        trigger,
        list,
        close: () => {
          list.classList.remove(OPEN_CLASS)
          trigger.setAttribute('aria-expanded', 'false')
        },
        refresh: () => { trigger.textContent = getLabel() },
      }

      trigger.addEventListener('click', e => {
        e.stopPropagation()
        e.preventDefault()
        if (list.classList.contains(OPEN_CLASS)) dropdown.close()
        else open()
      })

      render()
      container.appendChild(list)
      dropdown.refresh()
      return dropdown
    }

    const build = () => {
      const container = cal()
      // Destroyed before this deferred build ran (e.g. the component unmounted).
      if (!container) return

      if (dropdowns.length) { refreshAll(); return }

      const yearWrapper = container.querySelector<HTMLElement>('.numInputWrapper')
      if (!yearWrapper) return

      // Year: hide the typeable input and its arrows, keep them in the DOM.
      yearWrapper.classList.add('fp-has-custom-year')
      const input = yearWrapper.querySelector<HTMLElement>('input.cur-year')
      if (input) input.style.cssText = 'position:absolute;width:0;height:0;opacity:0;overflow:hidden;border:0;padding:0;margin:0;pointer-events:none'
      yearWrapper.querySelectorAll<HTMLElement>('span.arrowUp, span.arrowDown').forEach(el => { el.style.display = 'none' })

      const year = createDropdown(
        'year', container, yearItems,
        () => String(fp.currentYear),
        () => String(fp.currentYear),
        value => fp.changeYear(Number(value)),
      )
      yearWrapper.insertBefore(year.trigger, yearWrapper.firstChild)
      dropdowns.push(year)

      // Month: only when Flatpickr renders a <select> (monthSelectorType
      // 'static' shows plain text, which is left as it is).
      const select = monthSelect()
      if (select) {
        const header = select.parentElement as HTMLElement
        header.classList.add('fp-has-custom-month')
        select.style.display = 'none'

        const wrap = document.createElement('span')
        wrap.className = 'fp-md-wrap'
        header.insertBefore(wrap, select)

        const month = createDropdown(
          'month', container, monthItems,
          () => String(fp.currentMonth),
          monthLabel,
          value => fp.changeMonth(Number(value), false),
        )
        wrap.appendChild(month.trigger)
        dropdowns.push(month)
      }

      container.addEventListener('click', e => {
        const target = e.target as Node
        if (!dropdowns.some(d => d.trigger.contains(target) || d.list.contains(target))) closeAll()
      })

      // The hooks below are not enough on their own: react-flatpickr re-applies
      // its own onClose/onChange on every re-render with fp.set(), which
      // replaces this plugin's hooks rather than adding to them. So watch the
      // calendar itself - it loses its `open` class when it closes, and redraws
      // its days whenever the month or year changes.
      observer = new MutationObserver(records => {
        if (records.some(r => r.type === 'attributes') && !container.classList.contains('open')) closeAll()
        refreshAll()
      })
      observer.observe(container, { attributes: true, attributeFilter: ['class'] })
      const days = container.querySelector('.flatpickr-days')
      if (days) observer.observe(days, { childList: true, subtree: true })
    }

    return {
      onReady: () => setTimeout(build, 0),
      onOpen: () => setTimeout(build, 0),
      onMonthChange: refreshAll,
      onYearChange: () => { refreshAll(); closeAll() },
      onChange: refreshAll,
      onClose: closeAll,
      onDestroy: () => {
        observer?.disconnect()
        observer = null
        dropdowns = []
      },
    }
  }
}
