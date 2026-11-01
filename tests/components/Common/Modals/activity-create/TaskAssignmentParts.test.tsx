import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ToggleCard from '../../../../../src/components/Common/Modals/activity-create/ToggleCard'
import TaskOwnerCard from '../../../../../src/components/Common/Modals/activity-create/TaskOwnerCard'
import TaskAssignmentFields from '../../../../../src/components/Common/Modals/activity-create/TaskAssignmentFields'
import VisibilityPicker from '../../../../../src/components/Common/Modals/activity-create/VisibilityPicker'
import {
  TASK_PRIORITY_SELECT_OPTIONS,
  TASK_STATUS_SELECT_OPTIONS,
  getInitials,
} from '../../../../../src/components/Common/Modals/activity-create/options'
import DateTimeField, {
  parseLocalDateTime,
  toLocalDateString,
  toLocalDateTimeString,
} from '../../../../../src/components/Common/Modals/activity-create/DateTimeField'
import { TASK_OWNER_LABELS, TASK_OWNER_UNASSIGNED_TEXT } from '../../../../../src/config/activityTask'
import { VISIBILITY_OPTIONS_HOST } from '../../../../../src/modules/activity-log/constants'

describe('ToggleCard', () => {
  it('shows its panel only while switched on', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <ToggleCard id="assign" title="Want to Assign" icon="ri-user-shared-line" checked={false} onChange={onChange}>
        <p>Panel</p>
      </ToggleCard>
    )

    expect(screen.queryByText('Panel')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('switch', { name: 'Want to Assign' }))
    expect(onChange).toHaveBeenCalledWith(true)

    rerender(
      <ToggleCard id="assign" title="Want to Assign" icon="ri-user-shared-line" checked onChange={onChange} error="Only a Task activity can be assigned.">
        <p>Panel</p>
      </ToggleCard>
    )
    expect(screen.getByText('Panel')).toBeInTheDocument()
    expect(screen.getByText('Only a Task activity can be assigned.')).toBeInTheDocument()
  })
})

describe('TaskOwnerCard', () => {
  it("shows the record's staff member with initials and contact details", () => {
    render(<TaskOwnerCard owner={{ label: 'Lead Owner', status: 'assigned', name: 'Blake Ops', email: 'blake@example.test', phone: '(222) 333-4444' }} />)

    const card = document.getElementById('activityTaskOwner')!
    expect(card).toHaveTextContent('Lead Owner')
    expect(card).toHaveTextContent('BO')
    expect(card).toHaveTextContent('Blake Ops')
    expect(card).toHaveTextContent('blake@example.test')
    expect(card).toHaveTextContent('(222) 333-4444')
  })

  it('says nobody is assigned yet', () => {
    render(<TaskOwnerCard owner={{ label: 'Partner Agent', status: 'unassigned' }} id="customOwner" />)

    const card = document.getElementById('customOwner')!
    expect(card).toHaveClass('is-empty')
    expect(card).toHaveTextContent(TASK_OWNER_UNASSIGNED_TEXT)
  })

  it('names the role per page, from config', () => {
    expect(TASK_OWNER_LABELS).toMatchObject({
      Partner: 'Partner Agent',
      Client: 'Client Assigned To',
      Lead: 'Lead Owner',
      'Funding Application': 'Borrower Assign to',
      'Funding Request': 'Borrower Assign to',
    })
    expect(TASK_OWNER_UNASSIGNED_TEXT).toBe('No one has been assigned yet')
  })
})

describe('TaskAssignmentFields', () => {
  const values = { assigned_to: '14', task_due_date: '2030-11-07 15:30:00', task_priority: 'high', task_status: 'in_progress' }
  const staff = [{ id: 12, full_name: 'Avery Staff' }, { id: 14, full_name: 'Blake Ops' }]

  it('prefixes its element ids so two forms never share them', () => {
    render(<TaskAssignmentFields values={values} onChange={() => { }} staff={staff} isLoadingStaff={false} errors={{}} idPrefix="activityEdit" />)

    expect(document.getElementById('activityEditAssignedTo')).toHaveTextContent('Blake Ops')
    expect(document.getElementById('activityEditTaskDueAt')).toHaveValue('07 Nov, 2030 03:30 PM')
    expect(document.getElementById('activityEditTaskPriority')).toHaveTextContent('High')
    expect(document.getElementById('activityEditTaskStatus')).toHaveTextContent('In Progress')
    expect(document.getElementById('activityAssignedTo')).toBeNull()
  })

  it('reports each pick by field name', () => {
    const onChange = vi.fn()
    render(<TaskAssignmentFields values={values} onChange={onChange} staff={staff} isLoadingStaff={false} errors={{}} />)

    fireEvent.click(document.getElementById('activityAssignedTo')!)
    fireEvent.click(screen.getByRole('option', { name: /Avery Staff/ }))
    expect(onChange).toHaveBeenCalledWith('assigned_to', '12')

    fireEvent.click(document.getElementById('activityTaskStatus')!)
    fireEvent.click(screen.getByRole('option', { name: /Complete/ }))
    expect(onChange).toHaveBeenCalledWith('task_status', 'complete')
  })

  it('shows each field error and the owner card when given', () => {
    render(
      <TaskAssignmentFields
        values={{ ...values, assigned_to: '' }}
        onChange={() => { }}
        staff={staff}
        isLoadingStaff={false}
        errors={{ assigned_to: ['Please select who the task is assigned to.'], task_due_date: ['The due date cannot be in the past.'] }}
        owner={{ label: 'Client Assigned To', status: 'unassigned' }}
      />
    )

    expect(screen.getByText('Please select who the task is assigned to.')).toBeInTheDocument()
    expect(screen.getByText('The due date cannot be in the past.')).toBeInTheDocument()
    expect(document.getElementById('activityAssignedTo')).toHaveClass('is-invalid')
    expect(document.getElementById('activityTaskOwner')).toHaveTextContent('Client Assigned To')
  })

  it('shows the staff list loading', () => {
    render(<TaskAssignmentFields values={values} onChange={() => { }} staff={[]} isLoadingStaff errors={{}} />)

    expect(document.getElementById('activityAssignedTo')).toHaveTextContent('Loading...')
    expect(document.getElementById('activityAssignedTo')).toBeDisabled()
  })
})

describe('task select options', () => {
  it('colour priorities and statuses from config', () => {
    expect(TASK_PRIORITY_SELECT_OPTIONS.map((o) => [o.value, o.tone])).toEqual([
      ['low', 'success'],
      ['medium', 'warning'],
      ['high', 'danger'],
    ])
    expect(TASK_STATUS_SELECT_OPTIONS.map((o) => o.label)).toEqual(['Open', 'In Progress', 'Complete'])
    expect(TASK_STATUS_SELECT_OPTIONS.every((o) => o.icon)).toBe(true)
  })

  it('makes initials from up to two names', () => {
    expect(getInitials('Avery Staff')).toBe('AS')
    expect(getInitials('Jo Ann Marie Smith')).toBe('JA')
    expect(getInitials('cher')).toBe('C')
    expect(getInitials('  ')).toBe('?')
  })
})

describe('DateTimeField date helpers', () => {
  it('read a bare day as local midnight, not UTC', () => {
    const date = parseLocalDateTime('2030-11-07')!
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2030, 10, 7, 0])
    expect(parseLocalDateTime('')).toBeNull()
  })

  it('write the local day and the local date-time', () => {
    const date = new Date(2030, 10, 7, 15, 30, 0)
    expect(toLocalDateString(date)).toBe('2030-11-07')
    expect(toLocalDateTimeString(date)).toBe('2030-11-07 15:30:00')
  })
})

describe('DateTimeField picking a day (BUG-057)', () => {
  afterEach(() => vi.useRealTimers())

  it('keeps the current time, not midnight, when the field was empty', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2030, 10, 5, 14, 25, 0))
    const onChange = vi.fn()
    const { container } = render(<DateTimeField inputId="when" value="" onChange={onChange} />)

    fireEvent.click(container.querySelector('.p-datepicker-trigger')!)
    fireEvent.click(screen.getByText('20', { selector: 'span' }))

    expect(onChange).toHaveBeenLastCalledWith('2030-11-20 14:25:00')
  })

  it('keeps the time already chosen when another day is clicked', () => {
    const onChange = vi.fn()
    const { container } = render(<DateTimeField inputId="when" value="2030-11-05 09:40:00" onChange={onChange} />)

    fireEvent.click(container.querySelector('.p-datepicker-trigger')!)
    fireEvent.click(screen.getByText('20', { selector: 'span' }))

    expect(onChange).toHaveBeenLastCalledWith('2030-11-20 09:40:00')
  })

  it('uses the time typed into the input instead of the earlier one', () => {
    const onChange = vi.fn()
    render(<DateTimeField inputId="when" value="2030-11-05 09:40:00" onChange={onChange} />)

    fireEvent.input(document.getElementById('when')!, { target: { value: '20 Nov, 2030 03:45 PM' } })

    expect(onChange).toHaveBeenLastCalledWith('2030-11-20 15:45:00')
  })
})

describe('VisibilityPicker', () => {
  it('shows each level as a card, with its note on its own', () => {
    const onChange = vi.fn()
    render(<VisibilityPicker options={VISIBILITY_OPTIONS_HOST} value="private" onChange={onChange} />)

    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(screen.getByLabelText('Private (Only Me)')).toBeChecked()
    expect(screen.getByText('(Including Borrower)')).toHaveClass('acm-visibility__note')

    fireEvent.click(screen.getByLabelText('Partner'))
    expect(onChange).toHaveBeenCalledWith('partner')
  })
})
