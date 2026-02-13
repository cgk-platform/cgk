import { getTenantContext } from '@cgk-platform/auth'
import {
  getBookings,
  getSchedulingUser,
  type BookingFilters,
} from '@cgk-platform/scheduling'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/scheduling/bookings
 * Get bookings with optional filters
 */
export async function GET(req: Request) {
  const { tenantId, userId } = await getTenantContext(req)

  if (!tenantId || !userId) {
    return Response.json({ error: 'Tenant and user context required' }, { status: 400 })
  }

  const url = new URL(req.url)
  const schedulingUser = await getSchedulingUser(tenantId, userId)

  const filters: BookingFilters = {
    status: url.searchParams.get('status') as BookingFilters['status'] || undefined,
    eventTypeId: url.searchParams.get('eventTypeId') || undefined,
    hostUserId: schedulingUser?.id || undefined,
    dateFrom: url.searchParams.get('dateFrom') || undefined,
    dateTo: url.searchParams.get('dateTo') || undefined,
    search: url.searchParams.get('search') || undefined,
    page: parseInt(url.searchParams.get('page') || '1', 10),
    limit: parseInt(url.searchParams.get('limit') || '20', 10),
  }

  const { bookings, total } = await getBookings(tenantId, filters)

  return Response.json({
    bookings,
    total,
    page: filters.page,
    limit: filters.limit,
    totalPages: Math.ceil(total / (filters.limit || 20)),
  })
}
