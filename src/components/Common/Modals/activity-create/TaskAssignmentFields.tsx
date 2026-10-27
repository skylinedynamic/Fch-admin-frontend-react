import { useMemo } from 'react'
import ActivitySelect from './ActivitySelect'
import DateTimeField from './DateTimeField'
import TaskOwnerCard, { type TaskOwnerDetails } from './TaskOwnerCard'
import { TASK_PRIORITY_SELECT_OPTIONS, TASK_STATUS_SELECT_OPTIONS, getInitials } from './options'

export interface TaskAssignmentValues {
    assigned_to: string | number
    task_due_at: string
    task_priority: string
    task_status: string
}

interface StaffMember {
    id: number | string
    full_name: string
}

interface TaskAssignmentFieldsProps {
    values: TaskAssignmentValues
    onChange: (field: keyof TaskAssignmentValues, value: string) => void
    staff: StaffMember[]
    isLoadingStaff: boolean
    errors: Partial<Record<keyof TaskAssignmentValues, string[]>>
    /** The staff member already responsible for the record, shown above Assigned To. */
    owner?: TaskOwnerDetails | null
}

/** Assigned To, Due Date / Time, Priority and Status inside the Want to Assign card. */
export default function TaskAssignmentFields({ values, onChange, staff, isLoadingStaff, errors, owner }: TaskAssignmentFieldsProps) {
    const staffOptions = useMemo(
        () => staff.map((member) => ({
            value: String(member.id),
            label: member.full_name,
            avatar: getInitials(member.full_name),
        })),
        [staff]
    )

    return (
        <div className="row g-3" id="activityTaskAssignment">
            {owner && (
                <div className="col-12">
                    <TaskOwnerCard owner={owner} />
                </div>
            )}
            <div className="col-md-6">
                <label className="form-label" htmlFor="activityAssignedTo">
                    Assigned To <span className="text-danger">*</span>
                </label>
                <ActivitySelect
                    id="activityAssignedTo"
                    value={String(values.assigned_to ?? '')}
                    options={staffOptions}
                    onChange={(value) => onChange('assigned_to', value)}
                    placeholder="Select staff member"
                    searchable
                    searchPlaceholder="Search staff..."
                    emptyText="No staff members found"
                    loading={isLoadingStaff}
                    disabled={isLoadingStaff}
                    invalid={!!errors.assigned_to}
                />
                {errors.assigned_to && <div className="text-danger mt-1 small">{errors.assigned_to[0]}</div>}
            </div>
            <div className="col-md-6">
                <label className="form-label" htmlFor="activityTaskDueAt">
                    Due Date / Time <span className="text-danger">*</span>
                </label>
                <DateTimeField
                    inputId="activityTaskDueAt"
                    value={values.task_due_at}
                    onChange={(value) => onChange('task_due_at', value)}
                    minDate={new Date()}
                    invalid={!!errors.task_due_at}
                    placeholder="Select due date & time"
                />
                {errors.task_due_at && <div className="text-danger mt-1 small">{errors.task_due_at[0]}</div>}
            </div>
            <div className="col-md-6">
                <label className="form-label" htmlFor="activityTaskPriority">
                    Priority <span className="text-danger">*</span>
                </label>
                <ActivitySelect
                    id="activityTaskPriority"
                    value={values.task_priority}
                    options={TASK_PRIORITY_SELECT_OPTIONS}
                    onChange={(value) => onChange('task_priority', value)}
                    invalid={!!errors.task_priority}
                />
                {errors.task_priority && <div className="text-danger mt-1 small">{errors.task_priority[0]}</div>}
            </div>
            <div className="col-md-6">
                <label className="form-label" htmlFor="activityTaskStatus">
                    Status <span className="text-danger">*</span>
                </label>
                <ActivitySelect
                    id="activityTaskStatus"
                    value={values.task_status}
                    options={TASK_STATUS_SELECT_OPTIONS}
                    onChange={(value) => onChange('task_status', value)}
                    invalid={!!errors.task_status}
                />
                {errors.task_status && <div className="text-danger mt-1 small">{errors.task_status[0]}</div>}
            </div>
        </div>
    )
}
