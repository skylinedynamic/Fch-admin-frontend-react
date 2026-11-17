/**
 * Your partner's Calendly (the host's, a WLP's or a certified partner's), as
 * /common/calendly/status reports it.
 */
export interface CalendlyStatus {
  /** The partner's Calendly app keys are saved (Settings > Calendly); false = Calendly is off. */
  configured?: boolean
  connected: boolean
  needs_reconnect?: boolean
  /** The host, WLP or certified partner account itself: may connect and disconnect it. */
  can_manage: boolean
  /** The account and its staff: may sync it (never a borrower). */
  can_sync?: boolean
  /** The team books *for* someone it picks; a borrower is the invitee themselves. */
  is_host?: boolean
  /** Connected: may book into it. */
  can_book: boolean
  name?: string | null
  scheduling_url?: string | null
  email?: string | null
  connected_by?: string | null
  webhooks_active?: boolean
  last_synced_at?: string | null
}

/**
 * Settings > Calendly for one partner, as /common/calendly/settings returns it:
 * its own Calendly OAuth app keys in full (only to that partner's own account
 * or the host account) and its connection.
 */
export interface CalendlySettingsData {
  partner_id: number
  client_id: string | null
  client_secret: string | null
  webhook_signing_key: string | null
  has_client_secret?: boolean
  has_webhook_signing_key?: boolean
  /** Client ID and Client Secret are saved. */
  configured: boolean
  connected: boolean
  needs_reconnect?: boolean
  name?: string | null
  email?: string | null
  connected_by?: string | null
  webhooks_active?: boolean
  last_synced_at?: string | null
  /** To enter as the Redirect URI on the partner's Calendly OAuth app. */
  redirect_uri: string
  /** To tick on the partner's Calendly OAuth app. */
  scopes: string[]
}

export interface CalendlySettingsPayload {
  /** The host account configuring another partner; omitted for your own. */
  partner_id?: number
  client_id: string
  /** Blank keeps the saved one. */
  client_secret?: string
  /** Blank keeps the saved one (FCH makes one on connecting when none is saved). */
  webhook_signing_key?: string
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
