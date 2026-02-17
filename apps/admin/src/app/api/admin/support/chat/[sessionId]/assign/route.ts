/**
 * Chat Session Assignment API
 *
 * POST /api/admin/support/chat/[sessionId]/assign - Assign agent to session
 *
 * @ai-pattern api-route
 * @ai-required Uses getTenantContext for tenant isolation
 */

import { type NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk-platform/auth'
import {
  assignChatSession,
  getChatSession,
  transferChatSession,
} from '@cgk-platform/support'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { tenantId, userId } = await getTenantContext(req)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { sessionId } = await params

    // Use authenticated user as the agent - agentId from body is optional (for transfers)
    const body = await req.json().catch(() => ({})) as { agentId?: string }
    const agentId = body.agentId || userId

    // Verify session exists
    const session = await getChatSession(tenantId, sessionId)
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    if (session.status === 'ended') {
      return NextResponse.json(
        { error: 'Cannot assign agent to ended session' },
        { status: 400 }
      )
    }

    // If already assigned, this is a transfer
    if (session.assignedAgentId) {
      await transferChatSession(tenantId, sessionId, body.agentId)
    } else {
      await assignChatSession(tenantId, sessionId, body.agentId)
    }

    // Get updated session
    const updatedSession = await getChatSession(tenantId, sessionId)

    return NextResponse.json({ session: updatedSession })
  } catch (error) {
    console.error('[chat/assign] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign agent' },
      { status: 500 }
    )
  }
}
