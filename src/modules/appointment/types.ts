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
  created_at: string
  updated_at: string
  meeting_with?: number
  meeting_with_host?: number
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
  assigned_for: number
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
  assigned_for: number | string
  appointment_date: string
  id?: string | number
}

export interface CheckAvailabilityResponse {
  status: boolean
  message: string
  data: {
    available: boolean
    assignee_conflicts?: any[]
    scheduler_conflicts?: any[]
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