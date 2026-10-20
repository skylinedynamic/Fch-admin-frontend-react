import { useNavigate } from 'react-router-dom';
import DeleteBlockedModal, { BlockedItem } from '../../../components/Common/Modals/DeleteBlockedModal';

export type BlockedLender = BlockedItem;

interface LenderDeleteBlockedModalProps {
    show: boolean;
    /** The selected lenders that must be kept (assigned to a funding request, or in a funding sequence). */
    blocked: BlockedLender[];
    /** How many lenders were selected for deletion. */
    selectedCount: number;
    /** May the user open the lender to change the status. */
    canEdit: boolean;
    onClose: () => void;
}

/**
 * Shown instead of the delete confirmation when a selected lender must be kept.
 * The way out is to change the lender's status. Nothing is deleted.
 */
export default function LenderDeleteBlockedModal({ show, blocked, selectedCount, canEdit, onClose }: LenderDeleteBlockedModalProps) {
    const navigate = useNavigate();
    const single = blocked.length === 1;
    const othersSelected = selectedCount > blocked.length;

    const openLender = (id: BlockedLender['id']) => {
        onClose();
        navigate(`/lenders/${id}`);
    };

    const message = single
        ? `${selectedCount === 1 ? 'This lender' : blocked[0]?.name} has related records and cannot be deleted. Please change the lender's status instead.`
        : 'These lenders have related records and cannot be deleted. Please change their status instead.';

    return (
        <DeleteBlockedModal
            show={show}
            title={single ? 'Lender Cannot Be Deleted' : 'Lenders Cannot Be Deleted'}
            message={message}
            items={blocked}
            onItemClick={canEdit ? openLender : undefined}
            note={othersSelected ? `${single ? 'Unselect this lender' : 'Unselect these lenders'} to delete the other selected lenders.` : undefined}
            primaryAction={single && canEdit ? { label: 'Go to Lender', icon: 'ri-bank-line', onClick: () => openLender(blocked[0].id) } : undefined}
            onClose={onClose}
        />
    );
}
