/**
 * Thread by ID API
 * GET /api/admin/inbox/threads/[id] - Get single thread
 * PATCH /api/admin/inbox/threads/[id] - Update thread
 */

import { requireAuth } from '@cgk-platform/auth'
import {
  getThread,
  markThreadAsRead,
  updateThread,
  type UpdateThreadInput,
} from '@cgk-platform/admin-core'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, { params }: RouteParams) {
  const auth = await requireAuth(req)
  const { id } = await params

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  const thread = await getThread(auth.tenantId, id)

  if (!thread) {
    return Response.json({ error: 'Thread not found' }, { status: 404 })
  }

  // Mark as read when viewing
  await markThreadAsRead(auth.tenantId, id)

  return Response.json({ thread })
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const auth = await requireAuth(req)
  const { id } = await params

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  const body = (await req.json()) as UpdateThreadInput

  const thread = await updateThread(auth.tenantId, id, body)

  if (!thread) {
    return Response.json({ error: 'Thread not found' }, { status: 404 })
  }

  return Response.json({ thread })
}
