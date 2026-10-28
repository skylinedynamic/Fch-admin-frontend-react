import { TASK_OWNER_UNASSIGNED_TEXT } from '../../../../config/activityTask'
import { getInitials } from './options'

export type TaskOwnerDetails =
    | {
        /** e.g. "Lead Owner", "Partner Agent" (config/activityTask.ts). */
        label: string
        status: 'assigned'
        name: string
        email?: string | null
        phone?: string | null
    }
    | {
        label: string
        /** Nobody holds the role (or the person is not in this team's staff list). */
        status: 'unassigned'
    }

/** Short details of the staff member already responsible for the record. */
export default function TaskOwnerCard({ owner, id = 'activityTaskOwner' }: { owner: TaskOwnerDetails; id?: string }) {
    if (owner.status !== 'assigned') {
        return (
            <div className="acm-owner is-empty" id={id}>
                <span className="acm-owner__avatar" aria-hidden="true">
                    <i className="ri-user-unfollow-line" />
                </span>
                <div className="acm-owner__body">
                    <span className="acm-owner__label">{owner.label}</span>
                    <span className="acm-owner__empty">{TASK_OWNER_UNASSIGNED_TEXT}</span>
                </div>
            </div>
        )
    }

    return (
        <div className="acm-owner" id={id}>
            <span className="acm-owner__avatar" aria-hidden="true">{getInitials(owner.name)}</span>
            <div className="acm-owner__body">
                <span className="acm-owner__label">{owner.label}</span>
                <span className="acm-owner__name">{owner.name}</span>
                {(owner.email || owner.phone) && (
                    <span className="acm-owner__contacts">
                        {owner.email && (
                            <span className="acm-owner__contact" title={owner.email}>
                                <i className="ri-mail-line" aria-hidden="true" />
                                <span className="text-truncate">{owner.email}</span>
                            </span>
                        )}
                        {owner.phone && (
                            <span className="acm-owner__contact">
                                <i className="ri-phone-line" aria-hidden="true" />
                                <span>{owner.phone}</span>
                            </span>
                        )}
                    </span>
                )}
            </div>
        </div>
    )
}
