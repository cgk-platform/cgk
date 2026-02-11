/**
 * @cgk/scheduling - Scheduling and booking system
 *
 * @ai-pattern tenant-isolation
 * @ai-required Always use tenant context for all operations
 *
 * @example
 * ```ts
 * import {
 *   getEventType,
 *   calculateAvailableSlots,
 *   createBooking,
 *   acquireBookingLock
 * } from '@cgk/scheduling'
 *
 * // Get available slots
 * const slots = calculateAvailableSlots('2026-02-15', {
 *   user,
 *   eventType,
 *   availability,
 *   blockedDates,
 *   existingBookings,
 *   inviteeTimezone: 'America/New_York'
 * })
 *
 * // Create booking with lock
 * const lock = await acquireBookingLock(tenantId, hostUserId, startTime)
 * if (lock.acquired) {
 *   try {
 *     const booking = await createBooking(tenantId, input, eventType, host)
 *   } finally {
 *     await releaseBookingLock(tenantId, lock.lockKey)
 *   }
 * }
 * ```
 */

// Types
export type {
  AvailableSlot,
  Availability,
  BlockedDate,
  Booking,
  BookingFilters,
  BookingStatus,
  BusyTime,
  CalendarEvent,
  CreateBlockedDateInput,
  CreateBookingInput,
  CreateEventTypeInput,
  CreateSchedulingUserInput,
  CustomQuestion,
  DayOfWeek,
  EventColor,
  EventType,
  EventTypeSettingOverrides,
  GetAvailableSlotsParams,
  GoogleTokens,
  Invitee,
  LocationConfig,
  LocationType,
  LockResult,
  QuestionType,
  RateLimitResult,
  Reminder,
  ReminderSettings,
  ReminderTiming,
  SchedulingAnalytics,
  SchedulingChangelog,
  SchedulingUser,
  TimeSlot,
  UpdateEventTypeInput,
  UpdateSchedulingUserInput,
  WeeklySchedule,
} from './types.js'

// Constants
export {
  BOOKING_STATUSES,
  DAYS_OF_WEEK,
  EVENT_COLORS,
  LOCATION_TYPES,
  REMINDER_TIMINGS,
} from './types.js'

// Database operations
export {
  archiveEventType,
  createBlockedDate,
  createBooking,
  createEventType,
  createSchedulingUser,
  deleteBlockedDate,
  getAvailability,
  getBlockedDates,
  getBooking,
  getBookings,
  getBookingsForHost,
  getChangelog,
  getEventType,
  getEventTypeBySlug,
  getEventTypesByUser,
  getSchedulingAnalytics,
  getSchedulingUser,
  getSchedulingUserByUsername,
  getSchedulingUsers,
  markReminderSent,
  updateAvailability,
  updateBookingGoogleEvent,
  updateBookingStatus,
  updateEventType,
  updateSchedulingUser,
} from './db.js'

// Slot calculation
export {
  calculateAvailableSlots,
  convertTimezone,
  formatSlotTime,
  getAvailableDatesForMonth,
  isSlotAvailable,
} from './slots.js'

// Locking and rate limiting
export {
  acquireBookingLock,
  checkBookingRateLimit,
  checkRateLimit,
  releaseBookingLock,
} from './lock.js'

// Team scheduling
export type {
  AddTeamMemberInput,
  CreateTeamBookingInput,
  CreateTeamEventTypeInput,
  CreateTeamInput,
  RoundRobinCounter,
  SchedulingTeam,
  SchedulingTeamMember,
  SchedulingType,
  TeamAnalytics,
  TeamBooking,
  TeamEventType,
  TeamMemberStats,
  TeamMemberWithDetails,
  TeamSettings,
  TeamWithCounts,
  UpdateTeamEventTypeInput,
  UpdateTeamInput,
} from './teams/index.js'

export {
  // Constants
  SCHEDULING_TYPES,
  // Teams CRUD
  createTeam,
  deleteTeam,
  getTeam,
  getTeamBySlug,
  getTeams,
  updateTeam,
  // Team members
  addTeamMember,
  getTeamMember,
  getTeamMembers,
  getTeamsForUser,
  removeTeamMember,
  updateTeamMemberAdmin,
  // Team event types
  createTeamEventType,
  deleteTeamEventType,
  getTeamEventType,
  getTeamEventTypeBySlug,
  getTeamEventTypes,
  updateTeamEventType,
  // Round-robin counter
  getRoundRobinCounter,
  updateRoundRobinCounter,
  // Team bookings
  createTeamBooking,
  getTeamBookings,
  // Analytics
  getTeamAnalytics,
  getTeamDistribution,
  // Slot calculation
  getCollectiveSlots,
  getIndividualSlots,
  getRoundRobinSlots,
  getTeamAvailableSlots,
  // Host selection
  getNextRoundRobinHost,
  // Locking
  acquireTeamBookingLock,
  releaseTeamBookingLock,
  // Validation
  isTeamSlotAvailable,
  validateTeamHosts,
} from './teams/index.js'
