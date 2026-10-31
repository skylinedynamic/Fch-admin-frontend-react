import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { useUpdateTaskStatus } from '../../modules/activity-log/queries'
import { TASK_PRIORITY_TONES, TASK_STATUS_OPTIONS, TASK_STATUS_VISUALS, type TaskStatus } from '../../config/activityTask'
import type { ReminderTask } from '../../config/reminders'
import TaskStatusConfirmModal from './TaskStatusConfirmModal'
import './reminderTaskStatus.css'

/**
 * The task's status as shown. A new pick is confirmed first ("Change task
 * status?"), then saved through the API. Follows a status that changed
 * elsewhere (a Reverb push or a reloaded list).
 */
function useTaskStatusChange(activityLogId: number | string, saved: TaskStatus | null, onChanged?: (status: TaskStatus) => void) {
    const [status, setStatus] = useState<TaskStatus | null>(saved)
    const [pending, setPending] = useState<TaskStatus | null>(null)
    const mutation = useUpdateTaskStatus()

    useEffect(() => setStatus(saved), [saved])

    /** Ask to confirm a new status (nothing for the current one). */
    const request = (next: TaskStatus) => {
        if (next !== status && !mutation.isPending) setPending(next)
    }

    const cancel = useCallback(() => setPending(null), [])

    const confirm = async () => {
        if (!pending) return
        try {
            const response = await mutation.mutateAsync({ activityLogId, status: pending })
            setStatus(pending)
            toast.success(response?.message || 'Task status updated successfully.')
            onChanged?.(pending)
        } catch (error: any) {
            // A 403 is already toasted by the API client.
            if (error?.response?.status !== 403) {
                toast.error(error?.response?.data?.message || 'Failed to update the task status.')
            }
        } finally {
            setPending(null)
        }
    }

    return { status, pending, saving: mutation.isPending, request, confirm, cancel }
}

const statusVisual = (status: TaskStatus | null) => (status ? TASK_STATUS_VISUALS[status] : null)

function StatusBadge({ status, label }: { status: TaskStatus | null; label: string | null }) {
    const tone = statusVisual(status)?.tone ?? 'secondary'
    return (
        <span className={`badge bg-${tone}-subtle text-${tone} fw-semibold`}>
            {status && <i className={`${TASK_STATUS_VISUALS[status].icon} me-1`} aria-hidden="true" />}
            {label ?? TASK_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? '—'}
        </span>
    )
}

interface ReminderTaskStatusProps {
    activityLogId: number | string
    task: ReminderTask
    /** The viewer created or was assigned the task. */
    canUpdate: boolean
    /** The task's summary, named in the confirmation. */
    summary?: string | null
    onChanged?: (status: TaskStatus) => void
}

/**
 * The assigned Task behind a reminder - who has it, from whom, by when - and
 * its progress: Open / In Progress / Complete, which its creator or assignee
 * can change right here (after confirming). Used by the due-reminder popup
 * and Task & Reminder Details.
 */
export default function ReminderTaskStatus({ activityLogId, task, canUpdate, summary, onChanged }: ReminderTaskStatusProps) {
    const { status, pending, saving, request, confirm, cancel } = useTaskStatusChange(activityLogId, task.status, onChanged)
    const priorityTone = task.priority ? TASK_PRIORITY_TONES[task.priority] : 'secondary'

    return (
        <div className="reminder-task mb-3 fs-13" role="group" aria-label="Task progress">
            <div className="reminder-task__head">
                <span className="reminder-task__icon" aria-hidden="true"><i className="ri-task-line"></i></span>
                <h6 className="reminder-task__title">Task</h6>
            </div>

            <dl className="reminder-task__meta">
                <div>
                    <dt>Assigned To</dt>
                    <dd>{task.assigned_to_name ?? '—'}</dd>
                </div>
                <div>
                    <dt>Assigned By</dt>
                    <dd>{task.assigned_by_name ?? '—'}</dd>
                </div>
                <div>
                    <dt>Due</dt>
                    <dd>{task.due_date_display ?? '—'}</dd>
                </div>
                <div>
                    <dt>Priority</dt>
                    <dd><span className={`badge bg-${priorityTone}-subtle text-${priorityTone} fw-semibold`}>{task.priority_label ?? '—'}</span></dd>
                </div>
            </dl>

            <div className="reminder-task__label">Progress</div>
            {canUpdate ? (
                <div className="reminder-task__progress">
                    {TASK_STATUS_OPTIONS.map((opt) => {
                        const { icon, tone } = TASK_STATUS_VISUALS[opt.value]
                        const active = status === opt.value
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                className={`btn btn-sm fw-semibold ${active ? `btn-${tone}` : `reminder-task__step text-${tone}`}`}
                                aria-pressed={active}
                                disabled={saving}
                                onClick={() => request(opt.value)}
                            >
                                <i className={`${icon} me-1`} aria-hidden="true"></i>
                                {opt.label}
                            </button>
                        )
                    })}
                </div>
            ) : (
                <StatusBadge status={status} label={status === task.status ? task.status_label : null} />
            )}

            <TaskStatusConfirmModal
                open={!!pending}
                summary={summary}
                from={status}
                to={pending}
                saving={saving}
                onConfirm={confirm}
                onCancel={cancel}
            />
        </div>
    )
}
