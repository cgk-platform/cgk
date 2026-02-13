import { getTenantContext } from '@cgk-platform/auth'
import { getSchedulingAnalytics, getSchedulingUser } from '@cgk-platform/scheduling'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/scheduling/analytics
 * Get scheduling analytics for the current user
 */
export async function GET(req: Request) {
  const { tenantId, userId } = await getTenantContext(req)

  if (!tenantId || !userId) {
    return Response.json({ error: 'Tenant and user context required' }, { status: 400 })
  }

  const url = new URL(req.url)
  const days = parseInt(url.searchParams.get('days') || '30', 10)

  const schedulingUser = await getSchedulingUser(tenantId, userId)

  const analytics = await getSchedulingAnalytics(
    tenantId,
    schedulingUser?.id,
    days
  )

  // Calculate additional metrics
  const cancelRate =
    analytics.totalBookings > 0
      ? (analytics.cancelledBookings / analytics.totalBookings) * 100
      : 0

  const avgBookingsPerWeek = analytics.totalBookings / (days / 7)

  return Response.json({
    analytics: {
      summary: {
        ...analytics,
        cancelRate: Math.round(cancelRate * 10) / 10,
        avgBookingsPerWeek: Math.round(avgBookingsPerWeek * 10) / 10,
      },
      byEventType: analytics.byEventType.map((item) => ({
        ...item,
        count: Number(item.count),
        percentage:
          analytics.totalBookings > 0
            ? Math.round((Number(item.count) / analytics.totalBookings) * 1000) / 10
            : 0,
      })),
      byDayOfWeek: analytics.byDayOfWeek,
    },
    period: { days },
  })
}
