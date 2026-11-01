import { useState } from 'react'
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap'

interface ReminderActionsMenuProps {
    /** How many rows are ticked - the button shows only while some are. */
    count: number
    onDismissSelected: () => void
}

/**
 * The header's Actions split button for the ticked rows, styled like the
 * Partners list's: shown only while rows are selected.
 */
export default function ReminderActionsMenu({ count, onDismissSelected }: ReminderActionsMenuProps) {
    const [open, setOpen] = useState(false)
    if (count === 0) return null

    const toggle = () => setOpen((o) => !o)

    return (
        <Dropdown group isOpen={open} toggle={toggle}>
            <button type="button" className="btn bg-success text-white fw-medium" onClick={toggle}>Actions</button>
            <DropdownToggle split color="" className="bg-success text-white fw-medium">
                <span className="visually-hidden">Toggle Dropdown</span>
            </DropdownToggle>
            <DropdownMenu end>
                <DropdownItem className="text-danger" onClick={onDismissSelected}>
                    <i className="ri-notification-off-line me-1 align-bottom" aria-hidden="true"></i> Dismiss Selected
                </DropdownItem>
            </DropdownMenu>
        </Dropdown>
    )
}
