import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { toast } from 'react-toastify'
import PartnerMailNotificationLoader from '../../../components/Loader/PartnerMailNotificationLoader'
import { PARTNER_MAIL_NOTIFICATION_FORM_ID } from '../../../config/partnerMailNotification'
import { usePartnerMailNotification, useUpdatePartnerMailNotification } from '../../../modules/partner/queries'
import type { PartnerNotificationRecipient } from '../../../modules/partner/types'

/** Whether the form has unsaved changes and is saving - for the page header's Save button. */
export interface PartnerMailNotificationFormState {
  dirty: boolean
  saving: boolean
}

interface PartnerMailNotificationTabProps {
  partnerId: string | number
  /** The partner's own email, used for any type left empty. */
  partnerEmail?: string | null
  onStateChange?: (state: PartnerMailNotificationFormState) => void
}

type FieldErrors = Record<string, string>

/** One list while loading - a new `[]` each render would reset the form on every render. */
const NO_TYPES: PartnerNotificationRecipient[] = []

/** 422 `errors` keyed `recipients.{type}` → by type. */
const fieldErrorsFrom = (error: unknown): FieldErrors | null => {
  const response = (error as { response?: { status?: number; data?: { errors?: Record<string, string | string[]> } } })?.response
  if (response?.status !== 422 || !response.data?.errors) return null
  const byType: FieldErrors = {}
  for (const [key, message] of Object.entries(response.data.errors)) {
    const type = key.replace(/^recipients\./, '')
    byType[type] = Array.isArray(message) ? message[0] : message
  }
  return byType
}

/**
 * Partner profile › Mail Notification: one email field per notification type
 * (from the API, in its order - Lead / Client Notification Recipient, with
 * the Partner Notification Recipient first on the host's own profile). Empty
 * sends that type's emails to the partner's own address. Saved by the page
 * header's Save button (form id PARTNER_MAIL_NOTIFICATION_FORM_ID); a refused
 * address is shown under its field.
 */
export default function PartnerMailNotificationTab({ partnerId, partnerEmail, onStateChange }: PartnerMailNotificationTabProps) {
  const { data: types = NO_TYPES, isPending, isError } = usePartnerMailNotification(partnerId)
  const save = useUpdatePartnerMailNotification()
  // Only what was typed; a field not touched shows what is saved.
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<FieldErrors>({})

  const saved = useMemo(() => Object.fromEntries(types.map((t) => [t.type, t.email ?? ''])), [types])
  const values = useMemo(() => ({ ...saved, ...edits }), [saved, edits])

  const dirty = types.some((t) => (values[t.type] ?? '').trim() !== (saved[t.type] ?? ''))

  useEffect(() => {
    onStateChange?.({ dirty, saving: save.isPending })
  }, [dirty, save.isPending, onStateChange])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!dirty || save.isPending) return
    setErrors({})
    const recipients = Object.fromEntries(types.map((t) => [t.type, (values[t.type] ?? '').trim() || null]))
    try {
      const res = await save.mutateAsync({ id: partnerId, recipients })
      // The saved list (from the API) is shown now.
      setEdits({})
      toast.success(res?.message || 'Mail notification recipients updated successfully.')
    } catch (error) {
      const fieldErrors = fieldErrorsFrom(error)
      if (fieldErrors) setErrors(fieldErrors)
      else toast.error('Failed to save the mail notification recipients')
    }
  }

  if (isPending) {
    return <PartnerMailNotificationLoader />
  }

  if (isError) {
    return <p className="text-danger mb-0">The mail notification recipients could not be loaded.</p>
  }

  return (
    <form id={PARTNER_MAIL_NOTIFICATION_FORM_ID} className="partner-mail-notification" onSubmit={handleSubmit} noValidate>
      <h5 className="mb-1">Mail Notification</h5>
      <p className="partner-mail-notification__intro fs-13">
        Where this partner&apos;s notification emails are sent.
        {partnerEmail ? <> Leave a field empty to send those emails to the partner&apos;s email, {partnerEmail}.</> : null}
      </p>

      <div className="row g-3">
        {types.map((t) => {
          const id = `partner-notification-${t.type}`
          const error = errors[t.type]
          return (
            <div key={t.type} className="col-12">
              <label htmlFor={id} className="form-label">
                {t.label}
              </label>
              <input
                id={id}
                name={t.type}
                type="email"
                className={`form-control ${error ? 'is-invalid' : ''}`}
                placeholder={partnerEmail || 'name@example.com'}
                autoComplete="off"
                value={values[t.type] ?? ''}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
                onChange={(e) => {
                  setEdits((prev) => ({ ...prev, [t.type]: e.target.value }))
                  if (error) setErrors((prev) => ({ ...prev, [t.type]: '' }))
                }}
              />
              {error && (
                <div id={`${id}-error`} className="invalid-feedback d-block">
                  {error}
                </div>
              )}
              <div id={`${id}-help`} className="form-text">
                {t.help}
              </div>
            </div>
          )
        })}
      </div>
    </form>
  )
}
