import { withTenant, sql } from '@cgk-platform/db'
import { Card, CardContent, CardHeader } from '@cgk-platform/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Calendar, TrendingUp, TrendingDown, Users, BarChart3 } from 'lucide-react'

export default async function SchedulingAnalyticsPage() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')
  const userId = headerList.get('x-user-id')

  if (!tenantSlug || !userId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">No tenant or user context available.</p>
      </div>
    )
  }

  const data = await withTenant(tenantSlug, async () => {
    const profileResult = await sql`
      SELECT id FROM scheduling_users WHERE user_id = ${userId}
    `
    const profile = profileResult.rows[0]

    if (!profile) {
      return { hasProfile: false }
    }

    // Get 30-day stats
    const statsResult = await sql`
      SELECT
        COUNT(*) as total_bookings,
        COUNT(*) FILTER (WHERE status = 'confirmed' OR status = 'completed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
      FROM scheduling_bookings
      WHERE host_user_id = ${profile.id}
        AND created_at >= NOW() - INTERVAL '30 days'
    `

    // Get previous 30-day stats for comparison
    const prevStatsResult = await sql`
      SELECT COUNT(*) as total_bookings
      FROM scheduling_bookings
      WHERE host_user_id = ${profile.id}
        AND created_at >= NOW() - INTERVAL '60 days'
        AND created_at < NOW() - INTERVAL '30 days'
    `

    // Get bookings by event type
    const byTypeResult = await sql`
      SELECT event_type_name, COUNT(*) as count
      FROM scheduling_bookings
      WHERE host_user_id = ${profile.id}
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY event_type_name
      ORDER BY count DESC
    `

    // Get bookings by day of week
    const byDayResult = await sql`
      SELECT EXTRACT(DOW FROM start_time) as day_num, COUNT(*) as count
      FROM scheduling_bookings
      WHERE host_user_id = ${profile.id}
        AND created_at >= NOW() - INTERVAL '30 days'
        AND status IN ('confirmed', 'completed')
      GROUP BY day_num
      ORDER BY day_num
    `

    // Get daily trend for last 30 days
    const trendResult = await sql`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM scheduling_bookings
      WHERE host_user_id = ${profile.id}
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    const stats = statsResult.rows[0] || { total_bookings: 0, confirmed: 0, cancelled: 0 }
    const prevStats = prevStatsResult.rows[0] || { total_bookings: 0 }

    return {
      hasProfile: true,
      stats: {
        totalBookings: Number(stats.total_bookings),
        confirmed: Number(stats.confirmed),
        cancelled: Number(stats.cancelled),
        prevTotalBookings: Number(prevStats.total_bookings),
      },
      byEventType: byTypeResult.rows.map((row) => ({
        name: row.event_type_name as string,
        count: Number(row.count),
      })),
      byDayOfWeek: byDayResult.rows.map((row) => ({
        day: Number(row.day_num),
        count: Number(row.count),
      })),
      trend: trendResult.rows.map((row) => ({
        date: row.date as string,
        count: Number(row.count),
      })),
    }
  })

  if (!data.hasProfile) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold">Scheduling Analytics</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Set Up Your Profile</h2>
            <p className="mt-2 text-muted-foreground">
              Create your scheduling profile to see analytics.
            </p>
            <Link
              href="/admin/scheduling/settings"
              className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Set Up Profile
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = data.stats!
  const byEventType = data.byEventType!
  const byDayOfWeek = data.byDayOfWeek!

  const cancelRate = stats.totalBookings > 0
    ? Math.round((stats.cancelled / stats.totalBookings) * 100)
    : 0

  const percentChange = stats.prevTotalBookings > 0
    ? Math.round(((stats.totalBookings - stats.prevTotalBookings) / stats.prevTotalBookings) * 100)
    : 0

  const avgPerWeek = Math.round((stats.totalBookings / 4.3) * 10) / 10

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const maxDayCount = Math.max(...byDayOfWeek.map((d) => d.count), 1)

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Scheduling Analytics</h1>
        <p className="text-muted-foreground">Last 30 days</p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-3xl font-bold">{stats.totalBookings}</p>
                {percentChange !== 0 && (
                  <div className={`flex items-center gap-1 text-sm ${percentChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {percentChange > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {Math.abs(percentChange)}% vs last period
                  </div>
                )}
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-3xl font-bold">{stats.confirmed}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cancel Rate</p>
                <p className="text-3xl font-bold">{cancelRate}%</p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg per Week</p>
                <p className="text-3xl font-bold">{avgPerWeek}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Event Type */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">By Event Type</h2>
          </CardHeader>
          <CardContent>
            {byEventType.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No data yet</p>
            ) : (
              <div className="space-y-4">
                {byEventType.map((item, index) => {
                  const percentage = stats.totalBookings > 0
                    ? Math.round((item.count / stats.totalBookings) * 100)
                    : 0
                  return (
                    <div key={index}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{item.name}</span>
                        <span className="text-muted-foreground">{item.count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Day of Week */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">By Day of Week</h2>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-end justify-around gap-2">
              {dayNames.map((day, index) => {
                const dayData = byDayOfWeek.find((d) => d.day === index)
                const count = dayData?.count || 0
                const height = maxDayCount > 0 ? (count / maxDayCount) * 100 : 0
                return (
                  <div key={day} className="flex flex-col items-center gap-2">
                    <div
                      className="w-8 rounded-t bg-primary transition-all"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    <span className="text-xs text-muted-foreground">{day}</span>
                    <span className="text-xs font-medium">{count}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
