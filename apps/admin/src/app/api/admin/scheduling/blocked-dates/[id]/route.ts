import { requireAuth } from '@cgk/auth'
import { deleteBlockedDate } from '@cgk/scheduling'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * DELETE /api/admin/scheduling/blocked-dates/[id]
 * Delete a blocked date
 */
export async function DELETE(req: Request, { params }: RouteParams) {
  const { id } = await params
  const auth = await requireAuth(req)

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const deleted = await deleteBlockedDate(auth.tenantId, id, auth.userId)

  if (!deleted) {
    return Response.json({ error: 'Blocked date not found' }, { status: 404 })
  }

  return Response.json({ success: true })
}
