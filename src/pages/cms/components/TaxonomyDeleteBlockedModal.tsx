import DeleteBlockedModal from '../../../components/Common/Modals/DeleteBlockedModal';

/** A category or tag the API kept because a blog post still uses it. */
export interface BlockedTaxonomy {
    name: string;
    /** Posts using it, when known (the list sends blogs_count); otherwise "a blog post". */
    count?: number;
}

/** The record the API names in a 422 refusal (errors.blocked), if any. */
export const blockedFromError = (error: any): { id: number; name: string } | null => {
    const blocked = error?.response?.data?.errors?.blocked;
    return error?.response?.status === 422 && Array.isArray(blocked) && blocked.length > 0 ? blocked[0] : null;
};

interface Props {
    /** "Category" or "Tag". */
    kind: string;
    blocked: BlockedTaxonomy | null;
    onClose: () => void;
}

/**
 * Shown instead of the delete confirmation when the category or tag is on a
 * blog post - nothing is deleted (BUG-059).
 */
export default function TaxonomyDeleteBlockedModal({ kind, blocked, onClose }: Props) {
    const posts = blocked?.count ? `${blocked.count} blog post${blocked.count === 1 ? '' : 's'}` : 'a blog post';
    const fix = kind === 'Category' ? 'Move those posts to another category first.' : 'Remove it from those posts first.';

    return (
        <DeleteBlockedModal
            show={blocked !== null}
            title={`${kind} Cannot Be Deleted`}
            message={blocked ? `"${blocked.name}" is used by ${posts} and cannot be deleted. ${fix}` : ''}
            onClose={onClose}
        />
    );
}
