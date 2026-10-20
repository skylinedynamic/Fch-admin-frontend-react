import { useNavigate } from 'react-router-dom';
import DeleteBlockedModal, { BlockedItem } from '../../../components/Common/Modals/DeleteBlockedModal';

export type BlockedPartner = BlockedItem;

interface PartnerDeleteBlockedModalProps {
    show: boolean;
    /** The selected partners that must be kept (a paid invoice, or clients/users under them). */
    blocked: BlockedPartner[];
    /** How many partners were selected for deletion. */
    selectedCount: number;
    /** May the user open the partner to change the status. */
    canEdit: boolean;
    onClose: () => void;
}

/**
 * Shown instead of the delete confirmation when a selected partner must be kept.
 * The way out is to change the partner's status. Nothing is deleted.
 */
export default function PartnerDeleteBlockedModal({ show, blocked, selectedCount, canEdit, onClose }: PartnerDeleteBlockedModalProps) {
    const navigate = useNavigate();
    const single = blocked.length === 1;
    const othersSelected = selectedCount > blocked.length;

    const openPartner = (id: BlockedPartner['id']) => {
        onClose();
        navigate(`/partners/${id}`);
    };

    const message = single
        ? `${selectedCount === 1 ? 'This partner' : blocked[0]?.name} has related records and cannot be deleted. Please change the partner's status instead.`
        : 'These partners have related records and cannot be deleted. Please change their status instead.';

    return (
        <DeleteBlockedModal
            show={show}
            title={single ? 'Partner Cannot Be Deleted' : 'Partners Cannot Be Deleted'}
            message={message}
            items={blocked}
            onItemClick={canEdit ? openPartner : undefined}
            note={othersSelected ? `${single ? 'Unselect this partner' : 'Unselect these partners'} to delete the other selected partners.` : undefined}
            primaryAction={single && canEdit ? { label: 'Go to Partner', icon: 'ri-user-line', onClick: () => openPartner(blocked[0].id) } : undefined}
            onClose={onClose}
        />
    );
}
