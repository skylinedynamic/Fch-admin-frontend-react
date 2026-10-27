import { getInitials } from './options'

export interface TaskOwnerDetails {
    /** e.g. "Lead Owner", "Partner Agent" (config/activityTask.ts). */
    label: string
    name: string
    email?: string | null
    phone?: string | null
}

/** Short details of the staff member already responsible for the record. */
export default function TaskOwnerCard({ owner }: { owner: TaskOwnerDetails }) {
    return (
        <div className="acm-owner" id="activityTaskOwner">
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
