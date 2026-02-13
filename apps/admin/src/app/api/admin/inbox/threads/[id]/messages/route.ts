/**
 * Thread Messages API
 * GET /api/admin/inbox/threads/[id]/messages - Get messages
 * POST /api/admin/inbox/threads/[id]/messages - Send message
 */

import { requireAuth } from '@cgk-platform/auth'
import { getMessages, sendMessage, type SendMessageInput } from '@cgk-platform/admin-core'

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

  const url = new URL(req.url)
  const limit = parseInt(url.searchParams.get('limit') || '100', 10)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)

  const { messages, total } = await getMessages(auth.tenantId, id, {
    limit,
    offset,
  })

  return Response.json({
    messages,
    total,
    limit,
    offset,
  })
}

export async function POST(req: Request, { params }: RouteParams) {
  const auth = await requireAuth(req)
  const { id } = await params

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  const body = (await req.json()) as SendMessageInput

  if (!body.channel || !body.body) {
    return Response.json(
      { error: 'channel and body are required' },
      { status: 400 }
    )
  }

  const message = await sendMessage(auth.tenantId, id, body, auth.userId)

  return Response.json({ message }, { status: 201 })
}
