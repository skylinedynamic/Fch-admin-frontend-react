import type { ReactElement } from 'react';

export interface ActivityEditModalProps {
    activity: any;
    show: boolean;
    onClose: () => void;
    onUpdated?: () => void;
    isHost?: boolean;
    /** The record the activity is on, for "Want to Assign" (as ActivitySidebar's props). */
    entityType?: string | null;
    partnerId?: number | string | null;
    taskOwner?: { id: number | string; name?: string | null } | null;
}

export default function ActivityEditModal(props: ActivityEditModalProps): ReactElement | null;
