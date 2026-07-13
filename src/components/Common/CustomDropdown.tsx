import React, { useState, useRef, useEffect, useLayoutEffect } from 'react'

interface Option {
    [key: string]: any
}

interface CustomDropdownProps {
    options: Option[]
    value: string | number
    onChange: (value: any) => void
    optionLabel: string
    optionValue: string
    placeholder?: string
    searchable?: boolean
    disabled?: boolean
    className?: string
    style?: React.CSSProperties
    renderOption?: (option: Option) => React.ReactNode
}

export default function CustomDropdown({
    options,
    value,
    onChange,
    optionLabel,
    optionValue,
    placeholder = 'Select...',
    searchable = false,
    disabled = false,
    className = '',
    style,
    renderOption
}: CustomDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [dropUp, setDropUp] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    // Find selected option object
    const selectedOption = options.find(opt => opt[optionValue] === value)

    // Filter options based on search
    const filteredOptions = searchable
        ? options.filter(opt =>
            String(opt[optionLabel]).toLowerCase().includes(searchTerm.toLowerCase())
        )
        : options

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Reset search when closed
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('')
        }
    }, [isOpen])

    // Handle smart positioning
    useLayoutEffect(() => {
        if (isOpen && dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect()
            const spaceBelow = window.innerHeight - rect.bottom
            const menuHeight = 250 // Max height defined in style

            if (spaceBelow < menuHeight && rect.top > menuHeight) {
                setDropUp(true)
            } else {
                setDropUp(false)
            }
        }
    }, [isOpen])

    return (
        <div className={`dropdown ${className} ${isOpen ? 'is-open' : ''}`} ref={dropdownRef}>
            <button
                className={`form-select text-start d-flex justify-content-between align-items-center ${isOpen ? 'show' : ''} ${className} ${className.includes('is-invalid') ? 'is-invalid' : ''}`}
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                style={{ cursor: disabled ? 'not-allowed' : 'pointer', ...style }}
            >
                <span className={!selectedOption ? 'text-muted' : ''}>
                    {selectedOption ? selectedOption[optionLabel] : placeholder}
                </span>
            </button>

            {isOpen && (
                <div
                    ref={menuRef}
                    className={`dropdown-menu show p-0 shadow-sm border-0 ${dropUp ? 'dropup' : ''}`}
                    style={{
                        minWidth: '100%',
                        maxHeight: '250px',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        position: 'absolute',
                        top: dropUp ? 'auto' : '100%',
                        bottom: dropUp ? '100%' : 'auto',
                        left: 0,
                        zIndex: 1060,
                        marginTop: dropUp ? '0' : '4px',
                        marginBottom: dropUp ? '4px' : '0',
                        borderRadius: '8px'
                    }}
                >
                    {searchable && (
                        <div className="p-2 sticky-top bg-white border-bottom">
                            <input
                                type="text"
                                className="form-control form-control-md"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="list-group list-group-flush">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    className={`dropdown-item px-3 py-2 fs-13 ${option[optionValue] === value ? 'bg-light text-primary fw-medium' : 'text-dark'}`}
                                    onClick={() => {
                                        onChange(option[optionValue])
                                        setIsOpen(false)
                                    }}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {renderOption ? renderOption(option) : option[optionLabel]}
                                </button>
                            ))
                        ) : (
                            <div className="p-3 text-center text-muted">No results found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
