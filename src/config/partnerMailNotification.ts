/**
 * Partner profile › Mail Notification: where this partner's notification
 * emails go - one recipient for lead notifications, one for client
 * notifications. The tab lays the fields out only for now: fch-api has no
 * field to save them in and does not send to them yet.
 */

/** The partner profile tab id (also `?tab=` in a link to it). */
export const PARTNER_MAIL_NOTIFICATION_TAB = 'mailNotification'

/** The tab's two fields, by the name fch-api is expected to give them. */
export const PARTNER_MAIL_NOTIFICATION_FIELDS = [
  {
    name: 'lead_notification_recipient',
    label: 'Lead Notification Recipient',
    help: "Email address for this partner's lead notifications.",
  },
  {
    name: 'client_notification_recipient',
    label: 'Client Notification Recipient',
    help: "Email address for this partner's client notifications.",
  },
] as const

export type PartnerMailNotificationField = (typeof PARTNER_MAIL_NOTIFICATION_FIELDS)[number]['name']
