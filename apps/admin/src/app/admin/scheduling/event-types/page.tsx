import { withTenant, sql } from '@cgk/db'
import { Card, CardContent, Badge } from '@cgk/ui'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Plus, Calendar, Copy, ExternalLink } from 'lucide-react'

interface EventType {
  id: string
  name: string
  slug: string
  description: string | null
  duration: number
  color: string
  is_active: boolean
  booking_count: number
}

export default async function EventTypesPage() {
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
      SELECT id, username FROM scheduling_users WHERE user_id = ${userId}
    `
    const profile = profileResult.rows[0]

    if (!profile) {
      return { hasProfile: false, eventTypes: [], username: null }
    }

    const eventTypesResult = await sql`
      SELECT et.id, et.name, et.slug, et.description, et.duration, et.color, et.is_active,
             COUNT(b.id) as booking_count
      FROM scheduling_event_types et
      LEFT JOIN scheduling_bookings b ON b.event_type_id = et.id
      WHERE et.user_id = ${profile.id} AND et.archived_at IS NULL
      GROUP BY et.id
      ORDER BY et.created_at DESC
    `

    return {
      hasProfile: true,
      eventTypes: eventTypesResult.rows as EventType[],
      username: profile.username as string,
    }
  })

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Event Types</h1>
          <p className="text-muted-foreground">
            Create and manage your meeting types
          </p>
        </div>
        <Link
          href="/admin/scheduling/event-types/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Event Type
        </Link>
      </div>

      {!data.hasProfile ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Set Up Your Profile First</h2>
            <p className="mt-2 text-muted-foreground">
              Create your scheduling profile before adding event types.
            </p>
            <Link
              href="/admin/scheduling/settings"
              className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Set Up Profile
            </Link>
          </CardContent>
        </Card>
      ) : data.eventTypes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">No Event Types Yet</h2>
            <p className="mt-2 text-muted-foreground">
              Create your first event type to start accepting bookings.
            </p>
            <Link
              href="/admin/scheduling/event-types/new"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Create Event Type
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.eventTypes.map((eventType) => (
            <Card key={eventType.id} className="relative overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full w-1"
                style={{ backgroundColor: getColorValue(eventType.color) }}
              />
              <CardContent className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{eventType.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {eventType.duration} min
                    </p>
                  </div>
                  <Badge variant={eventType.is_active ? 'default' : 'secondary'}>
                    {eventType.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {eventType.description && (
                  <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
                    {eventType.description}
                  </p>
                )}

                <div className="mb-4 text-sm text-muted-foreground">
                  {eventType.booking_count} bookings
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/scheduling/event-types/${eventType.id}`}
                    className="flex-1 rounded-md border px-3 py-2 text-center text-sm hover:bg-muted"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="rounded-md border p-2 hover:bg-muted"
                    title="Copy booking link"
                    onClick={() => {
                      // Copy handled client-side
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <Link
                    href={`/book/${tenantSlug}/${data.username}/${eventType.slug}`}
                    target="_blank"
                    className="rounded-md border p-2 hover:bg-muted"
                    title="Preview booking page"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
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
