import { useNavigate } from 'react-router-dom';
import DeleteBlockedModal, { BlockedItem } from '../../../components/Common/Modals/DeleteBlockedModal';

export type BlockedClient = BlockedItem;

interface ClientDeleteBlockedModalProps {
    show: boolean;
    /** The selected clients that must be kept (they have a paid invoice). */
    blocked: BlockedClient[];
    /** How many clients were selected for deletion. */
    selectedCount: number;
    /** May the user open the client to change the status. */
    canEdit: boolean;
    onClose: () => void;
}

/**
 * Shown instead of the delete confirmation when a selected client must be kept.
 * The way out is to change the client's status. Nothing is deleted.
 */
export default function ClientDeleteBlockedModal({ show, blocked, selectedCount, canEdit, onClose }: ClientDeleteBlockedModalProps) {
    const navigate = useNavigate();
    const single = blocked.length === 1;
    const othersSelected = selectedCount > blocked.length;

    const openClient = (id: BlockedClient['id']) => {
        onClose();
        navigate(`/clients/${id}`);
    };

    const message = single
        ? `${selectedCount === 1 ? 'This client' : blocked[0]?.name} has related records and cannot be deleted. Please change the client's status instead.`
        : 'These clients have related records and cannot be deleted. Please change their status instead.';

    return (
        <DeleteBlockedModal
            show={show}
            title={single ? 'Client Cannot Be Deleted' : 'Clients Cannot Be Deleted'}
            message={message}
            items={blocked}
            onItemClick={canEdit ? openClient : undefined}
            note={othersSelected ? `${single ? 'Unselect this client' : 'Unselect these clients'} to delete the other selected clients.` : undefined}
            primaryAction={single && canEdit ? { label: 'Go to Client', icon: 'ri-user-line', onClick: () => openClient(blocked[0].id) } : undefined}
            onClose={onClose}
        />
    );
}
