import { getTenantContext, requireAuth } from '@cgk-platform/auth'
import {
  createBlockedDate,
  getBlockedDates,
  getSchedulingUser,
  type CreateBlockedDateInput,
} from '@cgk-platform/scheduling'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/scheduling/blocked-dates
 * Get blocked dates for the current user
 */
export async function GET(req: Request) {
  const { tenantId, userId } = await getTenantContext(req)

  if (!tenantId || !userId) {
    return Response.json({ error: 'Tenant and user context required' }, { status: 400 })
  }

  const url = new URL(req.url)
  const startDate = url.searchParams.get('startDate') || undefined
  const endDate = url.searchParams.get('endDate') || undefined

  const schedulingUser = await getSchedulingUser(tenantId, userId)

  if (!schedulingUser) {
    return Response.json({ blockedDates: [] })
  }

  const blockedDates = await getBlockedDates(tenantId, schedulingUser.id, startDate, endDate)

  return Response.json({ blockedDates })
}

/**
 * POST /api/admin/scheduling/blocked-dates
 * Create a new blocked date
 */
export async function POST(req: Request) {
  const auth = await requireAuth(req)

  if (!auth.tenantId || !auth.userId) {
    return Response.json({ error: 'Tenant and user context required' }, { status: 400 })
  }

  const body = (await req.json()) as Omit<CreateBlockedDateInput, 'userId'>

  if (!body.startDate || !body.endDate) {
    return Response.json(
      { error: 'startDate and endDate are required' },
      { status: 400 }
    )
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(body.startDate) || !dateRegex.test(body.endDate)) {
    return Response.json(
      { error: 'Dates must be in YYYY-MM-DD format' },
      { status: 400 }
    )
  }

  const schedulingUser = await getSchedulingUser(auth.tenantId, auth.userId)

  if (!schedulingUser) {
    return Response.json(
      { error: 'You must create a scheduling profile first' },
      { status: 400 }
    )
  }

  const blockedDate = await createBlockedDate(auth.tenantId, {
    ...body,
    userId: schedulingUser.id,
  })

  return Response.json({ blockedDate }, { status: 201 })
}
