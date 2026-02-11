/**
 * Close Thread API
 * POST /api/admin/inbox/threads/[id]/close - Close thread
 */

import { requireAuth } from '@cgk/auth'
import { closeThread } from '@cgk/admin-core'

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

  const body = (await req.json()) as { resolutionNotes?: string }

  const thread = await closeThread(
    auth.tenantId,
    id,
    auth.userId,
    body.resolutionNotes
  )

  if (!thread) {
    return Response.json({ error: 'Thread not found' }, { status: 404 })
  }

  return Response.json({ thread })
}
