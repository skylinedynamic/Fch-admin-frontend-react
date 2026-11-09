import React from 'react'
import { AUDIT_CONTEXT_LABELS, AUDIT_EVENT_ICON, AUDIT_TEXT } from '../../../../../config/auditConfig'
import type { AuditEvent } from '../../../../../modules/application-audit'

const EMPTY = <span className="text-muted">-</span>

/** When, in the viewer's own time zone; the API keeps UTC. */
export const WhenCell = (event: AuditEvent) => {
  const date = new Date(event.occurred_at)
  return (
    <span className="text-nowrap">
      {Number.isNaN(date.getTime()) ? event.occurred_at : date.toLocaleString()}
      <span className="d-block text-muted fs-12">#{event.id}</span>
    </span>
  )
}

export const EventCell = (event: AuditEvent) => (
  <div>
    <span className="d-inline-flex align-items-center gap-1 fw-medium text-nowrap">
      <i className={`${AUDIT_EVENT_ICON[event.event] ?? 'ri-record-circle-line'} text-primary fs-15`} aria-hidden="true"></i>
      {event.event_label}
    </span>
    {(event.is_legacy || event.context?.password_protected === true) && (
      <div className="d-flex flex-wrap gap-1 mt-1">
        {event.is_legacy && <span className="badge bg-light text-muted border">{AUDIT_TEXT.IMPORTED}</span>}
        {event.context?.password_protected === true && <span className="badge bg-warning-subtle text-warning">{AUDIT_TEXT.PASSWORD_PROTECTED}</span>}
      </div>
    )}
  </div>
)

export const ActorCell = (event: AuditEvent) => (
  <div className="text-nowrap">
    {event.actor?.name || EMPTY}
    {(event.actor?.type || event.ip_address) && (
      <span className="d-block text-muted fs-12">
        {[event.actor?.type, event.ip_address].filter(Boolean).join(' · ')}
      </span>
    )}
  </div>
)

/** Each changed field before and after (SSNs as the API masked them), then the event's details. */
export const DetailsCell = (event: AuditEvent) => {
  const details = Object.entries(event.context ?? {}).filter(
    ([key, value]) => AUDIT_CONTEXT_LABELS[key] && value !== null && value !== ''
  )

  if (event.changes.length === 0 && details.length === 0) {
    return EMPTY
  }

  return (
    <div style={{ minWidth: 260 }}>
      {event.changes.map((change) => (
        <div key={change.field} data-testid={`audit-change-${change.field}`}>
          <span className="fw-medium">{change.label}:</span>{' '}
          <span className="text-muted text-decoration-line-through">{change.old ?? '-'}</span>
          <i className="ri-arrow-right-line mx-1 align-middle text-muted" aria-label={AUDIT_TEXT.CHANGED_TO}></i>
          <span>{change.new ?? '-'}</span>
        </div>
      ))}
      {details.length > 0 && (
        <div className="text-muted fs-12">
          {details.map(([key, value]) => `${AUDIT_CONTEXT_LABELS[key]}: ${String(value)}`).join(' · ')}
        </div>
      )}
    </div>
  )
}

export const FileCell = (
  event: AuditEvent,
  onDownload: (event: AuditEvent) => void,
  downloading: boolean
) => {
  if (!event.file) {
    return EMPTY
  }

  return (
    <div className="d-flex align-items-center gap-2">
      <div className="min-w-0">
        {event.file.label && <div className="text-nowrap">{event.file.label}</div>}
        <code className="d-inline-block text-truncate fs-12 align-middle" style={{ maxWidth: 130 }} title={event.file.sha256}>
          {event.file.sha256}
        </code>
      </div>
      {event.file.downloadable && (
        <button
          type="button"
          className="btn btn-sm btn-soft-primary"
          onClick={() => onDownload(event)}
          disabled={downloading}
          aria-label={AUDIT_TEXT.DOWNLOAD_FILE}
          title={AUDIT_TEXT.DOWNLOAD_FILE}
        >
          <i className="ri-download-2-line"></i>
        </button>
      )}
    </div>
  )
}
