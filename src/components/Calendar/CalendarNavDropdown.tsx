import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { SyntheticEvent } from 'react'
import { containWheel } from '../../utils/containWheel'

export interface CalendarNavOption {
  label: string | number
  value: number
}

interface CalendarNavDropdownProps {
  kind: 'month' | 'year'
  options: CalendarNavOption[]
  value: number
  onChange: (event: SyntheticEvent, value: number) => void
}

// Only one month/year list is open at a time, across every calendar.
const CLOSE_OTHERS = 'calendar-nav-dropdown:open'

/**
 * Month or year dropdown for PrimeReact's <Calendar> header.
 *
 * Renders the same markup and classes (.fp-yd-trigger / .fp-yd-list /
 * .fp-yd-opt) as the Flatpickr plugin in utils/flatpickrPlugins.ts, so both
 * calendar libraries share one design - including hover and selected colours,
 * which a native <select> would not let CSS style.
 */
export default function CalendarNavDropdown({ kind, options, value, onChange }: CalendarNavDropdownProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const current = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onOtherOpened = (e: Event) => {
      if ((e as CustomEvent).detail !== wrapRef.current) setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener(CLOSE_OTHERS, onOtherOpened)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener(CLOSE_OTHERS, onOtherOpened)
    }
  }, [open])

  // A native listener: React registers wheel handlers as passive, and a
  // passive handler cannot stop the page scrolling.
  useEffect(() => (listRef.current ? containWheel(listRef.current) : undefined), [])

  // Centre the selected option by scrolling the list itself - scrollIntoView
  // would scroll the page behind as well.
  useLayoutEffect(() => {
    const list = listRef.current
    const active = list?.querySelector<HTMLElement>('.fp-yd-active')
    if (open && list && active) {
      list.scrollTop = active.offsetTop - (list.clientHeight - active.offsetHeight) / 2
    }
  }, [open])

  const toggle = () => {
    if (!open) document.dispatchEvent(new CustomEvent(CLOSE_OTHERS, { detail: wrapRef.current }))
    setOpen(!open)
  }

  return (
    <span className="p-cal-nav" data-kind={kind} ref={wrapRef}>
      <button
        type="button"
        className="fp-yd-trigger"
        data-kind={kind}
        aria-label={kind === 'month' ? 'Month' : 'Year'}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
      >
        {current?.label ?? value}
      </button>
      <div
        ref={listRef}
        className={'fp-yd-list' + (open ? ' fp-yd-open' : '')}
        data-kind={kind}
        role="listbox"
      >
        {options.map(option => (
          <div
            key={option.value}
            role="option"
            aria-selected={option.value === value}
            className={'fp-yd-opt' + (option.value === value ? ' fp-yd-active' : '')}
            data-value={option.value}
            onClick={e => {
              onChange(e, option.value)
              setOpen(false)
            }}
          >
            {option.label}
          </div>
        ))}
      </div>
    </span>
  )
}
