import type { ReactElement } from 'react';

export interface ActivityEditModalProps {
    activity: any;
    show: boolean;
    onClose: () => void;
    onUpdated?: () => void;
}

export default function ActivityEditModal(props: ActivityEditModalProps): ReactElement | null;
