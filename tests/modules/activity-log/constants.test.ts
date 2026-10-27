import { describe, expect, it } from 'vitest'
import {
  ACTIVITY_CREATE_ERROR_FIELDS,
  ACTIVITY_EDIT_ERROR_FIELDS,
  VISIBILITY_OPTIONS_HOST,
  VISIBILITY_OPTIONS_PARTNER,
  getVisibilityOptions,
  VISIBILITY_BADGE_STYLES,
  normalizeActivityFieldErrors,
  getActivityValidationToast,
  ACTIVITY_TASK_REFERENCE,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  DEFAULT_TASK_ASSIGNMENT,
  buildTaskAssignmentFields,
} from '../../../src/modules/activity-log/constants'

describe('visibility field wiring', () => {
  it('is one of the fields the create form shows inline errors for', () => {
    expect(ACTIVITY_CREATE_ERROR_FIELDS).toContain('visibility')
  })

  it('is one of the fields the edit form shows inline errors for', () => {
    expect(ACTIVITY_EDIT_ERROR_FIELDS).toContain('visibility')
  })
})

describe('getVisibilityOptions', () => {
  it('gives a host user all 4 levels, including Internal and Partner', () => {
    const values = getVisibilityOptions(true).map((o) => o.value)
    expect(values).toEqual(['private', 'internal', 'partner', 'everyone'])
  })

  it('offers Private, Internal (partner-scoped), and Everyone to a non-host (partner) user', () => {
    const options = getVisibilityOptions(false)
    const values = options.map((o) => o.value)
    expect(values).toEqual(['private', 'partner', 'everyone'])
    expect(options.find((o) => o.value === 'partner')?.label).toBe('Internal')
    expect(values).not.toContain('internal')
  })

  it('defaults to the partner (non-host) option set when isHost is omitted', () => {
    expect(getVisibilityOptions()).toEqual(VISIBILITY_OPTIONS_PARTNER)
  })

  it('the host option set is a strict superset of the partner option set', () => {
    const hostValues = VISIBILITY_OPTIONS_HOST.map((o) => o.value)
    const partnerValues = VISIBILITY_OPTIONS_PARTNER.map((o) => o.value)
    partnerValues.forEach((v) => expect(hostValues).toContain(v))
    expect(hostValues.length).toBe(partnerValues.length + 1)
  })
})

describe('VISIBILITY_BADGE_STYLES', () => {
  it('has a style entry for every level in both option sets', () => {
    const allValues = new Set([
      ...VISIBILITY_OPTIONS_HOST.map((o) => o.value),
      ...VISIBILITY_OPTIONS_PARTNER.map((o) => o.value),
    ])

    allValues.forEach((value) => {
      expect(VISIBILITY_BADGE_STYLES[value]).toBeDefined()
      expect(VISIBILITY_BADGE_STYLES[value].label).toBeTruthy()
      expect(VISIBILITY_BADGE_STYLES[value].className).toBeTruthy()
    })
  })

  it('gives each level a distinct badge class so they read apart at a glance', () => {
    const classNames = Object.values(VISIBILITY_BADGE_STYLES).map((s) => s.className)
    expect(new Set(classNames).size).toBe(classNames.length)
  })
})

// Regression coverage: now that 'visibility' is wired into the shown-fields
// lists, a validation error on it renders inline on the form (via
// errors.visibility in the radio group), so the toast should point at the
// form generically rather than repeat the message a second time. If
// 'visibility' were missing from the shown-fields list, the error would have
// nowhere to render and must be toasted verbatim instead - that's the case
// getActivityValidationToast exists to catch.
describe('getActivityValidationToast with a visibility error', () => {
  it('toasts the generic "fix the highlighted fields" message since visibility renders inline', () => {
    const errors = normalizeActivityFieldErrors({ visibility: 'Please select who can see this activity.' })
    const message = getActivityValidationToast(errors, ACTIVITY_CREATE_ERROR_FIELDS)
    expect(message).toBe('Please fix the highlighted fields.')
  })

  it('toasts the field-specific message when visibility has nowhere to render inline', () => {
    const errors = normalizeActivityFieldErrors({ visibility: 'Please select who can see this activity.' })
    const message = getActivityValidationToast(errors, [])
    expect(message).toBe('Please select who can see this activity.')
  })
})

describe('task assignment ("Want to Assign")', () => {
  it('only a Task can be assigned', () => {
    expect(ACTIVITY_TASK_REFERENCE).toBe('Task')
  })

  it('offers Low, Medium and High priorities, in that order', () => {
    expect(TASK_PRIORITY_OPTIONS).toEqual([
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
    ])
  })

  it('offers Open, In Progress and Complete statuses, in that order', () => {
    expect(TASK_STATUS_OPTIONS).toEqual([
      { value: 'open', label: 'Open' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'complete', label: 'Complete' },
    ])
  })

  it('starts a new assignment at Medium priority and Open', () => {
    expect(DEFAULT_TASK_ASSIGNMENT).toEqual({
      assign_task: false,
      assigned_to: '',
      task_due_at: '',
      task_priority: 'medium',
      task_status: 'open',
    })
  })

  it('sends the four task fields when a Task is being assigned', () => {
    expect(
      buildTaskAssignmentFields({
        reference: 'Task',
        assign_task: true,
        assigned_to: 12,
        task_due_at: '2026-11-02 15:30:00',
        task_priority: 'high',
        task_status: 'in_progress',
      })
    ).toEqual({
      assign_task: '1',
      assigned_to: '12',
      task_due_at: '2026-11-02 15:30:00',
      task_priority: 'high',
      task_status: 'in_progress',
    })
  })

  it('sends nothing when the switch is off, or the reference is no longer Task', () => {
    const assigned = { assign_task: true, assigned_to: 12, task_due_at: '2026-11-02 15:30:00', task_priority: 'high', task_status: 'open' }
    expect(buildTaskAssignmentFields({ ...assigned, reference: 'Task', assign_task: false })).toEqual({})
    expect(buildTaskAssignmentFields({ ...assigned, reference: 'Call' })).toEqual({})
  })

  it('shows the task fields\' errors inline on the create form', () => {
    for (const field of ['assign_task', 'assigned_to', 'task_due_at', 'task_priority', 'task_status']) {
      expect(ACTIVITY_CREATE_ERROR_FIELDS).toContain(field)
    }
  })
})
