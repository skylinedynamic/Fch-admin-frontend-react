import { LOG_TYPE_ACTIVITY, LOG_TYPE_EMAIL_SENT, TYPE_EMAIL } from '../../../config/appConfig'

/** The fields of an activity-log row (fch-api ActivityLogResource) this panel reads. */
export interface ActivityEntry {
  log_type?: string | null
  log_type_raw?: string | null
  to_emails?: string[] | string | null
  subject?: string | null
  reference?: string | null
  activity_date?: string | null
  assigned_user?: { id: number; name: string } | null
}

/** `log_type` is the API's label ("Email Sent"), `log_type_raw` the type. */
const logTypeOf = (activity: ActivityEntry) => (activity.log_type_raw || activity.log_type || '').toLowerCase()

export const isEmailEntry = (activity: ActivityEntry) =>
  [TYPE_EMAIL, LOG_TYPE_EMAIL_SENT, 'email sent'].includes(logTypeOf(activity))

/** An event someone logged by hand (Call, Meeting, Task...). */
export const isEventEntry = (activity: ActivityEntry) => logTypeOf(activity) === LOG_TYPE_ACTIVITY

const recipientsOf = (toEmails: ActivityEntry['to_emails']) =>
  Array.isArray(toEmails) ? toEmails.filter(Boolean).join(', ') : toEmails || ''

/** The label/value pairs shown when an email or event entry is opened. */
export function entryDetails(activity: ActivityEntry, formatDate: (value: string) => string): [string, string][] {
  const rows: [string, string | null | undefined][] = isEmailEntry(activity)
    ? [
        ['To', recipientsOf(activity.to_emails)],
        ['Subject', activity.subject],
      ]
    : isEventEntry(activity)
      ? [
          ['Type', activity.reference],
          ['Date', activity.activity_date ? formatDate(activity.activity_date) : null],
          ['Assigned to', activity.assigned_user?.name],
          ['To', recipientsOf(activity.to_emails)],
        ]
      : []

  return rows.filter((row): row is [string, string] => !!row[1])
}

interface ActivityEntryDetailsProps {
  activity: ActivityEntry
  formatDate: (value: string) => string
}

/**
 * The body of an opened email or event entry in the activity sidebar: who it
 * went to and its subject (email), or its type, date and assignee (event) -
 * the row itself only says who created it and when.
 */
export default function ActivityEntryDetails({ activity, formatDate }: ActivityEntryDetailsProps) {
  const details = entryDetails(activity, formatDate)
  if (details.length === 0) return null

  return (
    <dl className="activity-entry-details fs-12 mb-2">
      {details.map(([label, value]) => (
        <div key={label} className="activity-entry-details__row">
          <dt className="text-muted fw-medium">{label}</dt>
          <dd className="mb-0 text-dark text-break">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
