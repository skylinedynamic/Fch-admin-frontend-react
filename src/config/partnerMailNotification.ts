/**
 * Partner profile › Mail Notification: where this partner's notification emails
 * go, one recipient per notification type (fch-api
 * /admin/partners/{id}/mail-notification). The types, their labels and help
 * come from the API, so a new type needs no change here.
 */

/** The partner profile tab id (also `?tab=` in a link to it). */
export const PARTNER_MAIL_NOTIFICATION_TAB = 'mailNotification'

/** The tab's form, submitted by the page header's Save Mail Notification button. */
export const PARTNER_MAIL_NOTIFICATION_FORM_ID = 'partner-mail-notification-form'
