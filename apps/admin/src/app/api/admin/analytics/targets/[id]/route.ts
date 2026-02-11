/**
 * Individual Target API
 *
 * PUT /api/admin/analytics/targets/[id] - Update a target
 * DELETE /api/admin/analytics/targets/[id] - Delete a target
 */

import { requireAuth } from '@cgk/auth'

import { deleteAnalyticsTarget, updateAnalyticsTarget } from '@/lib/analytics'
import type { TargetCreate } from '@/lib/analytics'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenantId } = await requireAuth(req)
  const { id } = await params

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const body = (await req.json()) as Partial<TargetCreate>

  await updateAnalyticsTarget(tenantId, id, body)

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

  await deleteAnalyticsTarget(tenantId, id)

  return Response.json({ success: true })
}
