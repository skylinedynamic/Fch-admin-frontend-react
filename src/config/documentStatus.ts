export const DOCUMENT_STATUS = {
    UPLOADED: 'Uploaded',
    UNDER_REVIEW: 'Under Review',
    ACCEPTED: 'Accepted',
    REJECTED: 'Rejected',
    PENDING: 'Pending'
} as const;

export type DocumentStatus = typeof DOCUMENT_STATUS[keyof typeof DOCUMENT_STATUS];

export const getDocumentStatusLabel = (status: string | undefined): string => {
    const s = status || DOCUMENT_STATUS.UPLOADED;
    if (s === DOCUMENT_STATUS.UNDER_REVIEW) return 'Under Reviewing';
    return s;
};
