import { DOCUMENT_STATUS } from '../config/documentStatus';
import { FUNDING_REVIEW_STATUS } from '../config/funding';

/**
 * Badge for a partner's free trial state (used on the Partners list).
 * Active (or no end date, i.e. unlimited) trials read as a positive "Trial" badge;
 * once free_trail_end_date has passed it becomes a "Trial Expired" warning badge.
 */
export const getTrialBadgeConfig = (freeTrialEndDate?: string | null) => {
    if (freeTrialEndDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(freeTrialEndDate);
        end.setHours(0, 0, 0, 0);

        if (today > end) {
            return { label: 'Trial Expired', badgeClass: 'bg-danger-subtle text-danger' };
        }
    }
    return { label: 'Trial', badgeClass: 'bg-success-subtle text-success' };
};

/**
 * Badge for a borrower/client's free trial state (used on the Clients list).
 * Same date logic as getTrialBadgeConfig, but labeled "Free Plan" per product wording
 * for borrowers specifically — partners keep the original "Trial" wording above.
 */
export const getBorrowerFreeEditionBadgeConfig = (freeTrialEndDate?: string | null) => {
    if (freeTrialEndDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(freeTrialEndDate);
        end.setHours(0, 0, 0, 0);

        if (today > end) {
            return { label: 'Free Plan Expired', badgeClass: 'bg-danger-subtle text-danger' };
        }
    }
    return { label: 'Free Plan', badgeClass: 'bg-success-subtle text-success' };
};

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
