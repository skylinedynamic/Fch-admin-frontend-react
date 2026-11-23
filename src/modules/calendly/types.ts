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

/** Calendly's OAuth answer as it reached the portal's /calendly/callback page. */
export interface CalendlyCallbackQuery {
  code?: string
  state?: string
  error?: string
}

/** The portal page Calendly sends people back to (fch-api CalendlyAppConfig::CALLBACK_PATH). */
export const CALENDLY_CALLBACK_ROUTE = '/calendly/callback'

/** The ?calendly= result the API sends the browser back with after signing in. */
export const CALENDLY_RETURN_PARAM = 'calendly'
/** One id for the "how connecting went" toast, so it is shown once however often it is asked for. */
export const CALENDLY_RETURN_TOAST_ID = 'calendly-return'
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

/** Which way the Sync modal works: bring meetings in from Calendly, or send appointments to it. */
export const CALENDLY_SYNC_DIRECTIONS = { PULL: 'pull', PUSH: 'push' } as const
export type CalendlySyncDirection = (typeof CALENDLY_SYNC_DIRECTIONS)[keyof typeof CALENDLY_SYNC_DIRECTIONS]

export interface CalendlySyncDates {
  from: string
  to: string
}

/** What a Calendly meeting would do to the portal (fch-api CalendlySyncReviewService::ACTION_*). */
export const CALENDLY_PULL_ACTIONS = {
  NEW: 'new',
  CHANGED: 'changed',
  CANCELLED: 'cancelled',
} as const
export type CalendlyPullAction = (typeof CALENDLY_PULL_ACTIONS)[keyof typeof CALENDLY_PULL_ACTIONS]

/** A Calendly meeting Sync could bring in. Times are UTC ISO strings. */
export interface CalendlyPullItem {
  uri: string
  action: CalendlyPullAction
  title: string | null
  start_time: string
  end_time: string
  people: string[]
  appointment_id: number | null
  /** The portal's time before the change (changed / cancelled). */
  previous_start_time: string | null
}

/** One of the user's own appointments Sync could add to Calendly. */
export interface CalendlyPushItem {
  appointment_id: number
  title: string | null
  start_time: string
  end_time: string
  people: string[]
  pushable: boolean
  /** Why it cannot go to Calendly (a past time, nobody on it...). */
  reason: string | null
}

export interface CalendlySyncPreview {
  pull: CalendlyPullItem[]
  push: CalendlyPushItem[]
  event_types: CalendlyEventType[]
}

/** What was ticked in the Sync modal. */
export interface CalendlySyncSelection {
  pull: string[]
  push: number[]
  /** Of `push`, the ones booked under their own title and length. */
  push_use_title?: number[]
  calendly_event_type_uri?: string | null
  calendly_location_kind?: string | null
  calendly_location?: string | null
}

export interface CalendlySyncApplyResult {
  pull: { uri: string; result: 'created' | 'updated' | 'cancelled' | 'unchanged' | 'failed'; message?: string }[]
  push: { appointment_id: number; ok: boolean; message?: string }[]
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
