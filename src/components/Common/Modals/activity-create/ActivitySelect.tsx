import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ThemeTone } from '../../../../config/activityTask'

export type ActivitySelectTone = ThemeTone

export interface ActivitySelectOption {
    value: string
    label: string
    /** Remix icon class shown before the label, e.g. "ri-phone-line". */
    icon?: string
    /** Coloured dot (or icon colour) in one of the theme's colours. */
    tone?: ActivitySelectTone
    /** Initials avatar, for people. */
    avatar?: string
    /** Second, muted line in the list (e.g. an email). */
    description?: string
}

interface ActivitySelectProps {
    id: string
    value: string
    options: ActivitySelectOption[]
    onChange: (value: string) => void
    placeholder?: string
    invalid?: boolean
    disabled?: boolean
    loading?: boolean
    /** A search box at the top of the list, for long lists. */
    searchable?: boolean
    searchPlaceholder?: string
    emptyText?: string
    className?: string
}

const MENU_MAX_HEIGHT = 280
const MENU_GAP = 4

/**
 * The New Activity modal's dropdown: a field-sized trigger (the theme's
 * form-control look and focus) and a list that opens over the modal. The
 * list is rendered on <body> so the modal's scrolling body never clips it.
 * Keyboard: arrows / Home / End move, Enter or Space picks, Escape closes
 * without closing the modal, Tab moves on.
 */
export default function ActivitySelect({
    id,
    value,
    options,
    onChange,
    placeholder = 'Select...',
    invalid = false,
    disabled = false,
    loading = false,
    searchable = false,
    searchPlaceholder = 'Search...',
    emptyText = 'No options found',
    className = '',
}: ActivitySelectProps) {
    const listId = `${id}-listbox`
    const optionIdPrefix = `${useId().replace(/:/g, '')}-opt`

    const triggerRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const searchRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLUListElement>(null)

    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [activeIndex, setActiveIndex] = useState(-1)
    const [position, setPosition] = useState<{ top: number; left: number; width: number; dropUp: boolean } | null>(null)

    const selected = options.find((o) => o.value === String(value ?? ''))

    const visibleOptions = useMemo(() => {
        const term = search.trim().toLowerCase()
        if (!searchable || !term) return options
        return options.filter((o) => `${o.label} ${o.description ?? ''}`.toLowerCase().includes(term))
    }, [options, search, searchable])

    const open = useCallback(() => {
        if (disabled) return
        setIsOpen(true)
        const selectedIndex = options.findIndex((o) => o.value === String(value ?? ''))
        setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    }, [disabled, options, value])

    const close = useCallback((refocus = false) => {
        setIsOpen(false)
        setSearch('')
        setActiveIndex(-1)
        if (refocus) triggerRef.current?.focus()
    }, [])

    const choose = useCallback((option: ActivitySelectOption | undefined) => {
        if (!option) return
        onChange(option.value)
        close(true)
    }, [onChange, close])

    // Place the list under the field, or above it when there is no room below.
    const reposition = useCallback(() => {
        const trigger = triggerRef.current
        if (!trigger) return
        const rect = trigger.getBoundingClientRect()
        const menuHeight = Math.min(menuRef.current?.offsetHeight ?? MENU_MAX_HEIGHT, MENU_MAX_HEIGHT + 60)
        const spaceBelow = window.innerHeight - rect.bottom
        const dropUp = spaceBelow < menuHeight + MENU_GAP && rect.top > spaceBelow
        setPosition({
            top: dropUp ? rect.top - MENU_GAP : rect.bottom + MENU_GAP,
            left: rect.left,
            width: rect.width,
            dropUp,
        })
    }, [])

    useLayoutEffect(() => {
        if (isOpen) reposition()
    }, [isOpen, reposition, visibleOptions.length])

    useEffect(() => {
        if (!isOpen) return
        const onMouseDown = (e: MouseEvent) => {
            const target = e.target as Node
            if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
            close()
        }
        // Follow the field when the modal body (or the page) scrolls.
        const onScroll = (e: Event) => {
            if (menuRef.current?.contains(e.target as Node)) return
            reposition()
        }
        document.addEventListener('mousedown', onMouseDown)
        window.addEventListener('scroll', onScroll, true)
        window.addEventListener('resize', reposition)
        return () => {
            document.removeEventListener('mousedown', onMouseDown)
            window.removeEventListener('scroll', onScroll, true)
            window.removeEventListener('resize', reposition)
        }
    }, [isOpen, close, reposition])

    useEffect(() => {
        if (isOpen && searchable) searchRef.current?.focus()
    }, [isOpen, searchable])

    // Escape must close only the list, not the Bootstrap modal around it. The
    // modal listens on its own element, which a native keydown reaches before
    // React's root listener, so this is a native listener that both stops the
    // event and closes the list (React's onKeyDown never sees it).
    const closeRef = useRef(close)
    closeRef.current = close
    useEffect(() => {
        const trigger = triggerRef.current
        if (!trigger) return
        const onEscape = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || trigger.getAttribute('aria-expanded') !== 'true') return
            e.stopPropagation()
            e.preventDefault()
            closeRef.current(true)
        }
        trigger.addEventListener('keydown', onEscape)
        return () => trigger.removeEventListener('keydown', onEscape)
    }, [])

    useEffect(() => {
        if (!isOpen || activeIndex < 0) return
        const item = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
        item?.scrollIntoView({ block: 'nearest' })
    }, [isOpen, activeIndex])

    useEffect(() => {
        if (isOpen) setActiveIndex((i) => Math.min(Math.max(i, 0), Math.max(visibleOptions.length - 1, 0)))
    }, [isOpen, visibleOptions.length])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const last = visibleOptions.length - 1
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                if (!isOpen) return open()
                setActiveIndex((i) => (i >= last ? 0 : i + 1))
                break
            case 'ArrowUp':
                e.preventDefault()
                if (!isOpen) return open()
                setActiveIndex((i) => (i <= 0 ? last : i - 1))
                break
            case 'Home':
                if (!isOpen) return
                e.preventDefault()
                setActiveIndex(0)
                break
            case 'End':
                if (!isOpen) return
                e.preventDefault()
                setActiveIndex(last)
                break
            case 'Enter':
                e.preventDefault()
                if (!isOpen) return open()
                choose(visibleOptions[activeIndex])
                break
            case ' ':
                // A space is text in the search box.
                if (e.target === searchRef.current) return
                e.preventDefault()
                if (!isOpen) return open()
                choose(visibleOptions[activeIndex])
                break
            case 'Escape':
                if (!isOpen) return
                e.preventDefault()
                close(true)
                break
            case 'Tab':
                if (isOpen) close()
                break
        }
    }

    const activeOptionId = isOpen && activeIndex >= 0 && visibleOptions[activeIndex]
        ? `${optionIdPrefix}-${activeIndex}`
        : undefined

    return (
        <div className={`acm-select ${isOpen ? 'is-open' : ''} ${className}`}>
            <button
                ref={triggerRef}
                id={id}
                type="button"
                className={`form-control acm-select__trigger ${invalid ? 'is-invalid' : ''}`}
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={listId}
                aria-activedescendant={searchable ? undefined : activeOptionId}
                aria-invalid={invalid || undefined}
                disabled={disabled}
                onClick={() => (isOpen ? close() : open())}
                onKeyDown={handleKeyDown}
            >
                {loading ? (
                    <span className="acm-select__value text-muted">
                        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                        Loading...
                    </span>
                ) : selected ? (
                    <span className="acm-select__value">
                        <OptionVisual option={selected} />
                        <span className="text-truncate">{selected.label}</span>
                    </span>
                ) : (
                    <span className="acm-select__value acm-select__placeholder">{placeholder}</span>
                )}
                <i className="ri-arrow-down-s-line acm-select__chevron" aria-hidden="true" />
            </button>

            {isOpen && createPortal(
                <div
                    ref={menuRef}
                    className={`acm-select__menu ${position?.dropUp ? 'is-drop-up' : ''}`}
                    style={{
                        top: position?.top ?? -9999,
                        left: position?.left ?? -9999,
                        width: position?.width,
                        transform: position?.dropUp ? 'translateY(-100%)' : undefined,
                        visibility: position ? 'visible' : 'hidden',
                    }}
                >
                    {searchable && (
                        <div className="acm-select__search">
                            <i className="ri-search-line" aria-hidden="true" />
                            <input
                                ref={searchRef}
                                type="text"
                                className="form-control"
                                placeholder={searchPlaceholder}
                                value={search}
                                aria-label={searchPlaceholder}
                                aria-controls={listId}
                                aria-activedescendant={activeOptionId}
                                onChange={(e) => {
                                    setSearch(e.target.value)
                                    setActiveIndex(0)
                                }}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                    )}
                    <ul ref={listRef} id={listId} role="listbox" className="acm-select__list" aria-labelledby={id}>
                        {visibleOptions.length === 0 && (
                            <li className="acm-select__empty">{emptyText}</li>
                        )}
                        {visibleOptions.map((option, index) => {
                            const isSelected = option.value === selected?.value
                            return (
                                <li
                                    key={option.value}
                                    id={`${optionIdPrefix}-${index}`}
                                    data-index={index}
                                    role="option"
                                    aria-selected={isSelected}
                                    className={`acm-select__option ${index === activeIndex ? 'is-active' : ''} ${isSelected ? 'is-selected' : ''}`}
                                    // Keep focus on the field / search box while clicking.
                                    onMouseDown={(e) => e.preventDefault()}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onClick={() => choose(option)}
                                >
                                    <OptionVisual option={option} />
                                    <span className="acm-select__option-text">
                                        <span className="acm-select__option-label">{option.label}</span>
                                        {option.description && (
                                            <span className="acm-select__option-description">{option.description}</span>
                                        )}
                                    </span>
                                    {isSelected && <i className="ri-check-line acm-select__check" aria-hidden="true" />}
                                </li>
                            )
                        })}
                    </ul>
                </div>,
                document.body
            )}
        </div>
    )
}

function OptionVisual({ option }: { option: ActivitySelectOption }) {
    if (option.avatar) {
        return <span className="acm-select__avatar" aria-hidden="true">{option.avatar}</span>
    }
    if (option.icon) {
        return (
            <span className={`acm-select__icon ${option.tone ? `is-${option.tone}` : ''}`} aria-hidden="true">
                <i className={option.icon} />
            </span>
        )
    }
    if (option.tone) {
        return <span className={`acm-select__dot is-${option.tone}`} aria-hidden="true" />
    }
    return null
}
