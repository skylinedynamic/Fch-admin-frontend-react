import type { CheckAvailabilityPayload } from './types'

type AvailabilityInput = {
    date: string
    timeStart: string
    /** The attendee's user id - the same value Save sends as `assigned_for`. */
    assignedFor?: number | string | null
    entityType?: string | null
    /** The attendee's record (client, employee...) id - never a user id. */
    entityId?: number | string | null
    appointmentId?: number | string | null
}

/**
 * The live availability check's body. It names the attendee the way Save
 * does, by user id. The record id used to go in `assigned_for`, so the check
 * was refused or looked at another user and a clash only showed on Confirm
 * (R2 BUG-073). With no user id known, the record is sent for the API to
 * resolve to its user.
 */
export function availabilityCheckPayload(input: AvailabilityInput): CheckAvailabilityPayload {
    const payload: CheckAvailabilityPayload = { appointment_date: `${input.date} ${input.timeStart}:00` }

    if (input.assignedFor) {
        payload.assigned_for = Number(input.assignedFor)
    } else if (input.entityType && input.entityId) {
        payload.entity_type = input.entityType
        payload.entity_id = Number(input.entityId)
    }

    if (input.appointmentId) {
        payload.id = input.appointmentId
    }

    return payload
}
