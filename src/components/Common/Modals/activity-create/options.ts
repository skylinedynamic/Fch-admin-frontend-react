import { REMINDER_TYPES, REMINDER_TYPE_TONES, getReminderTypeIcon } from '../../../../config/reminders'
import { REMINDER_PRESETS, REMINDER_TIME_UNITS } from '../../../../config/appConfig'
import {
    TASK_PRIORITY_OPTIONS,
    TASK_PRIORITY_TONES,
    TASK_STATUS_OPTIONS,
    TASK_STATUS_VISUALS,
} from '../../../../config/activityTask'
import { VISIBILITY_BADGE_STYLES } from '../../../../modules/activity-log/constants'
import type { ActivitySelectOption } from './ActivitySelect'

// The New Activity modal's dropdown options, built from the config lists.

export const REFERENCE_SELECT_OPTIONS: ActivitySelectOption[] = REMINDER_TYPES.map((type) => ({
    value: type.value,
    label: type.label,
    icon: getReminderTypeIcon(type.value),
    tone: REMINDER_TYPE_TONES[type.value] ?? 'secondary',
}))

export const REMINDER_PRESET_SELECT_OPTIONS: ActivitySelectOption[] = REMINDER_PRESETS.map((preset) => ({
    value: preset.value,
    label: preset.label,
}))

export const REMINDER_UNIT_SELECT_OPTIONS: ActivitySelectOption[] = REMINDER_TIME_UNITS.map((unit) => ({
    value: unit,
    label: unit,
}))

export const TASK_PRIORITY_SELECT_OPTIONS: ActivitySelectOption[] = TASK_PRIORITY_OPTIONS.map((opt) => ({
    value: opt.value,
    label: opt.label,
    tone: TASK_PRIORITY_TONES[opt.value],
}))

export const TASK_STATUS_SELECT_OPTIONS: ActivitySelectOption[] = TASK_STATUS_OPTIONS.map((opt) => ({
    value: opt.value,
    label: opt.label,
    ...TASK_STATUS_VISUALS[opt.value],
}))

export const getVisibilityIcon = (value: string): string =>
    VISIBILITY_BADGE_STYLES[value]?.icon ?? 'ri-eye-line'

export const getInitials = (name: string): string =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || '?'
