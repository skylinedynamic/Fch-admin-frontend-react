import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ReminderRecipientPicker from '../../../../../src/components/Common/Modals/activity-create/ReminderRecipientPicker'
import { DEFAULT_REMINDER_RECIPIENT, REMINDER_RECIPIENT_OPTIONS } from '../../../../../src/config/activityTask'

describe('ReminderRecipientPicker', () => {
  it('lists Me, Assignee and Both from config, Both by default', () => {
    expect(REMINDER_RECIPIENT_OPTIONS).toEqual([
      { value: 'creator', label: 'Me' },
      { value: 'assignee', label: 'Assignee' },
      { value: 'both', label: 'Both' },
    ])
    expect(DEFAULT_REMINDER_RECIPIENT).toBe('both')
  })

  it('checks the value given and reports a new pick', () => {
    const onChange = vi.fn()
    render(<ReminderRecipientPicker value="both" onChange={onChange} />)

    expect(screen.getByRole('radiogroup', { name: 'Who gets the reminder' })).toBeInTheDocument()
    expect(screen.getByLabelText('Both')).toBeChecked()

    fireEvent.click(screen.getByLabelText('Me'))
    expect(onChange).toHaveBeenCalledWith('creator')
  })

  it('shows each choice as a card with an icon and a note, the picked one highlighted', () => {
    render(<ReminderRecipientPicker value="assignee" onChange={() => { }} />)

    const card = screen.getByLabelText('Assignee').closest('label')!
    expect(card).toHaveClass('acm-visibility__option', 'is-checked')
    expect(card.querySelector('.ri-user-shared-line')).not.toBeNull()
    expect(card).toHaveTextContent('Assigned staff only')
    expect(screen.getByLabelText('Me').closest('label')).toHaveTextContent('Only you')
    expect(screen.getByLabelText('Both').closest('label')).toHaveTextContent('You and the assignee')
    expect(screen.getByLabelText('Me').closest('label')).not.toHaveClass('is-checked')
  })

  it('prefixes its ids so New Activity and Edit never share them', () => {
    render(<ReminderRecipientPicker value="creator" onChange={() => { }} idPrefix="activityEdit" error="Please choose who gets the reminder." />)

    expect(document.getElementById('activityEditReminderRecipient_creator')).toBeChecked()
    expect(screen.getByText('Please choose who gets the reminder.')).toBeInTheDocument()
  })
})
