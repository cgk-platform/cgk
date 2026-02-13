import { getTenantContext, requireAuth } from '@cgk-platform/auth'
import {
  getAvailability,
  getSchedulingUser,
  updateAvailability,
  type WeeklySchedule,
} from '@cgk-platform/scheduling'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/scheduling/availability
 * Get the current user's availability schedule
 */
export async function GET(req: Request) {
  const { tenantId, userId } = await getTenantContext(req)

  if (!tenantId || !userId) {
    return Response.json({ error: 'Tenant and user context required' }, { status: 400 })
  }

  const schedulingUser = await getSchedulingUser(tenantId, userId)

  if (!schedulingUser) {
    return Response.json({ error: 'Scheduling profile not found' }, { status: 404 })
  }

  const availability = await getAvailability(tenantId, schedulingUser.id)

  return Response.json({ availability })
}

/**
 * PUT /api/admin/scheduling/availability
 * Update the current user's availability schedule
 */
export async function PUT(req: Request) {
  const auth = await requireAuth(req)

  if (!auth.tenantId || !auth.userId) {
    return Response.json({ error: 'Tenant and user context required' }, { status: 400 })
  }

  const body = (await req.json()) as { schedule: WeeklySchedule; timezone?: string }

  if (!body.schedule) {
    return Response.json({ error: 'schedule is required' }, { status: 400 })
  }

  // Validate schedule structure
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  for (const day of days) {
    if (!Array.isArray(body.schedule[day as keyof WeeklySchedule])) {
      return Response.json(
        { error: `Invalid schedule format for ${day}` },
        { status: 400 }
      )
    }
  }

  const schedulingUser = await getSchedulingUser(auth.tenantId, auth.userId)

  if (!schedulingUser) {
    return Response.json({ error: 'Scheduling profile not found' }, { status: 404 })
  }

  const availability = await updateAvailability(
    auth.tenantId,
    schedulingUser.id,
    body.schedule,
    body.timezone
  )

  return Response.json({ availability })
}
