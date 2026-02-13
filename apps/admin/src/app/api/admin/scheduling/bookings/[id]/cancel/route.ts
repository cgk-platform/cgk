import { requireAuth } from '@cgk-platform/auth'
import { getBooking, updateBookingStatus } from '@cgk-platform/scheduling'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/admin/scheduling/bookings/[id]/cancel
 * Cancel a booking (by host)
 */
export async function POST(req: Request, { params }: RouteParams) {
  const { id } = await params
  const auth = await requireAuth(req)

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const body = (await req.json()) as { reason?: string }

  const booking = await getBooking(auth.tenantId, id)

  if (!booking) {
    return Response.json({ error: 'Booking not found' }, { status: 404 })
  }

  if (booking.status === 'cancelled') {
    return Response.json({ error: 'Booking is already cancelled' }, { status: 400 })
  }

  const updatedBooking = await updateBookingStatus(
    auth.tenantId,
    id,
    'cancelled',
    {
      cancelledBy: 'host',
      cancelReason: body.reason,
    },
    auth.userId
  )

  return Response.json({ booking: updatedBooking })
}
