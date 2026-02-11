/**
 * Team scheduling module
 *
 * Provides team-based scheduling features:
 * - Round-robin host assignment
 * - Collective availability (all must be free)
 * - Individual host selection
 * - Team booking analytics
 *
 * @ai-pattern tenant-isolation
 * @ai-required Always use tenant context for all operations
 */

// Types
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
} from './types.js'

// Constants
export { SCHEDULING_TYPES } from './types.js'

// Database operations
export {
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
} from './db.js'

// Scheduling logic
export {
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
} from './scheduling.js'
