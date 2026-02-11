/**
 * Snooze Thread API
 * POST /api/admin/inbox/threads/[id]/snooze - Snooze thread
 */

import { requireAuth } from '@cgk/auth'
import { snoozeThread } from '@cgk/admin-core'

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

  const body = (await req.json()) as { until: string }

  if (!body.until) {
    return Response.json(
      { error: 'until date is required' },
      { status: 400 }
    )
  }

  const until = new Date(body.until)
  if (isNaN(until.getTime())) {
    return Response.json(
      { error: 'Invalid date format' },
      { status: 400 }
    )
  }

  const thread = await snoozeThread(auth.tenantId, id, until)

  if (!thread) {
    return Response.json({ error: 'Thread not found' }, { status: 404 })
  }

  return Response.json({ thread })
}
