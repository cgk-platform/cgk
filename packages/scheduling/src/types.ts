/**
 * Scheduling system types
 *
 * @ai-pattern scheduling-types
 * @ai-required Use these types for all scheduling operations
 */

// ============================================================================
// Enums and Constants
// ============================================================================

export type EventColor = 'green' | 'mint' | 'blue' | 'purple' | 'orange' | 'red' | 'gray'

export type BookingStatus = 'confirmed' | 'cancelled' | 'rescheduled' | 'completed' | 'no_show'

export type LocationType = 'google_meet' | 'zoom' | 'phone' | 'in_person' | 'custom'

export type ReminderTiming = '48h' | '24h' | '2h' | '1h' | '30m' | '15m'

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export const EVENT_COLORS: EventColor[] = ['green', 'mint', 'blue', 'purple', 'orange', 'red', 'gray']

export const BOOKING_STATUSES: BookingStatus[] = ['confirmed', 'cancelled', 'rescheduled', 'completed', 'no_show']

export const LOCATION_TYPES: LocationType[] = ['google_meet', 'zoom', 'phone', 'in_person', 'custom']

export const REMINDER_TIMINGS: ReminderTiming[] = ['48h', '24h', '2h', '1h', '30m', '15m']

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

// ============================================================================
// Location Types
// ============================================================================

export interface LocationConfig {
  type: LocationType
  value?: string
  displayName?: string
  meetLink?: string
}

// ============================================================================
// Time Slot Types
// ============================================================================

export interface TimeSlot {
  start: string // HH:mm format
  end: string // HH:mm format
}

export interface WeeklySchedule {
  monday: TimeSlot[]
  tuesday: TimeSlot[]
  wednesday: TimeSlot[]
  thursday: TimeSlot[]
  friday: TimeSlot[]
  saturday: TimeSlot[]
  sunday: TimeSlot[]
}

export interface AvailableSlot {
  startTime: string // ISO string
  endTime: string // ISO string
  available: boolean
}

// ============================================================================
// Custom Questions
// ============================================================================

export type QuestionType = 'text' | 'textarea' | 'select' | 'phone' | 'checkbox'

export interface CustomQuestion {
  id: string
  label: string
  type: QuestionType
  required: boolean
  options?: string[] // For select type
  placeholder?: string
}

// ============================================================================
// Reminder Settings
// ============================================================================

export interface Reminder {
  timing: ReminderTiming
  sendToHost: boolean
  sendToInvitee: boolean
}

export interface ReminderSettings {
  enabled: boolean
  reminders: Reminder[]
}

// ============================================================================
// Setting Overrides
// ============================================================================

export interface EventTypeSettingOverrides {
  minimumNoticeHours?: number
  bookingWindowDays?: number
  bufferBeforeMins?: number
  bufferAfterMins?: number
  dailyLimit?: number | null
}

// ============================================================================
// Invitee Data
// ============================================================================

export interface Invitee {
  name: string
  email: string
  notes?: string
  responses?: Record<string, string>
}

// ============================================================================
// Main Entity Types
// ============================================================================

/**
 * Scheduling user profile (per-tenant)
 */
export interface SchedulingUser {
  id: string
  tenantId: string
  userId: string
  username: string
  displayName: string
  email: string
  timezone: string
  avatarUrl: string | null
  isActive: boolean

  // Settings
  minimumNoticeHours: number
  bookingWindowDays: number
  bufferBeforeMins: number
  bufferAfterMins: number
  dailyLimit: number | null
  defaultDuration: number

  // Google Calendar
  googleTokensEncrypted: Buffer | null
  googleCalendarId: string

  createdAt: Date
  updatedAt: Date
}

/**
 * Event type (meeting template)
 */
export interface EventType {
  id: string
  tenantId: string
  userId: string

  name: string
  slug: string
  description: string | null
  duration: number
  color: EventColor

  location: LocationConfig
  customQuestions: CustomQuestion[]
  reminderSettings: ReminderSettings
  settingOverrides: EventTypeSettingOverrides | null

  isActive: boolean
  archivedAt: Date | null

  createdAt: Date
  updatedAt: Date
}

/**
 * Availability schedule
 */
export interface Availability {
  id: string
  tenantId: string
  userId: string
  timezone: string
  weeklySchedule: WeeklySchedule
  updatedAt: Date
}

/**
 * Blocked date (PTO, holiday, etc.)
 */
export interface BlockedDate {
  id: string
  tenantId: string
  userId: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  reason: string | null
  isAllDay: boolean
  startTime: string | null // HH:mm
  endTime: string | null // HH:mm
  createdAt: Date
}

/**
 * Booking (confirmed meeting)
 */
export interface Booking {
  id: string
  tenantId: string
  eventTypeId: string
  hostUserId: string

  eventTypeName: string
  hostName: string
  hostEmail: string

  invitee: Invitee

  startTime: Date
  endTime: Date
  timezone: string

  status: BookingStatus

  location: LocationConfig

  googleEventId: string | null
  meetLink: string | null

  cancelledBy: 'host' | 'invitee' | null
  cancelReason: string | null

  rescheduledFrom: string | null

  remindersSent: Record<ReminderTiming, boolean>

  createdAt: Date
  updatedAt: Date
}

/**
 * Changelog entry for audit
 */
export interface SchedulingChangelog {
  id: string
  tenantId: string
  entityType: 'event_type' | 'booking' | 'availability' | 'blocked_date' | 'scheduling_user'
  entityId: string
  action: 'created' | 'updated' | 'cancelled' | 'rescheduled' | 'archived' | 'deleted'
  actorId: string | null
  details: Record<string, unknown> | null
  createdAt: Date
}

// ============================================================================
// Input Types for Create/Update
// ============================================================================

export interface CreateSchedulingUserInput {
  userId: string
  username: string
  displayName: string
  email: string
  timezone?: string
  avatarUrl?: string | null
}

export interface UpdateSchedulingUserInput {
  username?: string
  displayName?: string
  email?: string
  timezone?: string
  avatarUrl?: string | null
  minimumNoticeHours?: number
  bookingWindowDays?: number
  bufferBeforeMins?: number
  bufferAfterMins?: number
  dailyLimit?: number | null
  defaultDuration?: number
  googleCalendarId?: string
}

export interface CreateEventTypeInput {
  userId: string
  name: string
  slug: string
  description?: string | null
  duration: number
  color?: EventColor
  location?: LocationConfig
  customQuestions?: CustomQuestion[]
  reminderSettings?: ReminderSettings
  settingOverrides?: EventTypeSettingOverrides | null
}

export interface UpdateEventTypeInput {
  name?: string
  slug?: string
  description?: string | null
  duration?: number
  color?: EventColor
  location?: LocationConfig
  customQuestions?: CustomQuestion[]
  reminderSettings?: ReminderSettings
  settingOverrides?: EventTypeSettingOverrides | null
  isActive?: boolean
}

export interface CreateBlockedDateInput {
  userId: string
  startDate: string
  endDate: string
  reason?: string | null
  isAllDay?: boolean
  startTime?: string | null
  endTime?: string | null
}

export interface CreateBookingInput {
  eventTypeId: string
  hostUserId: string
  invitee: Invitee
  startTime: string // ISO string
  endTime: string // ISO string
  timezone: string
  location: LocationConfig
}

// ============================================================================
// Query/Filter Types
// ============================================================================

export interface BookingFilters {
  status?: BookingStatus
  eventTypeId?: string
  hostUserId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  limit?: number
}

export interface GetAvailableSlotsParams {
  tenantId: string
  userId: string
  eventTypeId: string
  date: string // YYYY-MM-DD
  timezone: string
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface SchedulingAnalytics {
  summary: {
    totalBookings: number
    confirmedBookings: number
    cancelledBookings: number
    cancelRate: number
    avgBookingsPerWeek: number
  }
  byEventType: Array<{
    eventTypeId: string
    eventTypeName: string
    count: number
    percentage: number
  }>
  byDayOfWeek: Record<DayOfWeek, number>
  byHourOfDay: number[]
  trend: Array<{
    date: string
    count: number
  }>
}

// ============================================================================
// Lock Types
// ============================================================================

export interface LockResult {
  acquired: boolean
  lockKey: string
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter: number
}

// ============================================================================
// Google Calendar Types
// ============================================================================

export interface GoogleTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface BusyTime {
  start: string
  end: string
}

export interface CalendarEvent {
  id: string
  summary: string
  description: string | null
  start: string
  end: string
  meetLink: string | null
  attendees: Array<{ email: string; displayName?: string }>
}
