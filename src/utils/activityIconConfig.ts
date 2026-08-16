export interface AvatarConfig {
    icon: string;
    bgClass: string;
}

/**
 * Gets the icon and color configuration for an activity log based on its type and reference.
 * Returns null if no specific configuration is found, allowing the UI to fallback to dynamic images or initials.
 */
import {
    TYPE_EMAIL,
    TYPE_ACTIVITY,
    LOG_TYPE_EMAIL_UPDATE,
    LOG_TYPE_EMAIL_SENT,
    LOG_TYPE_ACTIVITY,
    LOG_TYPE_INVOICE_CREATE,
    LOG_TYPE_DOCUMENT_UPLOAD,
    LOG_TYPE_CHECKLIST_UPDATE,
    LOG_TYPE_PARTNER_CREATE,
    LOG_TYPE_PARTNER_UPDATE,
    LOG_TYPE_PARTNER_CONTACT_UPDATE,
    LOG_TYPE_PARTNER_DELETE,
    LOG_TYPE_PARTNER_PAYMENT,
    LOG_TYPE_BORROWER_CREATE,
    LOG_TYPE_BORROWER_UPDATE,
    LOG_TYPE_BORROWER_CONTACT_UPDATE,
    LOG_TYPE_BORROWER_PAYMENT,
    LOG_TYPE_BUSINESS_UPDATE,
    LOG_TYPE_LEAD_CREATE,
    LOG_TYPE_LEAD_UPDATE,
    LOG_TYPE_LEAD_DETAILS_UPDATE,
    LOG_TYPE_LEAD_CONTACT_UPDATE,
    LOG_TYPE_BATCH_PROCESS,
    LOG_TYPE_APPOINTMENT_CREATE,
    LOG_TYPE_APPOINTMENT_UPDATE,
    LOG_TYPE_APPOINTMENT_DELETE,
    LOG_TYPE_TASK_VERIFICATION,
    LOG_TYPE_FUNDING_REQUEST_CREATE,
    LOG_TYPE_FUNDING_REQUEST_STATUS_UPDATE,
    LOG_TYPE_FUNDING_APPLICATION_STATUS_UPDATE
} from '../config/appConfig';

export const getAvatarConfig = (logTypeRaw: string, reference: string = ''): AvatarConfig | null => {
    // 1. Specific Actions
    if (logTypeRaw === TYPE_EMAIL || logTypeRaw === LOG_TYPE_EMAIL_SENT || logTypeRaw === LOG_TYPE_EMAIL_UPDATE) {
        return { icon: 'ri-mail-send-line', bgClass: 'bg-primary-subtle text-primary' };
    }

    if (logTypeRaw === TYPE_ACTIVITY || logTypeRaw === LOG_TYPE_ACTIVITY) {
        const ref = (reference || '').toLowerCase();
        switch (ref) {
            case 'call': return { icon: 'ri-phone-line', bgClass: 'bg-success-subtle text-success' };
            case 'meeting': return { icon: 'ri-group-line', bgClass: 'bg-warning-subtle text-warning' };
            case 'email': return { icon: 'ri-mail-line', bgClass: 'bg-primary-subtle text-primary' };
            case 'task_verification': return { icon: 'ri-shield-check-line', bgClass: 'bg-primary-subtle text-primary' };
            case 'event':
            default: return { icon: 'ri-calendar-event-line', bgClass: 'bg-info-subtle text-info' };
        }
    }

    if (logTypeRaw === LOG_TYPE_INVOICE_CREATE) {
        return { icon: 'ri-file-list-3-line', bgClass: 'bg-secondary-subtle text-secondary' };
    }

    if (logTypeRaw === LOG_TYPE_FUNDING_REQUEST_CREATE) {
        return { icon: 'ri-file-add-line', bgClass: 'bg-info-subtle text-info' };
    }

    if (logTypeRaw === LOG_TYPE_FUNDING_REQUEST_STATUS_UPDATE || logTypeRaw === LOG_TYPE_FUNDING_APPLICATION_STATUS_UPDATE) {
        return { icon: 'ri-refresh-line', bgClass: 'bg-warning-subtle text-warning' };
    }

    if (logTypeRaw === LOG_TYPE_APPOINTMENT_CREATE || logTypeRaw === LOG_TYPE_APPOINTMENT_UPDATE || logTypeRaw === LOG_TYPE_APPOINTMENT_DELETE) {
        return { icon: 'ri-calendar-event-line', bgClass: 'bg-purple-subtle text-purple' };
    }

    if (logTypeRaw === LOG_TYPE_DOCUMENT_UPLOAD || logTypeRaw === LOG_TYPE_CHECKLIST_UPDATE) {
        return { icon: 'ri-folder-2-line', bgClass: 'bg-info-subtle text-info' };
    }

    if (logTypeRaw === LOG_TYPE_TASK_VERIFICATION) {
        return { icon: 'ri-survey-line', bgClass: 'bg-primary-subtle text-primary' };
    }

    // 2. Base Entity Avatars
    const isPartnerType = [
        LOG_TYPE_PARTNER_CREATE, LOG_TYPE_PARTNER_UPDATE, LOG_TYPE_PARTNER_CONTACT_UPDATE,
        LOG_TYPE_PARTNER_DELETE, LOG_TYPE_PARTNER_PAYMENT
    ].includes(logTypeRaw);

    if (isPartnerType) {
        return { icon: 'ri-team-line', bgClass: 'bg-info-subtle text-info' };
    }

    const isBorrowerType = [
        LOG_TYPE_BORROWER_CREATE, LOG_TYPE_BORROWER_UPDATE, LOG_TYPE_BORROWER_CONTACT_UPDATE,
        LOG_TYPE_BORROWER_PAYMENT, LOG_TYPE_BUSINESS_UPDATE
    ].includes(logTypeRaw);

    if (isBorrowerType) {
        return { icon: 'ri-user-line', bgClass: 'bg-success-subtle text-success' };
    }

    const isLeadType = [
        LOG_TYPE_LEAD_CREATE, LOG_TYPE_LEAD_UPDATE, LOG_TYPE_LEAD_DETAILS_UPDATE, LOG_TYPE_LEAD_CONTACT_UPDATE
    ].includes(logTypeRaw);

    if (isLeadType) {
        return { icon: 'ri-sticky-note-line', bgClass: 'bg-warning-subtle text-warning' };
    }

    return null;
};
