/**
 * Welcome Call Scheduling API
 *
 * GET /api/creator/scheduling/welcome-call - Get available time slots
 * POST /api/creator/scheduling/welcome-call - Book a slot
 */

import { sql, withTenant, getTenantFromRequest } from '@cgk/db'
import type { WelcomeCallSlot } from '../../../../../lib/onboarding/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface EventTypeRecord {
  id: string
  user_id: string
  name: string
  duration: number
}

interface SchedulingUserRecord {
  id: string
  display_name: string
  email: string
  timezone: string
  minimum_notice_hours: number
  booking_window_days: number
  buffer_before_mins: number
  buffer_after_mins: number
}

interface AvailabilityRecord {
  timezone: string
  weekly_schedule: Record<string, Array<{ start: string; end: string }>>
}

interface BookingRecord {
  id: string
  start_time: string
  end_time: string
}

interface BlockedDateRecord {
  start_date: string
  end_date: string
  is_all_day: boolean
  start_time: string | null
  end_time: string | null
}

/**
 * Get available time slots for welcome call
 */
export async function GET(request: Request): Promise<Response> {
  const tenant = await getTenantFromRequest(request)

  if (!tenant) {
    return Response.json(
      { error: 'Tenant context required' },
      { status: 400 }
    )
  }

  const url = new URL(request.url)
  const dateParam = url.searchParams.get('date')

  if (!dateParam) {
    return Response.json(
      { error: 'Date parameter is required (YYYY-MM-DD)' },
      { status: 400 }
    )
  }

  // Parse and validate the date
  const requestedDate = new Date(dateParam + 'T00:00:00')
  if (isNaN(requestedDate.getTime())) {
    return Response.json(
      { error: 'Invalid date format. Use YYYY-MM-DD' },
      { status: 400 }
    )
  }

  // Get the welcome call event type configuration
  const settings = await withTenant(tenant.slug, async () => {
    const result = await sql<{ welcome_call_event_type_id: string | null }>`
      SELECT welcome_call_event_type_id FROM tenant_onboarding_settings LIMIT 1
    `
    return result.rows[0]
  })

  if (!settings?.welcome_call_event_type_id) {
    return Response.json({
      slots: [],
      message: 'Welcome call scheduling is not configured',
    })
  }

  // Get the event type
  const eventType = await withTenant(tenant.slug, async () => {
    const result = await sql<EventTypeRecord>`
      SELECT id, user_id, name, duration
      FROM scheduling_event_types
      WHERE id = ${settings.welcome_call_event_type_id}
      AND is_active = true
    `
    return result.rows[0]
  })

  if (!eventType) {
    return Response.json({
      slots: [],
      message: 'Welcome call event type not found',
    })
  }

  // Get the host user
  const hostUser = await withTenant(tenant.slug, async () => {
    const result = await sql<SchedulingUserRecord>`
      SELECT id, display_name, email, timezone, minimum_notice_hours,
             booking_window_days, buffer_before_mins, buffer_after_mins
      FROM scheduling_users
      WHERE id = ${eventType.user_id}
      AND is_active = true
    `
    return result.rows[0]
  })

  if (!hostUser) {
    return Response.json({
      slots: [],
      message: 'Host not available',
    })
  }

  // Get availability schedule
  const availability = await withTenant(tenant.slug, async () => {
    const result = await sql<AvailabilityRecord>`
      SELECT timezone, weekly_schedule
      FROM scheduling_availability
      WHERE user_id = ${hostUser.id}
    `
    return result.rows[0]
  })

  if (!availability) {
    return Response.json({
      slots: [],
      message: 'No availability configured',
    })
  }

  // Get existing bookings for the date
  const dayStart = new Date(dateParam + 'T00:00:00Z')
  const dayEnd = new Date(dateParam + 'T23:59:59Z')

  const existingBookings = await withTenant(tenant.slug, async () => {
    const result = await sql<BookingRecord>`
      SELECT id, start_time, end_time
      FROM scheduling_bookings
      WHERE host_user_id = ${hostUser.id}
      AND start_time >= ${dayStart.toISOString()}
      AND start_time <= ${dayEnd.toISOString()}
      AND status = 'confirmed'
    `
    return result.rows
  })

  // Get blocked dates
  const blockedDates = await withTenant(tenant.slug, async () => {
    const result = await sql<BlockedDateRecord>`
      SELECT start_date, end_date, is_all_day, start_time, end_time
      FROM scheduling_blocked_dates
      WHERE user_id = ${hostUser.id}
      AND start_date <= ${dateParam}
      AND end_date >= ${dateParam}
    `
    return result.rows
  })

  // Check if date is blocked entirely
  const isDateBlocked = blockedDates.some(
    (block) => block.is_all_day
  )

  if (isDateBlocked) {
    return Response.json({
      slots: [],
      message: 'No availability on this date',
    })
  }

  // Get the day of week for availability lookup
  const dayOfWeek = requestedDate
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase()
  const daySchedule = availability.weekly_schedule[dayOfWeek] || []

  if (daySchedule.length === 0) {
    return Response.json({
      slots: [],
      message: 'No availability on this day',
    })
  }

  // Generate time slots
  const slots: WelcomeCallSlot[] = []
  const now = new Date()
  const minimumStart = new Date(
    now.getTime() + hostUser.minimum_notice_hours * 60 * 60 * 1000
  )

  for (const window of daySchedule) {
    const [startHourStr, startMinStr] = window.start.split(':')
    const [endHourStr, endMinStr] = window.end.split(':')
    const startHour = Number(startHourStr) ?? 0
    const startMin = Number(startMinStr) ?? 0
    const endHour = Number(endHourStr) ?? 0
    const endMin = Number(endMinStr) ?? 0

    // Create slots at 30-minute intervals
    let slotStart = new Date(requestedDate)
    slotStart.setHours(startHour, startMin, 0, 0)

    const windowEnd = new Date(requestedDate)
    windowEnd.setHours(endHour, endMin, 0, 0)

    while (slotStart.getTime() + eventType.duration * 60 * 1000 <= windowEnd.getTime()) {
      const slotEnd = new Date(
        slotStart.getTime() + eventType.duration * 60 * 1000
      )

      // Check if slot is in the future with minimum notice
      if (slotStart > minimumStart) {
        // Check if slot conflicts with existing bookings
        const hasConflict = existingBookings.some((booking) => {
          const bookingStart = new Date(booking.start_time)
          const bookingEnd = new Date(booking.end_time)
          const bufferStart = new Date(
            bookingStart.getTime() - hostUser.buffer_before_mins * 60 * 1000
          )
          const bufferEnd = new Date(
            bookingEnd.getTime() + hostUser.buffer_after_mins * 60 * 1000
          )

          return slotStart < bufferEnd && slotEnd > bufferStart
        })

        if (!hasConflict) {
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            hostId: hostUser.id,
            hostName: hostUser.display_name,
            eventTypeId: eventType.id,
          })
        }
      }

      // Move to next 30-minute slot
      slotStart = new Date(slotStart.getTime() + 30 * 60 * 1000)
    }
  }

  return Response.json({ slots })
}

interface BookSlotRequest {
  slotStart: string
  hostId: string
  eventTypeId: string
  timezone: string
  invitee: {
    name: string
    email: string
    notes?: string
  }
}

/**
 * Book a welcome call slot
 */
export async function POST(request: Request): Promise<Response> {
  const tenant = await getTenantFromRequest(request)

  if (!tenant) {
    return Response.json(
      { error: 'Tenant context required' },
      { status: 400 }
    )
  }

  let body: BookSlotRequest
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  const { slotStart, hostId, eventTypeId, timezone, invitee } = body

  if (!slotStart || !hostId || !eventTypeId || !invitee?.name || !invitee?.email) {
    return Response.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  // Get event type for duration
  const eventType = await withTenant(tenant.slug, async () => {
    const result = await sql<{ duration: number; name: string }>`
      SELECT duration, name FROM scheduling_event_types WHERE id = ${eventTypeId}
    `
    return result.rows[0]
  })

  if (!eventType) {
    return Response.json(
      { error: 'Event type not found' },
      { status: 404 }
    )
  }

  // Get host info
  const host = await withTenant(tenant.slug, async () => {
    const result = await sql<{ display_name: string; email: string }>`
      SELECT display_name, email FROM scheduling_users WHERE id = ${hostId}
    `
    return result.rows[0]
  })

  if (!host) {
    return Response.json(
      { error: 'Host not found' },
      { status: 404 }
    )
  }

  const startTime = new Date(slotStart)
  const endTime = new Date(startTime.getTime() + eventType.duration * 60 * 1000)

  // Check for conflicts
  const conflicts = await withTenant(tenant.slug, async () => {
    const result = await sql<{ id: string }>`
      SELECT id FROM scheduling_bookings
      WHERE host_user_id = ${hostId}
      AND status = 'confirmed'
      AND start_time < ${endTime.toISOString()}
      AND end_time > ${startTime.toISOString()}
    `
    return result.rows
  })

  if (conflicts.length > 0) {
    return Response.json(
      { error: 'This time slot is no longer available' },
      { status: 409 }
    )
  }

  // Create the booking
  const booking = await withTenant(tenant.slug, async () => {
    const result = await sql<{ id: string }>`
      INSERT INTO scheduling_bookings (
        tenant_id,
        event_type_id,
        host_user_id,
        event_type_name,
        host_name,
        host_email,
        invitee,
        start_time,
        end_time,
        timezone,
        status,
        location
      ) VALUES (
        ${tenant.id},
        ${eventTypeId},
        ${hostId},
        ${eventType.name},
        ${host.display_name},
        ${host.email},
        ${JSON.stringify(invitee)},
        ${startTime.toISOString()},
        ${endTime.toISOString()},
        ${timezone ?? 'America/New_York'},
        'confirmed',
        ${JSON.stringify({ type: 'google_meet' })}
      )
      RETURNING id
    `
    return result.rows[0]
  })

  if (!booking) {
    return Response.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }

  return Response.json({
    success: true,
    bookingId: booking.id,
    booking: {
      id: booking.id,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      hostName: host.display_name,
      eventName: eventType.name,
    },
  })
}
