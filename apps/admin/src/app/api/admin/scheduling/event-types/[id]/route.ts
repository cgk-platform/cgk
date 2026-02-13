import { getTenantContext, requireAuth } from '@cgk-platform/auth'
import {
  archiveEventType,
  getEventType,
  updateEventType,
  type UpdateEventTypeInput,
} from '@cgk-platform/scheduling'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/scheduling/event-types/[id]
 * Get a specific event type
 */
export async function GET(req: Request, { params }: RouteParams) {
  const { id } = await params
  const { tenantId } = await getTenantContext(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const eventType = await getEventType(tenantId, id)

  if (!eventType) {
    return Response.json({ error: 'Event type not found' }, { status: 404 })
  }

  return Response.json({ eventType })
}

/**
 * PUT /api/admin/scheduling/event-types/[id]
 * Update an event type
 */
export async function PUT(req: Request, { params }: RouteParams) {
  const { id } = await params
  const auth = await requireAuth(req)

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const body = (await req.json()) as UpdateEventTypeInput

  // Validate slug format if provided
  if (body.slug && !/^[a-z0-9-]+$/.test(body.slug)) {
    return Response.json(
      { error: 'Slug must be lowercase alphanumeric with hyphens' },
      { status: 400 }
    )
  }

  const eventType = await updateEventType(auth.tenantId, id, body, auth.userId)

  if (!eventType) {
    return Response.json({ error: 'Event type not found' }, { status: 404 })
  }

  return Response.json({ eventType })
}

/**
 * DELETE /api/admin/scheduling/event-types/[id]
 * Archive an event type
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  const { id } = await params
  const auth = await requireAuth(req)

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const archived = await archiveEventType(auth.tenantId, id, auth.userId)

  if (!archived) {
    return Response.json({ error: 'Event type not found' }, { status: 404 })
  }

  return Response.json({ success: true })
}
