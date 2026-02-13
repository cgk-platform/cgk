/**
 * Report History API
 *
 * GET /api/admin/analytics/reports/[id]/history - Get run history for a report
 */

import { requireAuth } from '@cgk-platform/auth'

import { getReportRunHistory } from '@/lib/analytics'

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

  const url = new URL(req.url)
  const limit = parseInt(url.searchParams.get('limit') || '10', 10)

  const history = await getReportRunHistory(tenantId, id, limit)

  return Response.json({ history })
}
