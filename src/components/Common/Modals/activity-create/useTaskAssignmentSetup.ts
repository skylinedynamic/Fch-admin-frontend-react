import { useTaskAssignees } from '../../../../modules/activity-log/queries'
import { ENTITY_TYPE_PARTNER } from '../../../../config/appConfig'
import { TASK_OWNER_LABELS, type TaskOwnerRef } from '../../../../config/activityTask'
import type { TaskOwnerDetails } from './TaskOwnerCard'

interface TaskAssignmentSetupOptions {
    /** The kind of record the activity is on ("Lead", "Partner", ...). */
    entityType?: string | null
    /** The partner that owns the record. */
    partnerId?: number | string | null
    /** The record's own responsible staff member, shown above Assigned To. */
    ownerRef?: TaskOwnerRef | null
    /** Load the staff list only while "Want to Assign" is on. */
    enabled: boolean
}

/**
 * What "Want to Assign" shows, the same on New Activity and Edit: the staff
 * of the partner that owns the record (the Partner page sends none, so the
 * API gives the host's own staff), and the record's responsible staff member
 * - details from that list, else the name the page gave, else an empty state.
 * No owner card on records without such a role (e.g. Contacts / Employees).
 */
export function useTaskAssignmentSetup({ entityType, partnerId, ownerRef, enabled }: TaskAssignmentSetupOptions) {
    const teamPartnerId = entityType !== ENTITY_TYPE_PARTNER && partnerId ? Number(partnerId) : null
    const { data: staff = [], isLoading: isLoadingStaff } = useTaskAssignees(teamPartnerId, enabled)

    const owner = ((): TaskOwnerDetails | null => {
        const label = entityType ? TASK_OWNER_LABELS[entityType] : undefined
        if (!label) return null
        if (!ownerRef?.id) return { label, status: 'unassigned' }
        const member = staff.find((m) => String(m.id) === String(ownerRef.id))
        const name = member?.full_name || ownerRef.name
        // Funding pages give only an id: wait for the staff list before showing the empty state.
        if (!name) return isLoadingStaff ? null : { label, status: 'unassigned' }
        return {
            label,
            status: 'assigned',
            name,
            email: member?.email,
            phone: member?.phone_number,
        }
    })()

    return { staff, isLoadingStaff, owner }
}
