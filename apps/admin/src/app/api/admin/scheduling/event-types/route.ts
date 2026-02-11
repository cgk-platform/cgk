import { getTenantContext, requireAuth } from '@cgk/auth'
import {
  createEventType,
  getEventTypesByUser,
  getSchedulingUser,
  type CreateEventTypeInput,
} from '@cgk/scheduling'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/scheduling/event-types
 * List event types for the current user or specified user
 */
export async function GET(req: Request) {
  const { tenantId, userId } = await getTenantContext(req)

  if (!tenantId || !userId) {
    return Response.json({ error: 'Tenant and user context required' }, { status: 400 })
  }

  const url = new URL(req.url)
  const includeInactive = url.searchParams.get('includeInactive') === 'true'

  // Get scheduling user for current user
  const schedulingUser = await getSchedulingUser(tenantId, userId)

  if (!schedulingUser) {
    return Response.json({ eventTypes: [] })
  }

  const eventTypes = await getEventTypesByUser(tenantId, schedulingUser.id, includeInactive)

  return Response.json({ eventTypes })
}

/**
 * POST /api/admin/scheduling/event-types
 * Create a new event type
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req)

  if (!auth.tenantId || !auth.userId) {
    return Response.json({ error: 'Tenant and user context required' }, { status: 400 })
  }

  const body = (await req.json()) as Omit<CreateEventTypeInput, 'userId'>

  if (!body.name || !body.slug || !body.duration) {
    return Response.json(
      { error: 'name, slug, and duration are required' },
      { status: 400 }
    )
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(body.slug)) {
    return Response.json(
      { error: 'Slug must be lowercase alphanumeric with hyphens' },
      { status: 400 }
    )
  }

  // Get scheduling user for current user
  const schedulingUser = await getSchedulingUser(auth.tenantId, auth.userId)

  if (!schedulingUser) {
    return Response.json(
      { error: 'You must create a scheduling profile first' },
      { status: 400 }
    )
  }

  const eventType = await createEventType(auth.tenantId, {
    ...body,
    userId: schedulingUser.id,
  })

  return Response.json({ eventType }, { status: 201 })
}
