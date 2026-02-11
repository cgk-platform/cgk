/**
 * Slot calculation for scheduling
 *
 * Calculates available time slots based on:
 * - User's weekly availability schedule
 * - Blocked dates
 * - Existing bookings
 * - User settings (buffers, notice, window)
 * - Optional Google Calendar busy times
 */

import {
  addDays,
  addMinutes,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
} from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

import type {
  AvailableSlot,
  BlockedDate,
  Booking,
  BusyTime,
  DayOfWeek,
  EventType,
  SchedulingUser,
  TimeSlot,
  WeeklySchedule,
} from './types.js'

const DAY_MAP: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

interface SlotCalculationContext {
  user: SchedulingUser
  eventType: EventType
  availability: { weeklySchedule: WeeklySchedule; timezone: string }
  blockedDates: BlockedDate[]
  existingBookings: Booking[]
  googleBusyTimes?: BusyTime[]
  inviteeTimezone: string
}

/**
 * Get available time slots for a specific date
 */
export function calculateAvailableSlots(
  date: string, // YYYY-MM-DD
  context: SlotCalculationContext
): AvailableSlot[] {
  const {
    user,
    eventType,
    availability,
    blockedDates,
    existingBookings,
    googleBusyTimes = [],
    inviteeTimezone,
  } = context

  const hostTimezone = availability.timezone
  const dateObj = parseISO(date)

  // Get effective settings (event type overrides user defaults)
  const settings = getEffectiveSettings(user, eventType)

  // Check if date is within booking window
  const now = new Date()
  const minBookingTime = addMinutes(now, settings.minimumNoticeHours * 60)
  const maxBookingDate = addDays(now, settings.bookingWindowDays)

  if (isAfter(dateObj, maxBookingDate)) {
    return []
  }

  // Get day of week
  const dayIndex = dateObj.getDay()
  const dayOfWeek = DAY_MAP[dayIndex] as DayOfWeek
  const daySchedule = availability.weeklySchedule[dayOfWeek]

  if (!daySchedule || daySchedule.length === 0) {
    return []
  }

  // Check if entire day is blocked
  if (isDateBlocked(date, blockedDates)) {
    return []
  }

  // Generate all potential slots for this day
  const slots: AvailableSlot[] = []
  const duration = eventType.duration
  const bufferBefore = settings.bufferBeforeMins
  const bufferAfter = settings.bufferAfterMins

  for (const timeWindow of daySchedule) {
    const windowSlots = generateSlotsForWindow(
      dateObj,
      timeWindow,
      duration,
      bufferBefore,
      bufferAfter,
      hostTimezone,
      inviteeTimezone
    )
    slots.push(...windowSlots)
  }

  // Filter out unavailable slots
  const filteredSlots = slots.map((slot) => {
    const slotStart = parseISO(slot.startTime)
    const slotEnd = parseISO(slot.endTime)

    // Check minimum notice
    if (isBefore(slotStart, minBookingTime)) {
      return { ...slot, available: false }
    }

    // Check blocked time ranges
    if (isSlotBlockedByPartialBlock(slotStart, slotEnd, date, blockedDates)) {
      return { ...slot, available: false }
    }

    // Check existing bookings (with buffers)
    if (isSlotConflictingWithBookings(slotStart, slotEnd, existingBookings, bufferBefore, bufferAfter)) {
      return { ...slot, available: false }
    }

    // Check Google Calendar busy times
    if (isSlotConflictingWithBusyTimes(slotStart, slotEnd, googleBusyTimes)) {
      return { ...slot, available: false }
    }

    return slot
  })

  // Check daily limit
  const confirmedToday = existingBookings.filter(
    (b) => b.status === 'confirmed' && isSameDay(new Date(b.startTime), dateObj)
  ).length

  if (settings.dailyLimit !== null && confirmedToday >= settings.dailyLimit) {
    return filteredSlots.map((s) => ({ ...s, available: false }))
  }

  return filteredSlots.filter((s) => s.available)
}

/**
 * Get effective settings combining user defaults with event type overrides
 */
function getEffectiveSettings(
  user: SchedulingUser,
  eventType: EventType
): {
  minimumNoticeHours: number
  bookingWindowDays: number
  bufferBeforeMins: number
  bufferAfterMins: number
  dailyLimit: number | null
} {
  const overrides = eventType.settingOverrides || {}

  return {
    minimumNoticeHours: overrides.minimumNoticeHours ?? user.minimumNoticeHours,
    bookingWindowDays: overrides.bookingWindowDays ?? user.bookingWindowDays,
    bufferBeforeMins: overrides.bufferBeforeMins ?? user.bufferBeforeMins,
    bufferAfterMins: overrides.bufferAfterMins ?? user.bufferAfterMins,
    dailyLimit: overrides.dailyLimit !== undefined ? overrides.dailyLimit : user.dailyLimit,
  }
}

/**
 * Generate time slots for a single availability window
 */
function generateSlotsForWindow(
  date: Date,
  window: TimeSlot,
  duration: number,
  _bufferBefore: number,
  _bufferAfter: number,
  hostTimezone: string,
  _inviteeTimezone: string
): AvailableSlot[] {
  const slots: AvailableSlot[] = []

  // Parse start and end times in host timezone
  const startParts = window.start.split(':').map(Number)
  const endParts = window.end.split(':').map(Number)
  const startHour = startParts[0] ?? 9
  const startMin = startParts[1] ?? 0
  const endHour = endParts[0] ?? 17
  const endMin = endParts[1] ?? 0

  // Create times in host timezone
  const dayStart = startOfDay(date)
  let windowStart = setMinutes(setHours(dayStart, startHour), startMin)
  const windowEnd = setMinutes(setHours(dayStart, endHour), endMin)

  // Convert to UTC for storage
  windowStart = fromZonedTime(windowStart, hostTimezone)
  const windowEndUtc = fromZonedTime(windowEnd, hostTimezone)

  // Generate 15-minute slots
  const slotInterval = 15
  let currentSlot = windowStart

  while (isBefore(addMinutes(currentSlot, duration), windowEndUtc) ||
         addMinutes(currentSlot, duration).getTime() === windowEndUtc.getTime()) {
    const slotEnd = addMinutes(currentSlot, duration)

    slots.push({
      startTime: currentSlot.toISOString(),
      endTime: slotEnd.toISOString(),
      available: true,
    })

    currentSlot = addMinutes(currentSlot, slotInterval)
  }

  return slots
}

/**
 * Check if a date is completely blocked
 */
function isDateBlocked(date: string, blockedDates: BlockedDate[]): boolean {
  const dateObj = parseISO(date)

  for (const blocked of blockedDates) {
    const blockStart = parseISO(blocked.startDate)
    const blockEnd = parseISO(blocked.endDate)

    if (
      blocked.isAllDay &&
      (isSameDay(dateObj, blockStart) ||
        isSameDay(dateObj, blockEnd) ||
        (isAfter(dateObj, blockStart) && isBefore(dateObj, blockEnd)))
    ) {
      return true
    }
  }

  return false
}

/**
 * Check if a slot conflicts with partial-day blocks
 */
function isSlotBlockedByPartialBlock(
  slotStart: Date,
  slotEnd: Date,
  date: string,
  blockedDates: BlockedDate[]
): boolean {
  const dateObj = parseISO(date)

  for (const blocked of blockedDates) {
    if (blocked.isAllDay) continue

    const blockStart = parseISO(blocked.startDate)
    const blockEnd = parseISO(blocked.endDate)

    // Check if block applies to this date
    if (
      !isSameDay(dateObj, blockStart) &&
      !isSameDay(dateObj, blockEnd) &&
      !(isAfter(dateObj, blockStart) && isBefore(dateObj, blockEnd))
    ) {
      continue
    }

    // Check time overlap
    if (blocked.startTime && blocked.endTime) {
      const blockStartParts = blocked.startTime.split(':').map(Number)
      const blockEndParts = blocked.endTime.split(':').map(Number)
      const blockStartHour = blockStartParts[0] ?? 0
      const blockStartMin = blockStartParts[1] ?? 0
      const blockEndHour = blockEndParts[0] ?? 0
      const blockEndMin = blockEndParts[1] ?? 0

      const blockTimeStart = setMinutes(setHours(dateObj, blockStartHour), blockStartMin)
      const blockTimeEnd = setMinutes(setHours(dateObj, blockEndHour), blockEndMin)

      if (isBefore(slotStart, blockTimeEnd) && isAfter(slotEnd, blockTimeStart)) {
        return true
      }
    }
  }

  return false
}

/**
 * Check if a slot conflicts with existing bookings
 */
function isSlotConflictingWithBookings(
  slotStart: Date,
  slotEnd: Date,
  bookings: Booking[],
  bufferBefore: number,
  bufferAfter: number
): boolean {
  for (const booking of bookings) {
    if (booking.status !== 'confirmed' && booking.status !== 'rescheduled') {
      continue
    }

    const bookingStart = new Date(booking.startTime)
    const bookingEnd = new Date(booking.endTime)

    // Add buffers
    const bookingStartWithBuffer = addMinutes(bookingStart, -bufferBefore)
    const bookingEndWithBuffer = addMinutes(bookingEnd, bufferAfter)

    // Check overlap
    if (isBefore(slotStart, bookingEndWithBuffer) && isAfter(slotEnd, bookingStartWithBuffer)) {
      return true
    }
  }

  return false
}

/**
 * Check if a slot conflicts with Google Calendar busy times
 */
function isSlotConflictingWithBusyTimes(
  slotStart: Date,
  slotEnd: Date,
  busyTimes: BusyTime[]
): boolean {
  for (const busy of busyTimes) {
    const busyStart = parseISO(busy.start)
    const busyEnd = parseISO(busy.end)

    if (isBefore(slotStart, busyEnd) && isAfter(slotEnd, busyStart)) {
      return true
    }
  }

  return false
}

/**
 * Get available dates for a month
 * Returns dates that have at least one available slot
 */
export function getAvailableDatesForMonth(
  year: number,
  month: number, // 0-indexed
  context: Omit<SlotCalculationContext, 'inviteeTimezone'> & { inviteeTimezone: string }
): string[] {
  const availableDates: string[] = []
  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 0)

  let currentDate = startDate
  while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
    const dateStr = format(currentDate, 'yyyy-MM-dd')
    const slots = calculateAvailableSlots(dateStr, context)

    if (slots.length > 0) {
      availableDates.push(dateStr)
    }

    currentDate = addDays(currentDate, 1)
  }

  return availableDates
}

/**
 * Check if a specific slot is still available
 * Used for validation before booking
 */
export function isSlotAvailable(
  startTime: string,
  _endTime: string,
  context: SlotCalculationContext
): boolean {
  const slotStart = parseISO(startTime)
  const date = format(slotStart, 'yyyy-MM-dd')

  const availableSlots = calculateAvailableSlots(date, context)

  return availableSlots.some(
    (slot) => slot.startTime === startTime && slot.endTime === _endTime && slot.available
  )
}

/**
 * Format a slot time for display in a specific timezone
 */
export function formatSlotTime(
  isoTime: string,
  timezone: string,
  formatStr = 'h:mm a'
): string {
  const date = parseISO(isoTime)
  const zonedDate = toZonedTime(date, timezone)
  return format(zonedDate, formatStr)
}

/**
 * Convert a time from one timezone to another
 */
export function convertTimezone(
  isoTime: string,
  fromTz: string,
  toTz: string
): string {
  const date = parseISO(isoTime)
  const inFromTz = toZonedTime(date, fromTz)
  const inToTz = fromZonedTime(inFromTz, toTz)
  return inToTz.toISOString()
}
