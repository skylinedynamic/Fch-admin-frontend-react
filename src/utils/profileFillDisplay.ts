import type { ProfileFieldToFill } from '../modules/embed-form'
import {
    PROFILE_FILL_DATE_FIELDS,
    PROFILE_FILL_GROUPS,
    PROFILE_FILL_HIDDEN_FIELDS,
    PROFILE_FILL_LABELS,
    PROFILE_FILL_MONEY_FIELDS,
    PROFILE_FILL_OTHER_GROUP,
} from '../config/embedFormProfileFill'

export type ProfileFillItem = { key: string; label: string; value: string; wide: boolean }
export type ProfileFillGroup = { title: string; icon: string; items: ProfileFillItem[] }

/** "2008-11-01" as "Nov 1, 2008", read as a calendar date (no timezone shift). */
const formatDate = (value: string): string => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
    if (!match) return value
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatMoney = (value: string, currency: string): string => {
    const amount = Number(value)
    if (!Number.isFinite(amount)) return value
    try {
        return amount.toLocaleString('en-US', { style: 'currency', currency })
    } catch {
        return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
}

/** "Street, City, State 12345, Country" from whichever parts are there. */
const joinAddress = (parts: Record<string, string>, [street, city, state, postal, country]: readonly string[]): string => {
    const statePostal = [parts[state], parts[postal]].filter(Boolean).join(' ')
    return [parts[street], parts[city], statePostal, parts[country]].filter(Boolean).join(', ')
}

/**
 * The fields an embedded-form application would fill on an existing client,
 * grouped and formatted for the Convert dialog (BUG-064).
 */
export function groupProfileFields(fields: ProfileFieldToFill[]): ProfileFillGroup[] {
    const values: Record<string, string> = {}
    const apiLabels: Record<string, string> = {}
    for (const { field, label, value } of fields) {
        if (PROFILE_FILL_HIDDEN_FIELDS.includes(field)) continue
        values[field] = value
        apiLabels[field] = label
    }
    const currency = values.currency || 'USD'

    const display = (field: string): string => {
        const value = values[field]
        if (PROFILE_FILL_DATE_FIELDS.includes(field)) return formatDate(value)
        if (PROFILE_FILL_MONEY_FIELDS.includes(field)) return formatMoney(value, currency)
        if (field === 'number_of_employees' && /^\d+$/.test(value)) return Number(value).toLocaleString('en-US')
        return value
    }

    const grouped = new Set<string>()
    const groups: ProfileFillGroup[] = []

    for (const group of PROFILE_FILL_GROUPS) {
        const present = group.fields.filter((field) => field in values)
        present.forEach((field) => grouped.add(field))
        if (present.length === 0) continue

        if ('address' in group && group.address) {
            const key = group.fields[0]
            groups.push({
                title: group.title,
                icon: group.icon,
                items: [{ key, label: PROFILE_FILL_LABELS[key] ?? group.title, value: joinAddress(values, group.fields), wide: true }],
            })
            continue
        }

        groups.push({
            title: group.title,
            icon: group.icon,
            items: present.map((field) => ({
                key: field,
                label: PROFILE_FILL_LABELS[field] ?? apiLabels[field],
                value: display(field),
                wide: false,
            })),
        })
    }

    const other = Object.keys(values).filter((field) => !grouped.has(field))
    if (other.length > 0) {
        groups.push({
            ...PROFILE_FILL_OTHER_GROUP,
            items: other.map((field) => ({ key: field, label: PROFILE_FILL_LABELS[field] ?? apiLabels[field], value: display(field), wide: false })),
        })
    }

    return groups
}
