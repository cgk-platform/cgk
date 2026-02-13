/**
 * Individual Slack Alert API
 *
 * PUT /api/admin/analytics/slack-alerts/[id] - Update a slack alert
 * DELETE /api/admin/analytics/slack-alerts/[id] - Delete a slack alert
 */

import { requireAuth } from '@cgk-platform/auth'

import { deleteSlackAlert, updateSlackAlert } from '@/lib/analytics'
import type { SlackAlertUpdate } from '@/lib/analytics'

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

  const body = (await req.json()) as SlackAlertUpdate

  await updateSlackAlert(tenantId, id, body)

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

  await deleteSlackAlert(tenantId, id)

  return Response.json({ success: true })
}
