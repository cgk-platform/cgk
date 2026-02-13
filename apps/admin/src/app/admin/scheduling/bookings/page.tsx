import { withTenant, sql } from '@cgk-platform/db'
import { Card, CardContent, Badge } from '@cgk-platform/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Calendar, User, Clock, XCircle } from 'lucide-react'

import { formatDateTime } from '@/lib/format'

interface Booking {
  id: string
  event_type_name: string
  invitee_name: string
  invitee_email: string
  start_time: string
  end_time: string
  timezone: string
  status: string
  cancelled_by: string | null
  cancel_reason: string | null
  created_at: string
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const status = typeof params.status === 'string' ? params.status : undefined
  const page = parseInt(typeof params.page === 'string' ? params.page : '1', 10)
  const limit = 20

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
      return { hasProfile: false, bookings: [], total: 0 }
    }

    let whereClause = `WHERE host_user_id = '${profile.id}'`
    if (status) {
      whereClause += ` AND status = '${status}'`
    }

    const offset = (page - 1) * limit

    const dataResult = await sql.query(`
      SELECT id, event_type_name, invitee->>'name' as invitee_name,
             invitee->>'email' as invitee_email, start_time, end_time,
             timezone, status, cancelled_by, cancel_reason, created_at
      FROM scheduling_bookings
      ${whereClause}
      ORDER BY start_time DESC
      LIMIT ${limit} OFFSET ${offset}
    `)

    const countResult = await sql.query(`
      SELECT COUNT(*) as count FROM scheduling_bookings ${whereClause}
    `)

    return {
      hasProfile: true,
      bookings: dataResult.rows as Booking[],
      total: Number(countResult.rows[0]?.count || 0),
    }
  })

  const totalPages = Math.ceil(data.total / limit)

  const getStatusBadgeVariant = (bookingStatus: string) => {
    switch (bookingStatus) {
      case 'confirmed':
        return 'default'
      case 'completed':
        return 'secondary'
      case 'cancelled':
        return 'destructive'
      case 'no_show':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-muted-foreground">
            View and manage your scheduled meetings
          </p>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2">
        <Link
          href="/admin/scheduling/bookings"
          className={`rounded-md px-3 py-1.5 text-sm ${!status ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
        >
          All
        </Link>
        <Link
          href="/admin/scheduling/bookings?status=confirmed"
          className={`rounded-md px-3 py-1.5 text-sm ${status === 'confirmed' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
        >
          Upcoming
        </Link>
        <Link
          href="/admin/scheduling/bookings?status=completed"
          className={`rounded-md px-3 py-1.5 text-sm ${status === 'completed' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
        >
          Completed
        </Link>
        <Link
          href="/admin/scheduling/bookings?status=cancelled"
          className={`rounded-md px-3 py-1.5 text-sm ${status === 'cancelled' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
        >
          Cancelled
        </Link>
      </div>

      {!data.hasProfile ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Set Up Your Profile</h2>
            <p className="mt-2 text-muted-foreground">
              Create your scheduling profile to start accepting bookings.
            </p>
            <Link
              href="/admin/scheduling/settings"
              className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Set Up Profile
            </Link>
          </CardContent>
        </Card>
      ) : data.bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">No Bookings Yet</h2>
            <p className="mt-2 text-muted-foreground">
              {status ? `No ${status} bookings found.` : 'Your bookings will appear here.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.bookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{booking.event_type_name}</h3>
                      <Badge variant={getStatusBadgeVariant(booking.status)}>
                        {booking.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {booking.invitee_name}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDateTime(booking.start_time)}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {booking.invitee_email}
                    </p>

                    {booking.status === 'cancelled' && booking.cancel_reason && (
                      <div className="flex items-start gap-2 rounded-md bg-muted p-2 text-sm">
                        <XCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-muted-foreground">
                            Cancelled by {booking.cancelled_by}:
                          </span>{' '}
                          {booking.cancel_reason}
                        </div>
                      </div>
                    )}
                  </div>

                  {booking.status === 'confirmed' && new Date(booking.start_time) > new Date() && (
                    <CancelButton bookingId={booking.id} />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/scheduling/bookings?page=${page - 1}${status ? `&status=${status}` : ''}`}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  Previous
                </Link>
              )}
              <span className="px-3 py-1.5 text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/admin/scheduling/bookings?page=${page + 1}${status ? `&status=${status}` : ''}`}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CancelButton({ bookingId }: { bookingId: string }) {
  return (
    <form
      action={async () => {
        'use server'
        // Cancel action handled client-side for now
      }}
    >
      <button
        type="button"
        className="rounded-md border px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
        onClick={async () => {
          if (typeof window !== 'undefined') {
            const reason = prompt('Reason for cancellation (optional):')
            if (reason !== null) {
              await fetch(`/api/admin/scheduling/bookings/${bookingId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
              })
              window.location.reload()
            }
          }
        }}
      >
        Cancel
      </button>
    </form>
  )
}
