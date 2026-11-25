/**
 * Funding application audit trail: the events the API records
 * (fch-api FundingApplicationAuditEvent::EVENT_*), and the files a download
 * event can be of. Labels come from the API (`event_label`); these are for
 * the filter and for picking an icon.
 */
export const AUDIT_EVENT = {
  CREATED: 'created',
  UPDATED: 'updated',
  STATUS_CHANGED: 'status_changed',
  SIGNED: 'signed',
  SIGNATURE_CLEARED: 'signature_cleared',
  SIGNED_COPY_KEPT: 'signed_copy_kept',
  DOCUMENT_ADDED: 'document_added',
  DOCUMENT_REMOVED: 'document_removed',
  CO_BORROWER_ADDED: 'co_borrower_added',
  CO_BORROWER_UPDATED: 'co_borrower_updated',
  CO_BORROWER_REMOVED: 'co_borrower_removed',
  DOWNLOADED: 'downloaded',
  DELETED: 'deleted',
  RESTORED: 'restored',
} as const

export type AuditEventType = (typeof AUDIT_EVENT)[keyof typeof AUDIT_EVENT]

export const AUDIT_EVENT_OPTIONS: { value: AuditEventType; label: string }[] = [
  { value: AUDIT_EVENT.CREATED, label: 'Application created' },
  { value: AUDIT_EVENT.UPDATED, label: 'Application updated' },
  { value: AUDIT_EVENT.STATUS_CHANGED, label: 'Status changed' },
  { value: AUDIT_EVENT.SIGNED, label: 'Application signed' },
  { value: AUDIT_EVENT.SIGNATURE_CLEARED, label: 'Signature cleared by an edit' },
  { value: AUDIT_EVENT.SIGNED_COPY_KEPT, label: 'Signed copy kept' },
  { value: AUDIT_EVENT.DOCUMENT_ADDED, label: 'Document added' },
  { value: AUDIT_EVENT.DOCUMENT_REMOVED, label: 'Document removed' },
  { value: AUDIT_EVENT.CO_BORROWER_ADDED, label: 'Co-borrower added' },
  { value: AUDIT_EVENT.CO_BORROWER_UPDATED, label: 'Co-borrower updated' },
  { value: AUDIT_EVENT.CO_BORROWER_REMOVED, label: 'Co-borrower removed' },
  { value: AUDIT_EVENT.DOWNLOADED, label: 'Downloaded' },
  { value: AUDIT_EVENT.DELETED, label: 'Application deleted' },
  { value: AUDIT_EVENT.RESTORED, label: 'Application restored' },
]

export const AUDIT_EVENT_ICON: Record<AuditEventType, string> = {
  [AUDIT_EVENT.CREATED]: 'ri-add-circle-line',
  [AUDIT_EVENT.UPDATED]: 'ri-edit-line',
  [AUDIT_EVENT.STATUS_CHANGED]: 'ri-refresh-line',
  [AUDIT_EVENT.SIGNED]: 'ri-quill-pen-line',
  [AUDIT_EVENT.SIGNATURE_CLEARED]: 'ri-eraser-line',
  [AUDIT_EVENT.SIGNED_COPY_KEPT]: 'ri-shield-check-line',
  [AUDIT_EVENT.DOCUMENT_ADDED]: 'ri-file-add-line',
  [AUDIT_EVENT.DOCUMENT_REMOVED]: 'ri-file-reduce-line',
  [AUDIT_EVENT.CO_BORROWER_ADDED]: 'ri-user-add-line',
  [AUDIT_EVENT.CO_BORROWER_UPDATED]: 'ri-user-settings-line',
  [AUDIT_EVENT.CO_BORROWER_REMOVED]: 'ri-user-unfollow-line',
  [AUDIT_EVENT.DOWNLOADED]: 'ri-download-2-line',
  [AUDIT_EVENT.DELETED]: 'ri-delete-bin-line',
  [AUDIT_EVENT.RESTORED]: 'ri-arrow-go-back-line',
}

export const AUDIT_PAGE_SIZES = [25, 50, 100] as const

/** The context keys shown on an event, with their labels. Anything else stays out of view. */
export const AUDIT_CONTEXT_LABELS: Record<string, string> = {
  name: 'File',
  application_version: 'Version',
  certificate_id: 'Certificate',
  signed_at: 'Signed at',
  status: 'Status',
  browser: 'Browser',
  os: 'OS',
  device: 'Device',
}

/** The formats the trail exports to (the API's `format`), as the Actions menu lists them. */
export const AUDIT_EXPORT_FORMAT = {
  CSV: 'csv',
  PDF: 'pdf',
} as const

export type AuditExportFormat = (typeof AUDIT_EXPORT_FORMAT)[keyof typeof AUDIT_EXPORT_FORMAT]

export const AUDIT_EXPORT_OPTIONS: { value: AuditExportFormat; label: string; icon: string; mimeType: string }[] = [
  { value: AUDIT_EXPORT_FORMAT.CSV, label: 'Export CSV', icon: 'ri-file-excel-2-line', mimeType: 'text/csv' },
  { value: AUDIT_EXPORT_FORMAT.PDF, label: 'Export PDF', icon: 'ri-file-pdf-2-line', mimeType: 'application/pdf' },
]

/** The trail's order: the API's `sort_dir` (R3-BUG-051). Newest first by default. */
export const AUDIT_SORT = {
  NEWEST: 'desc',
  OLDEST: 'asc',
} as const

export type AuditSortDirection = (typeof AUDIT_SORT)[keyof typeof AUDIT_SORT]

export const AUDIT_SORT_OPTIONS: { value: AuditSortDirection; label: string }[] = [
  { value: AUDIT_SORT.NEWEST, label: 'Newest first' },
  { value: AUDIT_SORT.OLDEST, label: 'Oldest first' },
]

/** Every word the Audit Trail page shows, in one place. */
export const AUDIT_TEXT = {
  TITLE: 'Audit Trail',
  BREADCRUMB_LIST: 'Funding Applications',
  BREADCRUMB_DETAILS: 'Details',
  BACK: 'Back',
  ACTIONS: 'Actions',
  ALL_EVENTS: 'All Events',
  SEARCH_PLACEHOLDER: 'Search here...',
  SEARCH_LABEL: 'Search the audit trail',
  EVENT_LABEL: 'Event',
  FILTERS: 'Filters',
  CLEAR: 'Clear',
  COLUMN_DATE: 'Date',
  COLUMN_EVENT: 'Event',
  COLUMN_BY: 'By',
  COLUMN_DETAILS: 'Details',
  COLUMN_FILE: 'File',
  IMPORTED: 'Imported',
  PASSWORD_PROTECTED: 'Password protected',
  DOWNLOAD_FILE: 'Download file',
  CHANGED_TO: 'to',
  EMPTY: 'No audit events recorded yet',
  NO_MATCH: 'No audit events match your search or filter.',
  SORT_LABEL: 'Sort',
  INTEGRITY_VALID: (checked: number) => `Integrity verified (${checked})`,
  INTEGRITY_BROKEN: (eventId: number | null) => `Integrity check failed at event #${eventId}`,
  INTEGRITY_VALID_HINT: 'Every event is as it was recorded.',
  INTEGRITY_BROKEN_HINT: 'An event was changed or removed outside the application.',
  ERROR_LOAD: 'The audit trail could not be loaded.',
  ERROR_EXPORT: 'The audit trail could not be exported.',
  ERROR_DOWNLOAD: 'The file could not be downloaded.',
} as const
