import { useNavigate } from 'react-router-dom';
import DeleteBlockedModal, { BlockedItem } from '../../../components/Common/Modals/DeleteBlockedModal';

export type BlockedSequence = BlockedItem;

interface FundingSequenceDeleteBlockedModalProps {
    show: boolean;
    /** The selected funding sequences that must be kept (used by a funding request). */
    blocked: BlockedSequence[];
    /** How many funding sequences were selected for deletion. */
    selectedCount: number;
    /** May the user open the funding sequence to change the status. */
    canEdit: boolean;
    onClose: () => void;
}

/**
 * Shown instead of the delete confirmation when a selected funding sequence must be kept.
 * The way out is to change the funding sequence's status. Nothing is deleted.
 */
export default function FundingSequenceDeleteBlockedModal({ show, blocked, selectedCount, canEdit, onClose }: FundingSequenceDeleteBlockedModalProps) {
    const navigate = useNavigate();
    const single = blocked.length === 1;
    const othersSelected = selectedCount > blocked.length;

    const openSequence = (id: BlockedSequence['id']) => {
        onClose();
        navigate(`/funding/${id}`);
    };

    const message = single
        ? `${selectedCount === 1 ? 'This funding sequence' : blocked[0]?.name} has related records and cannot be deleted. Please change the funding sequence's status instead.`
        : 'These funding sequences have related records and cannot be deleted. Please change their status instead.';

    return (
        <DeleteBlockedModal
            show={show}
            title={single ? 'Funding Sequence Cannot Be Deleted' : 'Funding Sequences Cannot Be Deleted'}
            message={message}
            items={blocked}
            onItemClick={canEdit ? openSequence : undefined}
            note={othersSelected ? `${single ? 'Unselect this funding sequence' : 'Unselect these funding sequences'} to delete the other selected funding sequences.` : undefined}
            primaryAction={single && canEdit ? { label: 'Go to Funding Sequence', icon: 'ri-money-dollar-circle-line', onClick: () => openSequence(blocked[0].id) } : undefined}
            onClose={onClose}
        />
    );
}
