import { DOCUMENT_STATUS } from '../config/documentStatus';
import { FUNDING_REVIEW_STATUS } from '../config/funding';

export const getDocStatusBadgeConfig = (status: string) => {
    if (!status || status === 'Not Uploaded') {
        return {
            label: 'Not Uploaded',
            badgeClass: 'bg-secondary-subtle text-secondary',
            iconClass: 'ri-checkbox-blank-circle-line'
        };
    }
    if ([DOCUMENT_STATUS.UPLOADED, DOCUMENT_STATUS.ACCEPTED, FUNDING_REVIEW_STATUS.APPROVED].includes(status)) {
        return {
            label: 'Uploaded',
            badgeClass: 'bg-success-subtle text-success',
            iconClass: 'ri-checkbox-circle-fill'
        };
    }
    return {
        label: status,
        badgeClass: 'bg-warning-subtle text-warning',
        iconClass: 'ri-loader-4-line'
    };
};
