/** The company Calendly account, as /common/calendly/status reports it. */
export interface CalendlyStatus {
  connected: boolean
  needs_reconnect?: boolean
  /** The host's team: may connect, sync and disconnect it. */
  can_manage: boolean
  /** The signed-in user connected it - they book *for* someone. */
  is_host?: boolean
  /** May book into it (the host, or someone who may book with the host). */
  can_book: boolean
  name?: string | null
  scheduling_url?: string | null
  email?: string | null
  connected_by?: string | null
  webhooks_active?: boolean
  last_synced_at?: string | null
}

export interface CalendlyEventType {
  uri: string
  name: string | null
  duration: number
  kind?: string | null
  scheduling_url?: string | null
}

export interface CalendlySlot {
  /** UTC, as sent back when booking. */
  start_time: string
  /** In the viewer's zone, Y-m-d H:i:s. */
  local_time: string
  label: string
}

export interface CalendlyAvailableTimesPayload {
  event_type_uri: string
  date: string
  timezone: string
  assigned_for?: number
}

export interface CalendlyBookingPayload {
  event_type_uri: string
  start_time: string
  timezone: string
  assigned_for?: number
  subject?: string
  description?: string
  meeting_type?: string
}
