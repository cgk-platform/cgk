/**
 * AI Copilot Draft API
 * POST /api/admin/inbox/copilot/draft - Generate AI draft
 */

import { requireAuth } from '@cgk/auth'
import { generateDraft } from '@cgk/admin-core'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const auth = await requireAuth(req)

  if (!auth.tenantId) {
    return Response.json({ error: 'Tenant required' }, { status: 400 })
  }

  const body = (await req.json()) as { threadId: string }

  if (!body.threadId) {
    return Response.json(
      { error: 'threadId is required' },
      { status: 400 }
    )
  }

  try {
    const draft = await generateDraft(auth.tenantId, body.threadId)

    return Response.json({ draft }, { status: 201 })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to generate draft' },
      { status: 400 }
    )
  }
}
