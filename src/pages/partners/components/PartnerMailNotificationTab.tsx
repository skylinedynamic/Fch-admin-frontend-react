import { useState } from 'react'
import { PARTNER_MAIL_NOTIFICATION_FIELDS, type PartnerMailNotificationField } from '../../../config/partnerMailNotification'

/**
 * Partner profile › Mail Notification: a Lead Notification Recipient and a
 * Client Notification Recipient email. Laid out only for now - the values are
 * held on the page, not saved (fch-api has no field for them yet), so the tab
 * has no Save button and the page's Update button is not shown on it.
 */
export default function PartnerMailNotificationTab() {
  const [values, setValues] = useState<Record<PartnerMailNotificationField, string>>({
    lead_notification_recipient: '',
    client_notification_recipient: '',
  })

  return (
    <div className="partner-mail-notification">
      <h5 className="mb-1">Mail Notification</h5>
      <p className="partner-mail-notification__intro fs-13">Where this partner&apos;s notification emails are sent.</p>

      <div className="row g-3">
        {PARTNER_MAIL_NOTIFICATION_FIELDS.map((field) => (
          <div key={field.name} className="col-lg-6">
            <label htmlFor={`partner-${field.name}`} className="form-label">
              {field.label}
            </label>
            <input
              id={`partner-${field.name}`}
              name={field.name}
              type="email"
              className="form-control"
              placeholder="name@example.com"
              autoComplete="off"
              value={values[field.name]}
              aria-describedby={`partner-${field.name}-help`}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
            />
            <div id={`partner-${field.name}-help`} className="form-text">
              {field.help}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
