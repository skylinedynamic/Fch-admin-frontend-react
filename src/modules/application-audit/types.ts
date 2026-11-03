import type { AuditEventType } from '../../config/auditConfig'

/** One field of a change: before and after, as the API recorded them (SSNs masked). */
export interface AuditChange {
  field: string
  label: string
  old: string | null
  new: string | null
}

export interface AuditEvent {
  id: number
  event: AuditEventType
  event_label: string
  /** ISO 8601, UTC. */
  occurred_at: string
  actor: { id: number | null; name: string | null; type: string | null }
  ip_address: string | null
  user_agent: string | null
  changes: AuditChange[]
  context: Record<string, string | number | boolean | null>
  file: { sha256: string; downloadable: boolean; label: string | null } | null
  /** Carried over from the old download history. */
  is_legacy: boolean
  hash: string
}

export interface AuditIntegrity {
  valid: boolean
  broken_at: number | null
  checked: number
}

export interface AuditTrailResponse {
  status: boolean
  message?: string
  data: AuditEvent[]
  pagination: { total: number; per_page: number; current_page: number; last_page: number }
  integrity: AuditIntegrity
}

export interface AuditTrailParams {
  page?: number
  per_page?: number
  event?: AuditEventType | ''
  search?: string
  sort_dir?: 'asc' | 'desc'
}
