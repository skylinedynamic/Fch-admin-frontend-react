import {
    ENTITY_TYPE_FUNDING_REQUEST, ENTITY_TYPE_PARTNER,
    TARGET_RECIPIENT_BORROWER, TARGET_RECIPIENT_HOST,
    FCH_SUPPORT_EMAIL,
} from '../config/appConfig';

/** What ActivitySidebar puts on `window._activityEntityContext` before New Email opens. */
export interface EmailRecipientContext {
    entityType?: string;
    isHost?: boolean;
    borrowerEmail?: string | null;
    partnerEmail?: string | null;
    hostEmail?: string | null;
}

export interface EmailRecipient {
    email: string;
    target: typeof TARGET_RECIPIENT_HOST | typeof TARGET_RECIPIENT_BORROWER;
}

/**
 * Who New Email is addressed to when it opens. A host on a client's activity
 * gets the client's email; it used to be left empty when no partner email was
 * in the context.
 */
export const initialEmailRecipient = (ctx: EmailRecipientContext): EmailRecipient => {
    if (ctx.entityType === ENTITY_TYPE_PARTNER) {
        return { email: ctx.partnerEmail === undefined ? FCH_SUPPORT_EMAIL : (ctx.partnerEmail || ''), target: TARGET_RECIPIENT_BORROWER };
    }
    if (ctx.entityType === ENTITY_TYPE_FUNDING_REQUEST) {
        return { email: ctx.borrowerEmail || '', target: TARGET_RECIPIENT_BORROWER };
    }
    if (ctx.isHost) {
        if (ctx.partnerEmail) {
            return { email: ctx.partnerEmail, target: TARGET_RECIPIENT_HOST };
        }
        return { email: ctx.borrowerEmail || '', target: TARGET_RECIPIENT_BORROWER };
    }
    if (ctx.borrowerEmail === undefined) {
        return { email: ctx.hostEmail || '', target: TARGET_RECIPIENT_HOST };
    }
    return { email: ctx.borrowerEmail || '', target: TARGET_RECIPIENT_BORROWER };
};
