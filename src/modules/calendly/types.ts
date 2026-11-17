/**
 * Your own Calendly, as /common/calendly/status reports it: your partner's
 * (shared by its team), or a borrower's own.
 */
export interface CalendlyStatus {
  connected: boolean
  needs_reconnect?: boolean
  /** May connect, sync and disconnect it (anyone with their own Calendly). */
  can_manage: boolean
  /** Books *for* someone - the person they pick. */
  is_host?: boolean
  /** Connected: may book into it. */
  can_book: boolean
  name?: string | null
  scheduling_url?: string | null
  email?: string | null
  connected_by?: string | null
  webhooks_active?: boolean
  last_synced_at?: string | null
  /** The Connect popup: the saved Calendly OAuth app (never its secrets). */
  client_id?: string | null
  has_client_secret?: boolean
  has_webhook_signing_key?: boolean
  /** What to enter on the Calendly OAuth app. */
  redirect_uri?: string
  webhook_url?: string | null
  scopes?: string[]
}

/** Your own Calendly OAuth app keys; a blank secret keeps the stored one. */
export interface CalendlyConnectPayload {
  client_id: string
  client_secret: string
  webhook_signing_key: string
}

export interface CalendlyEventType {
  uri: string
  name: string | null
  duration: number
  kind?: string | null
  scheduling_url?: string | null
  /** Where it is held, e.g. outbound_call (a phone call the host makes). */
  location_kind?: string | null
  /** The invitee says where to meet - for a phone call, their number. */
  asks_invitee_location?: boolean
  /** Every place it offers (Calendly's "All options"), to pick from when booking. */
  location_options?: CalendlyLocationOption[]
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
  /** Where to meet, when the event type asks the invitee. */
  location?: string
  /** Which of the event type's places (its first when absent). */
  location_kind?: string
}

/** One place an event type offers: Zoom, a phone call, in person, ... */
export interface CalendlyLocationOption {
  kind: string
  label: string
  /** The invitee says where - for a phone call we make, their number. */
  asks_invitee: boolean
}
