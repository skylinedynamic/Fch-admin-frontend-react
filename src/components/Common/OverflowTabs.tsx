import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export interface OverflowTab {
  key: string
  label: ReactNode
  /** Shown, but not openable (e.g. a tab that needs the record saved first). */
  disabled?: boolean
}

interface OverflowTabsProps {
  tabs: OverflowTab[]
  activeKey: string
  onSelect: (key: string) => void
  /** Names the tab list for screen readers, e.g. "Partner sections". */
  ariaLabel: string
}

/**
 * Which tabs fit on the line, by index, in order: all of them if they fit;
 * otherwise as many as fit beside the More button, and the open tab always -
 * in place of the last one that fitted when it would be in More. Before
 * anything is measured (no layout yet) every tab is shown.
 */
export function computeVisibleTabs(widths: number[], available: number, moreWidth: number, activeIndex: number): number[] {
  const all = widths.map((_, i) => i)
  const total = widths.reduce((sum, w) => sum + w, 0)
  if (total <= available) return all

  const budget = available - moreWidth
  const visible: number[] = []
  let used = 0
  for (const i of all) {
    if (used + widths[i] > budget) break
    visible.push(i)
    used += widths[i]
  }

  if (activeIndex >= 0 && !visible.includes(activeIndex)) {
    while (visible.length && used + widths[activeIndex] > budget) {
      used -= widths[visible.pop()!]
    }
    visible.push(activeIndex)
  }

  return visible
}

/**
 * A page's tabs on one line. The tabs that do not fit go into a "More"
 * dropdown at the end of the line; the open tab always stays on the line.
 *
 * Widths are measured on the real tabs: when the set of tabs changes or the line
 * widens, every tab (and More) is laid out once and measured before the browser
 * paints, then the split is worked out from those widths. A narrower line or
 * another open tab only re-works the split. Nothing is rendered twice, so each
 * tab's text is on the page once.
 */
export default function OverflowTabs({ tabs, activeKey, onSelect, ariaLabel }: OverflowTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)
  const widths = useRef<Record<string, number>>({})
  const moreWidth = useRef(0)
  const lastWidth = useRef(0)
  const [measuring, setMeasuring] = useState(true)
  const [lineWidth, setLineWidth] = useState(0)
  const [open, setOpen] = useState(false)

  // Which tabs there are - not their (new on every render) label elements.
  const signature = tabs.map((t) => t.key).join('|')

  useLayoutEffect(() => {
    setMeasuring(true)
  }, [signature])

  useLayoutEffect(() => {
    if (!measuring) return
    const list = listRef.current
    if (!list) return
    list.querySelectorAll<HTMLElement>('[data-tab-key]').forEach((li) => {
      widths.current[li.dataset.tabKey!] = li.getBoundingClientRect().width
    })
    moreWidth.current = moreRef.current?.getBoundingClientRect().width ?? 0
    const width = containerRef.current?.getBoundingClientRect().width ?? 0
    lastWidth.current = width
    setLineWidth(width)
    setMeasuring(false)
  }, [measuring])

  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      const width = container.getBoundingClientRect().width
      // Wider: a tab in More may fit now - measure again; narrower: the widths still hold.
      if (width > lastWidth.current) setMeasuring(true)
      lastWidth.current = width
      setLineWidth(width)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // More closes on Escape and on a click anywhere outside it.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onDown = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  const visibleKeys = useMemo(() => {
    if (measuring) return tabs.map((t) => t.key)
    const visible = computeVisibleTabs(
      tabs.map((t) => widths.current[t.key] ?? 0),
      lineWidth,
      moreWidth.current,
      tabs.findIndex((t) => t.key === activeKey)
    )
    return visible.map((i) => tabs[i].key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measuring, signature, lineWidth, activeKey])

  const shown = tabs.filter((t) => visibleKeys.includes(t.key))
  const hidden = tabs.filter((t) => !visibleKeys.includes(t.key))

  const select = (tab: OverflowTab) => {
    if (tab.disabled) return
    setOpen(false)
    onSelect(tab.key)
  }

  return (
    <div className={`overflow-tabs${measuring ? ' overflow-tabs--measuring' : ''}`} ref={containerRef}>
      <ul className="nav nav-tabs-custom rounded card-header-tabs border-bottom-0 overflow-tabs__list" role="tablist" aria-label={ariaLabel} ref={listRef}>
        {shown.map((tab) => (
          <li key={tab.key} className="nav-item" data-tab-key={tab.key}>
            <button
              type="button"
              className={`nav-link ${tab.key === activeKey ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
              role="tab"
              aria-selected={tab.key === activeKey}
              aria-disabled={tab.disabled || undefined}
              disabled={tab.disabled}
              onClick={() => select(tab)}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      {/* Laid out while measuring too, so its width is known before it is needed. */}
      {(measuring || hidden.length > 0) && (
        <div className="overflow-tabs__more" ref={moreRef} data-more="">
          <button
            type="button"
            className={`overflow-tabs__more-btn ${hidden.some((t) => t.key === activeKey) ? 'active' : ''}`}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`More (${hidden.length} more ${hidden.length === 1 ? 'tab' : 'tabs'})`}
            tabIndex={measuring ? -1 : 0}
            onClick={() => setOpen((o) => !o)}
          >
            More <span className="overflow-tabs__count">{measuring ? tabs.length : hidden.length}</span>
            <i className={`ri-arrow-${open ? 'up' : 'down'}-s-line`} aria-hidden="true" />
          </button>
          {open && hidden.length > 0 && (
            <ul className="overflow-tabs__menu" role="menu" aria-label="More tabs">
              {hidden.map((tab) => (
                <li key={tab.key} role="none">
                  <button type="button" role="menuitem" className="overflow-tabs__item" disabled={tab.disabled} onClick={() => select(tab)}>
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
