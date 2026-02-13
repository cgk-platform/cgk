import { withTenant, sql } from '@cgk-platform/db'
import { Card, CardHeader, CardContent, Badge } from '@cgk-platform/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Calendar, Clock, Users, TrendingUp, Plus, Settings } from 'lucide-react'

import { formatDateTime } from '@/lib/format'

interface UpcomingBooking {
  id: string
  event_type_name: string
  invitee_name: string
  invitee_email: string
  start_time: string
  end_time: string
  status: string
}

interface EventTypeSummary {
  id: string
  name: string
  slug: string
  duration: number
  color: string
  booking_count: number
}

export default async function SchedulingDashboardPage() {
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
    // Check if user has scheduling profile
    const profileResult = await sql`
      SELECT id, username, display_name FROM scheduling_users
      WHERE user_id = ${userId}
    `
    const profile = profileResult.rows[0]

    if (!profile) {
      return { hasProfile: false }
    }

    // Get upcoming bookings
    const upcomingResult = await sql`
      SELECT id, event_type_name, invitee->>'name' as invitee_name,
             invitee->>'email' as invitee_email, start_time, end_time, status
      FROM scheduling_bookings
      WHERE host_user_id = ${profile.id}
        AND start_time >= NOW()
        AND status IN ('confirmed', 'rescheduled')
      ORDER BY start_time ASC
      LIMIT 5
    `

    // Get event types with booking counts
    const eventTypesResult = await sql`
      SELECT et.id, et.name, et.slug, et.duration, et.color,
             COUNT(b.id) FILTER (WHERE b.created_at >= NOW() - INTERVAL '30 days') as booking_count
      FROM scheduling_event_types et
      LEFT JOIN scheduling_bookings b ON b.event_type_id = et.id
      WHERE et.user_id = ${profile.id} AND et.is_active = true
      GROUP BY et.id
      ORDER BY booking_count DESC
    `

    // Get stats
    const statsResult = await sql`
      SELECT
        COUNT(*) FILTER (WHERE start_time >= NOW()) as upcoming_count,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as total_30d,
        COUNT(*) FILTER (WHERE status = 'cancelled' AND created_at >= NOW() - INTERVAL '30 days') as cancelled_30d
      FROM scheduling_bookings
      WHERE host_user_id = ${profile.id}
    `
    const stats = statsResult.rows[0]

    return {
      hasProfile: true,
      profile,
      upcomingBookings: upcomingResult.rows as UpcomingBooking[],
      eventTypes: eventTypesResult.rows as EventTypeSummary[],
      stats: {
        upcoming: Number(stats?.upcoming_count || 0),
        total30d: Number(stats?.total_30d || 0),
        cancelled30d: Number(stats?.cancelled_30d || 0),
      },
    }
  })

  if (!data.hasProfile) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold">Scheduling</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Set Up Your Scheduling Profile</h2>
            <p className="mt-2 text-muted-foreground">
              Create your scheduling profile to start accepting bookings.
            </p>
            <Link
              href="/admin/scheduling/settings"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Settings className="h-4 w-4" />
              Set Up Profile
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = data.stats!
  const cancelRate = stats.total30d > 0
    ? Math.round((stats.cancelled30d / stats.total30d) * 100)
    : 0

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Scheduling Dashboard</h1>
        <Link
          href="/admin/scheduling/event-types/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Event Type
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">{stats.upcoming}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bookings (30d)</p>
                <p className="text-2xl font-bold">{stats.total30d}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900">
                <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cancel Rate</p>
                <p className="text-2xl font-bold">{cancelRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900">
                <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Event Types</p>
                <p className="text-2xl font-bold">{data.eventTypes?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Bookings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Upcoming Bookings</h2>
              <Link
                href="/admin/scheduling/bookings"
                className="text-sm text-primary hover:underline"
              >
                View All
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.upcomingBookings?.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No upcoming bookings
              </p>
            ) : (
              <div className="space-y-4">
                {data.upcomingBookings?.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium">{booking.event_type_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.invitee_name} ({booking.invitee_email})
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(booking.start_time)}
                      </p>
                    </div>
                    <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
                      {booking.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Types */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Event Types</h2>
              <Link
                href="/admin/scheduling/event-types"
                className="text-sm text-primary hover:underline"
              >
                Manage
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.eventTypes?.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">No event types yet</p>
                <Link
                  href="/admin/scheduling/event-types/new"
                  className="mt-2 inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  Create your first event type
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {data.eventTypes?.map((eventType) => (
                  <Link
                    key={eventType.id}
                    href={`/admin/scheduling/event-types/${eventType.id}`}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: getColorValue(eventType.color),
                        }}
                      />
                      <div>
                        <p className="font-medium">{eventType.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {eventType.duration} min
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{eventType.booking_count}</p>
                      <p className="text-xs text-muted-foreground">bookings</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function getColorValue(color: string): string {
  const colors: Record<string, string> = {
    green: '#22c55e',
    mint: '#34d399',
    blue: '#3b82f6',
    purple: '#a855f7',
    orange: '#f97316',
    red: '#ef4444',
    gray: '#6b7280',
  }
  return colors[color] ?? '#3b82f6'
}
