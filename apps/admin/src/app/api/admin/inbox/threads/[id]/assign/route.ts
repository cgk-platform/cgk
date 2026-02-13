/**
 * Assign Thread API
 * POST /api/admin/inbox/threads/[id]/assign - Assign thread to user
 */

import { requireAuth } from '@cgk-platform/auth'
import { assignThread, getThread } from '@cgk-platform/admin-core'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, { params }: RouteParams) {
  const auth = await requireAuth(req)
  const { id } = await params

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  const body = (await req.json()) as { userId: string | null }

  // Get current thread to track previous assignee
  const currentThread = await getThread(auth.tenantId, id)
  if (!currentThread) {
    return Response.json({ error: 'Thread not found' }, { status: 404 })
  }

  const thread = await assignThread(
    auth.tenantId,
    id,
    body.userId,
    currentThread.assignedTo?.id
  )

  return Response.json({ thread })
}
