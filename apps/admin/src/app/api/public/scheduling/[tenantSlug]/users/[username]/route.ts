import { sql } from '@cgk/db'
import { getEventTypesByUser, getSchedulingUserByUsername } from '@cgk/scheduling'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ tenantSlug: string; username: string }>
}

/**
 * GET /api/public/scheduling/[tenantSlug]/users/[username]
 * Get public scheduling user profile with their event types
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const { tenantSlug, username } = await params

  // Get tenant by slug
  const tenantResult = await sql`
    SELECT id, name, settings FROM organizations WHERE slug = ${tenantSlug}
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

  // Get active event types
  const eventTypes = await getEventTypesByUser(tenantId, user.id, false)

  // Return public-safe data only
  return Response.json({
    user: {
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
    },
    eventTypes: eventTypes.map((et) => ({
      slug: et.slug,
      name: et.name,
      description: et.description,
      duration: et.duration,
      color: et.color,
    })),
    tenant: {
      name: tenant.name,
      slug: tenantSlug,
    },
  })
}
