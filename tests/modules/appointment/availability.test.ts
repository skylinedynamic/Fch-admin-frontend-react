import { describe, it, expect } from 'vitest'
import { availabilityCheckPayload } from '../../../src/modules/appointment/availability'

/**
 * Defect: R2 BUG-073 - the form's live availability check sent the client's
 * record id (entity_id 178) as `assigned_for`, while Save sent the client's
 * user id (321). The API refused the check ("Assigned user does not exist.")
 * or checked another user, so a clash only showed after Confirm.
 */
describe('availabilityCheckPayload', () => {
    const base = { date: '2026-11-01', timeStart: '08:30' }

    it('names the attendee by user id, the same one Save sends', () => {
        expect(availabilityCheckPayload({ ...base, assignedFor: '321', entityType: 'borrower', entityId: '178' })).toEqual({
            appointment_date: '2026-11-01 08:30:00',
            assigned_for: 321,
        })
    })

    it('never sends the record id as the user id', () => {
        const payload = availabilityCheckPayload({ ...base, assignedFor: 321, entityType: 'borrower', entityId: 178 })
        expect(payload.assigned_for).not.toBe(178)
    })

    it('falls back to the record (type + id) when no user id is known, for the API to resolve', () => {
        expect(availabilityCheckPayload({ ...base, assignedFor: '', entityType: 'borrower', entityId: '178' })).toEqual({
            appointment_date: '2026-11-01 08:30:00',
            entity_type: 'borrower',
            entity_id: 178,
        })
    })

    it('checks only the booker when nobody is picked', () => {
        expect(availabilityCheckPayload({ ...base })).toEqual({ appointment_date: '2026-11-01 08:30:00' })
    })

    it('carries the appointment being edited', () => {
        expect(availabilityCheckPayload({ ...base, assignedFor: 321, appointmentId: 52 })).toEqual({
            appointment_date: '2026-11-01 08:30:00',
            assigned_for: 321,
            id: 52,
        })
    })
})
