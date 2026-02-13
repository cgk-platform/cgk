import { sql } from '@cgk-platform/db'
import { getEventTypeBySlug, getSchedulingUserByUsername } from '@cgk-platform/scheduling'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ tenantSlug: string; username: string; eventSlug: string }>
}

/**
 * GET /api/public/scheduling/[tenantSlug]/users/[username]/[eventSlug]
 * Get event type details for booking
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const { tenantSlug, username, eventSlug } = await params

  // Get tenant by slug
  const tenantResult = await sql`
    SELECT id, name FROM organizations WHERE slug = ${tenantSlug}
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

  return Response.json({
    user: {
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
    },
    eventType: {
      id: eventType.id,
      slug: eventType.slug,
      name: eventType.name,
      description: eventType.description,
      duration: eventType.duration,
      color: eventType.color,
      location: eventType.location,
      customQuestions: eventType.customQuestions,
    },
    tenant: {
      name: tenant.name,
      slug: tenantSlug,
    },
  })
}
