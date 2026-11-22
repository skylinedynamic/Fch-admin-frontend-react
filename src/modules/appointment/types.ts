export interface UserInfo {
  id: number
  name: string
  email: string
  entity_type?: string | null
  entity_id?: number | null
  image?: string | null
  avatar?: string | null
  profile_picture?: string | null
}

export interface Appointment {
  id: number
  appointment_code: string
  subject: string
  description: string
  appointment_date: string
  timezone: string | null
  duration_minutes: number
  status: 'scheduled' | 'cancelled' | 'rescheduled' | 'completed' | string | null
  meeting_type: string
  location: string | null
  remarks: string | null
  scheduled_by: UserInfo
  assigned_for: UserInfo
  microsoft_event_id: string | null
  /** Everyone it is with (Calendly v2); the creator is scheduled_by. */
  attendees?: AppointmentAttendee[]
  /** Booked in, or brought in from, Calendly: its time is changed there (reschedule_url). */
  is_calendly?: boolean
  join_url?: string | null
  reschedule_url?: string | null
  /** Booked in Calendly over its owner's FCH appointment. */
  had_conflict?: boolean
  /** Only on the create/update response: attendees who already had something then. */
  attendee_conflicts?: AttendeeConflict[]
  created_at: string
  updated_at: string
  meeting_with?: number
  meeting_with_host?: number
}

/** At most this many people on an appointment - Calendly's 1 invitee + 10 guests (fch-api MAX_ATTENDEES). */
export const MAX_ATTENDEES = 11

export const ATTENDEE_TYPES = {
  USER: 'user',
  EXTERNAL: 'external',
} as const
export type AttendeeType = (typeof ATTENDEE_TYPES)[keyof typeof ATTENDEE_TYPES]

/** One person as the forms send them: a platform user, or an outside email. */
export interface AttendeeInput {
  user_id?: number
  email?: string
  name?: string
}

export interface AppointmentAttendee {
  id: number
  user_id: number | null
  name: string | null
  email: string
  type: AttendeeType
  status: string
  had_conflict: boolean
}

/** A clash as the API reports it, in the viewer's zone. */
export interface AppointmentClash {
  id: number
  date: string
  start_time: string
  end_time: string
  duration_minutes: number
}

export interface AttendeeConflict {
  user_id: number
  name: string | null
  conflicts: AppointmentClash[]
}

export interface FetchAppointmentsResponse {
  status: boolean
  message: string
  data: Appointment[]
}

export interface CreateAppointmentPayload {
  subject: string
  description: string
  appointment_date: string
  timezone: string
  duration_minutes: number
  meeting_type: string
  /** Calendly v2: everyone it is with. The older single assigned_for still works. */
  attendees?: AttendeeInput[]
  assigned_for?: number
  /** Book it in Calendly too (the API decides whose). */
  sync_with_calendly?: boolean
  calendly_event_type_uri?: string | null
  calendly_location_kind?: string | null
  calendly_location?: string | null
  entity_type?: string | null
  entity_id?: number | null
  location?: string
  time_slot_id?: number
  remarks?: string
  meeting_with?: number
  meeting_with_host?: number
}

export interface CreateAppointmentResponse {
  status: boolean;
  message: string;
  data: Appointment;
}

export interface TimeSlot {
  id: number;
  start_time: string;
  end_time: string;
  label: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface FetchTimeSlotsResponse {
  status: boolean;
  message: string;
  data: TimeSlot[];
}

export interface CheckAvailabilityPayload {
  /** The attendee's user id (R2 BUG-073). */
  assigned_for?: number
  /** With entity_id: the attendee's record, when no user id is known. */
  entity_type?: string
  entity_id?: number
  appointment_date: string
  id?: string | number
  /** Calendly v2: with these, the answer splits the creator's clash from each attendee's. */
  attendees?: AttendeeInput[]
  duration_minutes?: number
  timezone?: string
  exclude_appointment_id?: number | string
}

export interface CheckAvailabilityResponse {
  status: boolean
  message: string
  data: {
    available: boolean
    assignee_conflicts?: any[]
    scheduler_conflicts?: any[]
    /** The creator's own clashes - they stop the appointment. */
    creator_conflicts?: AppointmentClash[]
    /** Each attendee's clashes - a warning only. */
    attendee_conflicts?: AttendeeConflict[]
    can_create?: boolean
  }
}

export interface SelectableUser {
  id: number
  name: string
  entity_type: string | null
  entity_id: number | null
}

export interface FetchSelectableUsersResponse {
  status: boolean
  message: string
  data: SelectableUser[]
}