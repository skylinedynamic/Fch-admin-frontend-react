import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { TASK_STATUS_OPTIONS, TASK_STATUS_VISUALS, type TaskStatus } from '../../config/activityTask'
import './reminderTaskStatus.css'

interface TaskStatusConfirmModalProps {
    open: boolean
    /** The task's summary, so it is clear which task changes. */
    summary?: string | null
    from: TaskStatus | null
    to: TaskStatus | null
    saving: boolean
    onConfirm: () => void
    onCancel: () => void
}

const statusLabel = (status: TaskStatus | null) => TASK_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? '—'

function StatusPill({ status }: { status: TaskStatus | null }) {
    const visual = status ? TASK_STATUS_VISUALS[status] : null
    const tone = visual?.tone ?? 'secondary'
    return (
        <span className={`badge bg-${tone}-subtle text-${tone} fw-semibold`}>
            {visual && <i className={`${visual.icon} me-1`} aria-hidden="true" />}
            {statusLabel(status)}
        </span>
    )
}

/**
 * "Change task status?" before a task's status is saved. Its own portal above
 * everything (no Bootstrap JS), so it stacks safely over the reminder popup
 * and the Task & Reminder Details modal, and keeps its clicks to itself so a
 * table row behind it never opens.
 */
export default function TaskStatusConfirmModal({ open, summary, from, to, saving, onConfirm, onCancel }: TaskStatusConfirmModalProps) {
    const confirmRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (!open) return
        confirmRef.current?.focus()
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !saving) onCancel()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [open, saving, onCancel])

    if (!open || typeof document === 'undefined') return null

    const tone = to ? TASK_STATUS_VISUALS[to].tone : 'primary'

    return createPortal(
        <div
            className="task-status-confirm flip"
            onClick={(e) => {
                e.stopPropagation()
                if (e.target === e.currentTarget && !saving) onCancel()
            }}
        >
            <div className="task-status-confirm__dialog" role="dialog" aria-modal="true" aria-labelledby="taskStatusConfirmTitle">
                <span className={`task-status-confirm__icon bg-${tone}-subtle text-${tone}`} aria-hidden="true">
                    <i className={to ? TASK_STATUS_VISUALS[to].icon : 'ri-task-line'} />
                </span>
                <h5 className="task-status-confirm__title" id="taskStatusConfirmTitle">Change task status?</h5>
                {summary && <p className="task-status-confirm__summary">{summary}</p>}
                <div className="task-status-confirm__change">
                    <StatusPill status={from} />
                    <i className="ri-arrow-right-line text-muted" aria-hidden="true" />
                    <StatusPill status={to} />
                </div>
                <p className="task-status-confirm__note">The other person on this task will be notified.</p>
                <div className="task-status-confirm__actions">
                    <button type="button" className="btn btn-light" onClick={onCancel} disabled={saving}>
                        Cancel
                    </button>
                    <button ref={confirmRef} type="button" className={`btn btn-${tone}`} onClick={onConfirm} disabled={saving}>
                        {saving
                            ? <><span className="spinner-border spinner-border-sm me-1" aria-hidden="true"></span> Saving...</>
                            : 'Yes, change it'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
