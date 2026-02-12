/**
 * End Chat Session API
 *
 * POST /api/support/chat/[sessionId]/end - End chat session (visitor initiated)
 *
 * @ai-pattern api-route
 * @ai-note Public endpoint for visitor chat
 */

import { type NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk/auth'
import { endChatSession, getChatSession } from '@cgk/support'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { tenantId } = await getTenantContext(req)

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const { sessionId } = await params
    const body = await req.json() as { visitorId: string }

    if (!body.visitorId) {
      return NextResponse.json(
        { error: 'Visitor ID is required' },
        { status: 400 }
      )
    }

    // Verify session exists and belongs to this visitor
    const session = await getChatSession(tenantId, sessionId)
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    if (session.visitorId !== body.visitorId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    if (session.status === 'ended') {
      return NextResponse.json(
        { error: 'Session is already ended' },
        { status: 400 }
      )
    }

    await endChatSession(tenantId, sessionId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[support/chat/end] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to end session' },
      { status: 500 }
    )
  }
}
