import { useState } from 'react';
import { toast } from 'react-toastify';
import DeleteConfirmationModal from '../../../components/Common/Modals/DeleteConfirmationModal';
import DeleteBlockedModal, { type BlockedItem } from '../../../components/Common/Modals/DeleteBlockedModal';
import { useDeleteEmbedFormSubmissions, type ConvertedSubmission } from '../../../modules/embed-form';

type Props = {
    /** The ticked applications; converted ones cannot be ticked. */
    selected: { id: number }[];
    /** Called once they are deleted, to clear the selection and reload. */
    onDeleted: () => void;
};

/**
 * "Delete Selected (n)" for Loan Applications, with its confirmation and,
 * if the API refuses because one was converted meanwhile, which ones.
 */
export default function DeleteSelectedSubmissions({ selected, onDeleted }: Props) {
    const [confirming, setConfirming] = useState(false);
    const [blocked, setBlocked] = useState<{ message: string; items: BlockedItem[] } | null>(null);
    const remove = useDeleteEmbedFormSubmissions();

    const count = selected.length;
    if (count === 0 && !blocked) return null;

    const handleConfirm = async () => {
        try {
            const res = await remove.mutateAsync(selected.map((s) => s.id));
            toast.success(res?.message || 'Applications deleted successfully.');
            setConfirming(false);
            onDeleted();
        } catch (error: any) {
            setConfirming(false);
            const converted: ConvertedSubmission[] = error?.response?.data?.errors?.converted ?? [];
            if (converted.length > 0) {
                setBlocked({ message: error.response.data.message, items: converted });
            } else {
                toast.error(error?.response?.data?.message || 'Failed to delete the applications.');
            }
        }
    };

    return (
        <>
            {/* The same Actions button as Partners and Clients, once rows are ticked. */}
            {count > 0 && (
                <div className="btn-group">
                    <button type="button" className="btn bg-success text-white fw-medium">Actions</button>
                    <button
                        type="button"
                        className="btn bg-success text-white fw-medium dropdown-toggle dropdown-toggle-split"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                    >
                        <span className="visually-hidden">Toggle Dropdown</span>
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end">
                        <li>
                            <button type="button" className="dropdown-item text-danger" onClick={() => setConfirming(true)}>
                                <i className="ri-delete-bin-6-line me-1 align-bottom" /> Delete Selected
                            </button>
                        </li>
                    </ul>
                </div>
            )}

            <DeleteConfirmationModal
                show={confirming}
                onConfirm={handleConfirm}
                onClose={() => setConfirming(false)}
                loading={remove.isPending}
                text={count === 1 ? 'The selected application will be deleted.' : `The ${count} selected applications will be deleted.`}
            />

            <DeleteBlockedModal
                show={!!blocked}
                tone="danger"
                title={(blocked?.items.length ?? 0) === 1 ? 'Application Cannot Be Deleted' : 'Applications Cannot Be Deleted'}
                message={blocked?.message ?? ''}
                items={blocked?.items ?? []}
                onClose={() => setBlocked(null)}
            />
        </>
    );
}
