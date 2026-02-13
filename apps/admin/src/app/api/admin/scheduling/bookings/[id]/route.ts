import { getTenantContext } from '@cgk-platform/auth'
import { getBooking } from '@cgk-platform/scheduling'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/scheduling/bookings/[id]
 * Get a specific booking
 */
export async function GET(req: Request, { params }: RouteParams) {
  const { id } = await params
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const booking = await getBooking(tenantId, id)

  if (!booking) {
    return Response.json({ error: 'Booking not found' }, { status: 404 })
  }

  return Response.json({ booking })
}
