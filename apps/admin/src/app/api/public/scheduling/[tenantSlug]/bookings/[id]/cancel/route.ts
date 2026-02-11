import { sql } from '@cgk/db'
import { getBooking, updateBookingStatus } from '@cgk/scheduling'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ tenantSlug: string; id: string }>
}

/**
 * POST /api/public/scheduling/[tenantSlug]/bookings/[id]/cancel
 * Cancel a booking (by invitee)
 */
export async function POST(req: Request, { params }: RouteParams) {
  const { tenantSlug, id } = await params

  // Get tenant by slug
  const tenantResult = await sql`
    SELECT id FROM organizations WHERE slug = ${tenantSlug}
  `
  const tenant = tenantResult.rows[0]

  if (!tenant) {
    return Response.json({ error: 'Organization not found' }, { status: 404 })
  }

  const tenantId = tenant.id as string

  const body = (await req.json()) as { email: string; reason?: string }

  if (!body.email) {
    return Response.json({ error: 'email is required for verification' }, { status: 400 })
  }

  // Get booking
  const booking = await getBooking(tenantId, id)

  if (!booking) {
    return Response.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Verify the email matches the invitee
  if (booking.invitee.email.toLowerCase() !== body.email.toLowerCase()) {
    return Response.json({ error: 'Email does not match booking' }, { status: 403 })
  }

  if (booking.status === 'cancelled') {
    return Response.json({ error: 'Booking is already cancelled' }, { status: 400 })
  }

  // Check if booking is in the past
  if (new Date(booking.startTime) < new Date()) {
    return Response.json({ error: 'Cannot cancel past bookings' }, { status: 400 })
  }

  const updatedBooking = await updateBookingStatus(
    tenantId,
    id,
    'cancelled',
    {
      cancelledBy: 'invitee',
      cancelReason: body.reason,
    }
  )

  return Response.json({
    booking: {
      id: updatedBooking?.id,
      status: updatedBooking?.status,
      cancelledBy: updatedBooking?.cancelledBy,
    },
  })
}
