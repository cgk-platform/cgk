/**
 * Team scheduling logic - round-robin and collective availability
 *
 * @ai-pattern tenant-isolation
 * @ai-required Always use tenant context for all operations
 */

import { createTenantCache } from '@cgk/db'
import {
  addMinutes,
  isBefore,
  isAfter,
  parseISO,
} from 'date-fns'

import { calculateAvailableSlots } from '../slots.js'
import {
  getAvailability,
  getBlockedDates,
  getBookingsForHost,
  getSchedulingUser,
} from '../db.js'
import {
  getTeamEventType,
  getRoundRobinCounter,
  updateRoundRobinCounter,
} from './db.js'
import type { AvailableSlot, SchedulingUser } from '../types.js'
import type { TeamEventType } from './types.js'

const LOCK_TTL_SECONDS = 30

// ============================================================================
// Round-Robin Host Selection
// ============================================================================

/**
 * Get the next available host for a round-robin booking
 *
 * Uses a counter to track which host is next in rotation.
 * Skips hosts who are not available at the requested time.
 * Acquires a lock to prevent race conditions.
 *
 * @ai-pattern round-robin-fairness
 */
export async function getNextRoundRobinHost(
  tenantId: string,
  teamEventTypeId: string,
  startTime: string,
  endTime: string
): Promise<{ host: SchedulingUser; newIndex: number } | null> {
  const eventType = await getTeamEventType(tenantId, teamEventTypeId)
  if (!eventType) {
    return null
  }

  const hostIds = eventType.hostUserIds
  if (hostIds.length === 0) {
    return null
  }

  // Get current counter
  const counter = await getRoundRobinCounter(tenantId, teamEventTypeId)
  const startIndex = counter?.currentIndex || 0

  // Try to acquire lock for round-robin update
  const cache = createTenantCache(tenantId)
  const lockKey = `round_robin_lock:${teamEventTypeId}`
  const lockValue = Date.now().toString()

  const existing = await cache.get<string>(lockKey)
  if (existing) {
    // Lock held by another process, wait briefly and retry
    await new Promise((resolve) => setTimeout(resolve, 100))
    return getNextRoundRobinHost(tenantId, teamEventTypeId, startTime, endTime)
  }

  await cache.set(lockKey, lockValue, { ttl: LOCK_TTL_SECONDS })

  try {
    // Try each host starting from current index
    for (let i = 0; i < hostIds.length; i++) {
      const hostIndex = (startIndex + i) % hostIds.length
      const hostId = hostIds[hostIndex]

      if (!hostId) continue

      // Check if host is available at the requested time
      const isAvailable = await isHostAvailableForSlot(
        tenantId,
        hostId,
        startTime,
        endTime,
        eventType.duration
      )

      if (isAvailable) {
        const host = await getSchedulingUser(tenantId, hostId)
        if (host) {
          // Update counter for next booking
          const newIndex = (hostIndex + 1) % hostIds.length
          await updateRoundRobinCounter(tenantId, teamEventTypeId, newIndex)

          return { host, newIndex }
        }
      }
    }

    // No hosts available
    return null
  } finally {
    // Release lock
    await cache.delete(lockKey)
  }
}

/**
 * Check if a specific host is available for a time slot
 */
async function isHostAvailableForSlot(
  tenantId: string,
  hostId: string,
  startTime: string,
  endTime: string,
  duration: number
): Promise<boolean> {
  const user = await getSchedulingUser(tenantId, hostId)
  if (!user) return false

  const availability = await getAvailability(tenantId, hostId)
  if (!availability) return false

  const dateStr = startTime.split('T')[0]
  if (!dateStr) return false

  const blockedDates = await getBlockedDates(tenantId, hostId, dateStr, dateStr)
  const existingBookings = await getBookingsForHost(
    tenantId,
    hostId,
    `${dateStr}T00:00:00Z`,
    `${dateStr}T23:59:59Z`
  )

  // Create a minimal event type for slot calculation
  const tempEventType = {
    id: 'temp',
    tenantId,
    userId: hostId,
    name: 'temp',
    slug: 'temp',
    description: null,
    duration,
    color: 'blue' as const,
    location: { type: 'google_meet' as const },
    customQuestions: [],
    reminderSettings: { enabled: true, reminders: [] },
    settingOverrides: null,
    isActive: true,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const availableSlots = calculateAvailableSlots(dateStr, {
    user,
    eventType: tempEventType,
    availability,
    blockedDates,
    existingBookings,
    inviteeTimezone: user.timezone,
  })

  // Check if the requested slot is in the available slots
  return availableSlots.some(
    (slot) =>
      slot.startTime === startTime &&
      slot.endTime === endTime &&
      slot.available
  )
}

// ============================================================================
// Collective Availability (All Must Be Free)
// ============================================================================

/**
 * Get slots where ALL team members are available
 *
 * This is used for collective scheduling where a meeting
 * requires all hosts to be present.
 *
 * @ai-pattern collective-scheduling
 */
export async function getCollectiveSlots(
  tenantId: string,
  teamEventTypeId: string,
  date: string,
  timezone: string
): Promise<AvailableSlot[]> {
  const eventType = await getTeamEventType(tenantId, teamEventTypeId)
  if (!eventType) {
    return []
  }

  const hostIds = eventType.hostUserIds
  if (hostIds.length === 0) {
    return []
  }

  // Get slots for each host
  const slotsByHost = await Promise.all(
    hostIds.map((hostId) =>
      getHostSlots(tenantId, hostId, date, eventType.duration, timezone)
    )
  )

  // Find intersection (slots where ALL hosts are free)
  return intersectSlots(slotsByHost)
}

/**
 * Get available slots for a single host
 */
async function getHostSlots(
  tenantId: string,
  hostId: string,
  date: string,
  duration: number,
  inviteeTimezone: string
): Promise<AvailableSlot[]> {
  const user = await getSchedulingUser(tenantId, hostId)
  if (!user) return []

  const availability = await getAvailability(tenantId, hostId)
  if (!availability) return []

  const blockedDates = await getBlockedDates(tenantId, hostId, date, date)
  const existingBookings = await getBookingsForHost(
    tenantId,
    hostId,
    `${date}T00:00:00Z`,
    `${date}T23:59:59Z`
  )

  // Create a minimal event type for slot calculation
  const tempEventType = {
    id: 'temp',
    tenantId,
    userId: hostId,
    name: 'temp',
    slug: 'temp',
    description: null,
    duration,
    color: 'blue' as const,
    location: { type: 'google_meet' as const },
    customQuestions: [],
    reminderSettings: { enabled: true, reminders: [] },
    settingOverrides: null,
    isActive: true,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  return calculateAvailableSlots(date, {
    user,
    eventType: tempEventType,
    availability,
    blockedDates,
    existingBookings,
    inviteeTimezone,
  })
}

/**
 * Find intersection of slots across multiple hosts
 *
 * Returns only slots where ALL hosts are available
 */
function intersectSlots(slotsByHost: AvailableSlot[][]): AvailableSlot[] {
  if (slotsByHost.length === 0) {
    return []
  }

  const [firstHostSlots, ...restHostSlots] = slotsByHost

  if (!firstHostSlots || firstHostSlots.length === 0) {
    return []
  }

  // Create a map of slot times for the first host
  const slotMap = new Map<string, AvailableSlot>()
  for (const slot of firstHostSlots) {
    if (slot.available) {
      slotMap.set(slot.startTime, slot)
    }
  }

  // Intersect with each subsequent host's slots
  for (const hostSlots of restHostSlots) {
    const hostSlotTimes = new Set(
      hostSlots.filter((s) => s.available).map((s) => s.startTime)
    )

    // Remove slots that aren't available for this host
    for (const startTime of slotMap.keys()) {
      if (!hostSlotTimes.has(startTime)) {
        slotMap.delete(startTime)
      }
    }
  }

  // Return remaining slots (available for all hosts)
  return Array.from(slotMap.values()).sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  )
}

// ============================================================================
// Aggregated Availability (Round-Robin)
// ============================================================================

/**
 * Get aggregated slots for round-robin (any host available)
 *
 * This is used for round-robin scheduling where only
 * ONE host needs to be available at any time.
 *
 * @ai-pattern round-robin-availability
 */
export async function getRoundRobinSlots(
  tenantId: string,
  teamEventTypeId: string,
  date: string,
  timezone: string
): Promise<AvailableSlot[]> {
  const eventType = await getTeamEventType(tenantId, teamEventTypeId)
  if (!eventType) {
    return []
  }

  const hostIds = eventType.hostUserIds
  if (hostIds.length === 0) {
    return []
  }

  // Get slots for each host
  const slotsByHost = await Promise.all(
    hostIds.map((hostId) =>
      getHostSlots(tenantId, hostId, date, eventType.duration, timezone)
    )
  )

  // Union all slots (any host available)
  return unionSlots(slotsByHost)
}

/**
 * Union slots across multiple hosts
 *
 * Returns all unique slots where at least ONE host is available
 */
function unionSlots(slotsByHost: AvailableSlot[][]): AvailableSlot[] {
  const slotMap = new Map<string, AvailableSlot>()

  for (const hostSlots of slotsByHost) {
    for (const slot of hostSlots) {
      if (slot.available && !slotMap.has(slot.startTime)) {
        slotMap.set(slot.startTime, slot)
      }
    }
  }

  return Array.from(slotMap.values()).sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  )
}

// ============================================================================
// Team Slots API (Public-facing)
// ============================================================================

/**
 * Get available slots for a team event type
 *
 * Automatically selects the correct algorithm based on scheduling type:
 * - round_robin: Union of all host slots (any host available)
 * - collective: Intersection of all host slots (all must be free)
 * - individual: Returns slots per-host for selection
 */
export async function getTeamAvailableSlots(
  tenantId: string,
  teamEventTypeId: string,
  date: string,
  timezone: string
): Promise<AvailableSlot[]> {
  const eventType = await getTeamEventType(tenantId, teamEventTypeId)
  if (!eventType) {
    return []
  }

  switch (eventType.schedulingType) {
    case 'collective':
      return getCollectiveSlots(tenantId, teamEventTypeId, date, timezone)

    case 'round_robin':
    default:
      return getRoundRobinSlots(tenantId, teamEventTypeId, date, timezone)
  }
}

/**
 * Get slots for individual host selection
 *
 * Returns an object with slots for each host, keyed by host ID.
 * Used when the invitee can choose which team member to book.
 */
export async function getIndividualSlots(
  tenantId: string,
  teamEventTypeId: string,
  date: string,
  timezone: string
): Promise<Record<string, AvailableSlot[]>> {
  const eventType = await getTeamEventType(tenantId, teamEventTypeId)
  if (!eventType) {
    return {}
  }

  const hostIds = eventType.hostUserIds
  if (hostIds.length === 0) {
    return {}
  }

  const slotsPromises = hostIds.map(async (hostId) => {
    const slots = await getHostSlots(
      tenantId,
      hostId,
      date,
      eventType.duration,
      timezone
    )
    return { hostId, slots }
  })

  const results = await Promise.all(slotsPromises)

  return results.reduce(
    (acc, { hostId, slots }) => {
      acc[hostId] = slots
      return acc
    },
    {} as Record<string, AvailableSlot[]>
  )
}

// ============================================================================
// Booking Lock for Team Slots
// ============================================================================

/**
 * Acquire a lock for a team booking slot
 *
 * This prevents double-booking when multiple people
 * try to book the same slot simultaneously.
 */
export async function acquireTeamBookingLock(
  tenantId: string,
  teamEventTypeId: string,
  startTime: string
): Promise<{ acquired: boolean; lockKey: string }> {
  const cache = createTenantCache(tenantId)
  const lockKey = `team_booking_lock:${teamEventTypeId}:${startTime}`
  const lockValue = Date.now().toString()

  const existing = await cache.get<string>(lockKey)
  if (existing) {
    return { acquired: false, lockKey }
  }

  await cache.set(lockKey, lockValue, { ttl: LOCK_TTL_SECONDS })

  // Verify we got the lock
  const verify = await cache.get<string>(lockKey)
  const acquired = verify === lockValue

  return { acquired, lockKey }
}

/**
 * Release a team booking lock
 */
export async function releaseTeamBookingLock(
  tenantId: string,
  lockKey: string
): Promise<void> {
  const cache = createTenantCache(tenantId)
  await cache.delete(lockKey)
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Check if a slot is still available for a team booking
 */
export async function isTeamSlotAvailable(
  tenantId: string,
  teamEventTypeId: string,
  startTime: string,
  endTime: string,
  timezone: string
): Promise<boolean> {
  const eventType = await getTeamEventType(tenantId, teamEventTypeId)
  if (!eventType) {
    return false
  }

  const date = startTime.split('T')[0]
  if (!date) return false

  const slots = await getTeamAvailableSlots(tenantId, teamEventTypeId, date, timezone)

  return slots.some(
    (slot) => slot.startTime === startTime && slot.endTime === endTime && slot.available
  )
}

/**
 * Validate that all hosts in a team event type exist and are active
 */
export async function validateTeamHosts(
  tenantId: string,
  hostUserIds: string[]
): Promise<{ valid: boolean; invalidIds: string[] }> {
  const invalidIds: string[] = []

  for (const hostId of hostUserIds) {
    const user = await getSchedulingUser(tenantId, hostId)
    if (!user || !user.isActive) {
      invalidIds.push(hostId)
    }
  }

  return {
    valid: invalidIds.length === 0,
    invalidIds,
  }
}
