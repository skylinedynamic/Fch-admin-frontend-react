import React from 'react'
import { AUDIT_EXPORT_OPTIONS, AUDIT_TEXT, type AuditExportFormat } from '../../../../../config/auditConfig'

interface Props {
  onExport: (format: AuditExportFormat) => void
  disabled?: boolean
}

/** The Audit Trail header's Actions menu: export the filtered trail as CSV or PDF. */
const AuditTrailActions: React.FC<Props> = ({ onExport, disabled = false }) => (
  <div className="btn-group">
    <button
      type="button"
      className="btn btn-primary waves-effect dropdown-toggle"
      data-bs-toggle="dropdown"
      aria-expanded="false"
      disabled={disabled}
    >
      {AUDIT_TEXT.ACTIONS}
    </button>
    <ul className="dropdown-menu dropdown-menu-end">
      {AUDIT_EXPORT_OPTIONS.map((option) => (
        <li key={option.value}>
          <button type="button" className="dropdown-item" onClick={() => onExport(option.value)} disabled={disabled}>
            <i className={`${option.icon} me-1 align-bottom`}></i> {option.label}
          </button>
        </li>
      ))}
    </ul>
  </div>
)

export default AuditTrailActions
