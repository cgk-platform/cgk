/**
 * Team scheduling types
 *
 * @ai-pattern scheduling-team-types
 * @ai-required Use these types for all team scheduling operations
 */

import type {
  CustomQuestion,
  LocationConfig,
  ReminderSettings,
  BookingStatus,
  Invitee,
} from '../types.js'

// ============================================================================
// Scheduling Types
// ============================================================================

export type SchedulingType = 'round_robin' | 'collective' | 'individual'

export const SCHEDULING_TYPES: SchedulingType[] = ['round_robin', 'collective', 'individual']

// ============================================================================
// Team Settings
// ============================================================================

export interface TeamSettings {
  roundRobin: boolean
  showMemberProfiles: boolean
}

// ============================================================================
// Main Entity Types
// ============================================================================

/**
 * Scheduling team - a group of hosts who share bookings
 */
export interface SchedulingTeam {
  id: string
  tenantId: string
  name: string
  slug: string
  description: string | null
  settings: TeamSettings
  createdAt: Date
  updatedAt: Date
}

/**
 * Team member - links a user to a team
 */
export interface SchedulingTeamMember {
  id: string
  tenantId: string
  teamId: string
  userId: string
  isAdmin: boolean
  createdAt: Date
}

/**
 * Team member with user details
 */
export interface TeamMemberWithDetails extends SchedulingTeamMember {
  displayName: string
  email: string
  avatarUrl: string | null
  timezone: string
  username: string
}

/**
 * Team event type - shared event type for a team
 */
export interface TeamEventType {
  id: string
  tenantId: string
  teamId: string
  name: string
  slug: string
  description: string | null
  duration: number
  color: string
  location: LocationConfig
  customQuestions: CustomQuestion[]
  reminderSettings: ReminderSettings
  schedulingType: SchedulingType
  hostUserIds: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Round-robin counter for fair distribution
 */
export interface RoundRobinCounter {
  id: string
  tenantId: string
  teamEventTypeId: string
  currentIndex: number
  updatedAt: Date
}

/**
 * Team booking - booking for a team event type
 */
export interface TeamBooking {
  id: string
  tenantId: string
  teamEventTypeId: string
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
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// Team with Member Count (for list views)
// ============================================================================

export interface TeamWithCounts extends SchedulingTeam {
  memberCount: number
  eventTypeCount: number
}

// ============================================================================
// Input Types for Create/Update
// ============================================================================

export interface CreateTeamInput {
  name: string
  slug: string
  description?: string | null
  settings?: Partial<TeamSettings>
}

export interface UpdateTeamInput {
  name?: string
  slug?: string
  description?: string | null
  settings?: Partial<TeamSettings>
}

export interface AddTeamMemberInput {
  teamId: string
  userId: string
  isAdmin?: boolean
}

export interface CreateTeamEventTypeInput {
  teamId: string
  name: string
  slug: string
  description?: string | null
  duration: number
  color?: string
  location?: LocationConfig
  customQuestions?: CustomQuestion[]
  reminderSettings?: ReminderSettings
  schedulingType?: SchedulingType
  hostUserIds: string[]
}

export interface UpdateTeamEventTypeInput {
  name?: string
  slug?: string
  description?: string | null
  duration?: number
  color?: string
  location?: LocationConfig
  customQuestions?: CustomQuestion[]
  reminderSettings?: ReminderSettings
  schedulingType?: SchedulingType
  hostUserIds?: string[]
  isActive?: boolean
}

export interface CreateTeamBookingInput {
  teamEventTypeId: string
  invitee: Invitee
  startTime: string
  endTime: string
  timezone: string
  location: LocationConfig
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface TeamMemberStats {
  userId: string
  userName: string
  bookingsCount: number
  percentageOfTeam: number
  lastBookingAt: string | null
}

export interface TeamAnalytics {
  teamId: string
  teamName: string
  totalBookings: number
  confirmedBookings: number
  cancelledBookings: number
  memberDistribution: TeamMemberStats[]
  byEventType: Array<{
    eventTypeId: string
    eventTypeName: string
    count: number
  }>
}
