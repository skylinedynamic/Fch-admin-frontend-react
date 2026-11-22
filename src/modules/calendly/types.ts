import type { AttendeeInput } from '../appointment/types'

/**
 * Calendly v2: each user connects their own Calendly through FCH's one app,
 * which the host sets up. These mirror fch-api's /common/calendly/* answers.
 */

/** Whose Calendly a booking goes into (fch-api CalendlyBookingService::MODE_*). */
export const CALENDLY_BOOKING_MODES = {
  /** The creator's own Calendly; the first attendee is invited, the rest are guests. */
  OWN: 'own',
  /** The one attendee's Calendly; the creator is invited. */
  THEIRS: 'theirs',
  /** Nobody who could host it is connected: an ordinary appointment. */
  NONE: 'none',
} as const
export type CalendlyBookingMode = (typeof CALENDLY_BOOKING_MODES)[keyof typeof CALENDLY_BOOKING_MODES]

/** Event type places where the invitee says where (fch-api INVITEE_LOCATION_KINDS). */
export const CALENDLY_LOCATION_KINDS = {
  PHONE_CALL: 'outbound_call',
  ASK_INVITEE: 'ask_invitee',
} as const
export const CALENDLY_INVITEE_LOCATION_KINDS: string[] = Object.values(CALENDLY_LOCATION_KINDS)

/** How a Calendly event type's place reads, with its icon (Calendly's location kinds). */
export const CALENDLY_LOCATION_DISPLAY: Record<string, { label: string; icon: string }> = {
  zoom_conference: { label: 'Zoom', icon: 'ri-vidicon-line' },
  google_conference: { label: 'Google Meet', icon: 'ri-vidicon-line' },
  microsoft_teams_conference: { label: 'Microsoft Teams', icon: 'ri-vidicon-line' },
  webex_conference: { label: 'Webex', icon: 'ri-vidicon-line' },
  gotomeeting_conference: { label: 'GoTo Meeting', icon: 'ri-vidicon-line' },
  physical: { label: 'In person', icon: 'ri-map-pin-line' },
  outbound_call: { label: 'Phone call', icon: 'ri-phone-line' },
  inbound_call: { label: 'Phone call', icon: 'ri-phone-line' },
  ask_invitee: { label: 'Invitee chooses', icon: 'ri-map-pin-user-line' },
  custom: { label: 'Custom location', icon: 'ri-map-pin-line' },
}

/** The ?calendly= result the API sends the browser back with after signing in. */
export const CALENDLY_RETURN_PARAM = 'calendly'
export const CALENDLY_RETURN_RESULTS = {
  CONNECTED: 'connected',
  ERROR: 'error',
  IN_USE: 'in_use',
} as const

export interface CalendlyConnectionStatus {
  /** The host has set up FCH's Calendly app: anyone may connect. */
  app_configured: boolean
  connected: boolean
  needs_reconnect: boolean
  name?: string | null
  email?: string | null
  scheduling_url?: string | null
  webhooks_active?: boolean
  last_synced_at?: string | null
}

export interface CalendlyEventType {
  uri: string
  name: string | null
  duration: number
  locations: { kind: string | null }[]
  /** One of its places needs a phone number or a place from the invitee. */
  asks_location: boolean
}

export interface CalendlyBookingOptions {
  mode: CalendlyBookingMode
  host: { user_id: number; name: string | null } | null
  event_types: CalendlyEventType[]
}

export interface CalendlySlot {
  /** UTC, e.g. 2026-11-27T09:00:00Z */
  start_time: string
  /** HH:mm in the zone asked for */
  local_time: string
}

export interface CalendlyAvailableTimesPayload {
  attendees: AttendeeInput[]
  event_type_uri: string
  date: string
  timezone: string
}

export interface CalendlySyncDates {
  from: string
  to: string
}

export interface CalendlySyncResult {
  created: number
  updated: number
  cancelled: number
}

export interface AddToCalendlyPayload {
  calendly_event_type_uri: string
  calendly_location_kind?: string | null
  calendly_location?: string | null
}

/** Settings > Calendly Configuration: FCH's one Calendly app (host only). The secret is never sent back. */
export interface CalendlySettings {
  configured: boolean
  client_id: string | null
  has_client_secret: boolean
  redirect_uri: string
  scopes: string[]
}

export interface SaveCalendlySettingsPayload {
  client_id: string
  /** Blank keeps the saved one. */
  client_secret: string
}
