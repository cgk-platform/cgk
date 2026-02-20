import { sql } from '@cgk-platform/db'
import {
  calculateAvailableSlots,
  getAvailability,
  getBlockedDates,
  getBookingsForHost,
  getEventTypeBySlug,
  getSchedulingUserByUsername,
} from '@cgk-platform/scheduling'
import { addDays, format, parseISO } from 'date-fns'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ tenantSlug: string; username: string; eventSlug: string }>
}

/**
 * GET /api/public/scheduling/[tenantSlug]/users/[username]/[eventSlug]/slots
 * Get available time slots for a specific date
 */
export async function GET(req: Request, { params }: RouteParams) {
  const { tenantSlug, username, eventSlug } = await params
  const url = new URL(req.url)
  const date = url.searchParams.get('date')
  const timezone = url.searchParams.get('timezone') || 'America/New_York'

  if (!date) {
    return Response.json({ error: 'date parameter is required' }, { status: 400 })
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: 'date must be in YYYY-MM-DD format' }, { status: 400 })
  }

  // Get tenant by slug
  const tenantResult = await sql`
    SELECT id FROM public.organizations WHERE slug = ${tenantSlug}
  `
  const tenant = tenantResult.rows[0]

  if (!tenant) {
    return Response.json({ error: 'Organization not found' }, { status: 404 })
  }

  const tenantId = tenant.id as string

  // Get scheduling user
  const user = await getSchedulingUserByUsername(tenantId, username)

  if (!user || !user.isActive) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  // Get event type
  const eventType = await getEventTypeBySlug(tenantId, user.id, eventSlug)

  if (!eventType || !eventType.isActive) {
    return Response.json({ error: 'Event type not found' }, { status: 404 })
  }

  // Get availability
  const availability = await getAvailability(tenantId, user.id)

  if (!availability) {
    return Response.json({ slots: [] })
  }

  // Get blocked dates for the date range
  const dateObj = parseISO(date)
  const startDate = format(dateObj, 'yyyy-MM-dd')
  const endDate = format(addDays(dateObj, 1), 'yyyy-MM-dd')

  const blockedDates = await getBlockedDates(tenantId, user.id, startDate, endDate)

  // Get existing bookings for the date range
  const bookingsStart = format(dateObj, "yyyy-MM-dd'T'00:00:00'Z'")
  const bookingsEnd = format(addDays(dateObj, 1), "yyyy-MM-dd'T'23:59:59'Z'")
  const existingBookings = await getBookingsForHost(tenantId, user.id, bookingsStart, bookingsEnd)

  // Calculate available slots
  const slots = calculateAvailableSlots(date, {
    user,
    eventType,
    availability,
    blockedDates,
    existingBookings,
    inviteeTimezone: timezone,
  })

  return Response.json({
    date,
    timezone,
    slots,
  })
}
