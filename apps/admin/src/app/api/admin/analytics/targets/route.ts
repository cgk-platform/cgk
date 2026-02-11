/**
 * Analytics Targets API
 *
 * GET /api/admin/analytics/targets - List all targets
 * POST /api/admin/analytics/targets - Create a new target
 */

import { requireAuth } from '@cgk/auth'

import { createAnalyticsTarget, getAnalyticsTargets } from '@/lib/analytics'
import type { TargetCreate } from '@/lib/analytics'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const { tenantId } = await requireAuth(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const targets = await getAnalyticsTargets(tenantId)

  return Response.json({ targets })
}

export async function POST(req: Request) {
  const { tenantId } = await requireAuth(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const body = (await req.json()) as TargetCreate

  if (!body.metric || body.targetValue === undefined || !body.period || !body.periodStart) {
    return Response.json(
      { error: 'Missing required fields: metric, targetValue, period, periodStart' },
      { status: 400 }
    )
  }

  const target = await createAnalyticsTarget(tenantId, body)

  return Response.json({ target }, { status: 201 })
}
