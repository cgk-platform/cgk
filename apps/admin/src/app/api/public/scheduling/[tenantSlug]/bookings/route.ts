import { sql } from '@cgk/db'
import {
  acquireBookingLock,
  calculateAvailableSlots,
  createBooking,
  getAvailability,
  getBlockedDates,
  getBookingsForHost,
  getEventType,
  getSchedulingUser,
  checkBookingRateLimit,
  releaseBookingLock,
  type CreateBookingInput,
  type Invitee,
} from '@cgk/scheduling'
import { addDays, format, parseISO } from 'date-fns'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ tenantSlug: string }>
}

interface BookingRequestBody {
  eventTypeId: string
  startTime: string
  endTime: string
  timezone: string
  invitee: Invitee
}

/**
 * POST /api/public/scheduling/[tenantSlug]/bookings
 * Create a new booking
 */
export async function POST(req: Request, { params }: RouteParams) {
  const { tenantSlug } = await params
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

  // Get tenant by slug
  const tenantResult = await sql`
    SELECT id FROM organizations WHERE slug = ${tenantSlug}
  `
  const tenant = tenantResult.rows[0]

  if (!tenant) {
    return Response.json({ error: 'Organization not found' }, { status: 404 })
  }

  const tenantId = tenant.id as string

  // Rate limit check
  const rateLimit = await checkBookingRateLimit(tenantId, ip)
  if (!rateLimit.allowed) {
    return Response.json(
      { error: 'Too many booking requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': rateLimit.retryAfter.toString() },
      }
    )
  }

  const body = (await req.json()) as BookingRequestBody

  // Validate required fields
  if (!body.eventTypeId || !body.startTime || !body.endTime || !body.timezone || !body.invitee) {
    return Response.json(
      { error: 'eventTypeId, startTime, endTime, timezone, and invitee are required' },
      { status: 400 }
    )
  }

  if (!body.invitee.name || !body.invitee.email) {
    return Response.json(
      { error: 'invitee.name and invitee.email are required' },
      { status: 400 }
    )
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(body.invitee.email)) {
    return Response.json({ error: 'Invalid email format' }, { status: 400 })
  }

  // Get event type
  const eventType = await getEventType(tenantId, body.eventTypeId)

  if (!eventType || !eventType.isActive) {
    return Response.json({ error: 'Event type not found' }, { status: 404 })
  }

  // Get scheduling user (host)
  const hostUserResult = await sql`
    SELECT user_id FROM scheduling_users WHERE id = ${eventType.userId}
  `
  if (!hostUserResult.rows[0]) {
    return Response.json({ error: 'Host not found' }, { status: 404 })
  }

  const host = await getSchedulingUser(tenantId, hostUserResult.rows[0].user_id as string)
  if (!host) {
    return Response.json({ error: 'Host not found' }, { status: 404 })
  }

  // Acquire booking lock
  const lock = await acquireBookingLock(tenantId, host.id, body.startTime)

  if (!lock.acquired) {
    return Response.json(
      { error: 'This time slot is no longer available. Please select another time.' },
      { status: 409 }
    )
  }

  try {
    // Verify slot is still available
    const dateObj = parseISO(body.startTime)
    const date = format(dateObj, 'yyyy-MM-dd')

    const availability = await getAvailability(tenantId, host.id)
    if (!availability) {
      return Response.json({ error: 'No availability configured' }, { status: 400 })
    }

    const blockedDates = await getBlockedDates(
      tenantId,
      host.id,
      date,
      format(addDays(dateObj, 1), 'yyyy-MM-dd')
    )

    const bookingsStart = format(dateObj, "yyyy-MM-dd'T'00:00:00'Z'")
    const bookingsEnd = format(addDays(dateObj, 1), "yyyy-MM-dd'T'23:59:59'Z'")
    const existingBookings = await getBookingsForHost(tenantId, host.id, bookingsStart, bookingsEnd)

    const slots = calculateAvailableSlots(date, {
      user: host,
      eventType,
      availability,
      blockedDates,
      existingBookings,
      inviteeTimezone: body.timezone,
    })

    const slotAvailable = slots.some(
      (slot) =>
        slot.startTime === body.startTime &&
        slot.endTime === body.endTime &&
        slot.available
    )

    if (!slotAvailable) {
      return Response.json(
        { error: 'This time slot is no longer available. Please select another time.' },
        { status: 409 }
      )
    }

    // Create the booking
    const bookingInput: CreateBookingInput = {
      eventTypeId: body.eventTypeId,
      hostUserId: host.id,
      invitee: body.invitee,
      startTime: body.startTime,
      endTime: body.endTime,
      timezone: body.timezone,
      location: eventType.location,
    }

    const booking = await createBooking(tenantId, bookingInput, eventType, host)

    return Response.json(
      {
        booking: {
          id: booking.id,
          eventTypeName: booking.eventTypeName,
          hostName: booking.hostName,
          startTime: booking.startTime,
          endTime: booking.endTime,
          timezone: booking.timezone,
          location: booking.location,
          status: booking.status,
        },
      },
      { status: 201 }
    )
  } finally {
    await releaseBookingLock(tenantId, lock.lockKey)
  }
}
