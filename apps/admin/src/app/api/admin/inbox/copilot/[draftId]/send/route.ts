/**
 * Send AI Draft API
 * POST /api/admin/inbox/copilot/[draftId]/send - Send AI draft
 */

import { requireAuth } from '@cgk-platform/auth'
import { sendDraft } from '@cgk-platform/admin-core'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ draftId: string }>
}

export async function POST(req: Request, { params }: RouteParams) {
  const auth = await requireAuth(req)
  const { draftId } = await params

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  const body = (await req.json()) as { editedContent?: string }

  try {
    const message = await sendDraft(
      auth.tenantId,
      draftId,
      auth.userId,
      body.editedContent
    )

    return Response.json({ message })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to send draft' },
      { status: 400 }
    )
  }
}
