/**
 * Reports API
 *
 * GET /api/admin/analytics/reports - List all reports
 * POST /api/admin/analytics/reports - Create a new report
 */

import { requireAuth } from '@cgk/auth'

import { createAnalyticsReport, getAnalyticsReports } from '@/lib/analytics'
import type { ReportCreate } from '@/lib/analytics'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  const { tenantId } = await requireAuth(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const reports = await getAnalyticsReports(tenantId)

  return Response.json({ reports })
}

export async function POST(req: Request) {
  const { tenantId, userId } = await requireAuth(req)

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const body = (await req.json()) as ReportCreate

  if (!body.name || !body.type || !body.config) {
    return Response.json({ error: 'Missing required fields: name, type, config' }, { status: 400 })
  }

  const report = await createAnalyticsReport(tenantId, body, userId)

  return Response.json({ report }, { status: 201 })
}
