/**
 * Individual Report API
 *
 * GET /api/admin/analytics/reports/[id] - Get report by ID
 * PUT /api/admin/analytics/reports/[id] - Update report
 * DELETE /api/admin/analytics/reports/[id] - Delete report
 */

import { requireAuth } from '@cgk/auth'

import { deleteAnalyticsReport, getAnalyticsReportById, updateAnalyticsReport } from '@/lib/analytics'
import type { ReportUpdate } from '@/lib/analytics'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = await requireAuth(req)
  const { id } = await params

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const report = await getAnalyticsReportById(tenantId, id)

  if (!report) {
    return Response.json({ error: 'Report not found' }, { status: 404 })
  }

  return Response.json({ report })
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = await requireAuth(req)
  const { id } = await params

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const body = (await req.json()) as ReportUpdate

  await updateAnalyticsReport(tenantId, id, body)

  return Response.json({ success: true })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = await requireAuth(req)
  const { id } = await params

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  await deleteAnalyticsReport(tenantId, id)

  return Response.json({ success: true })
}
