/**
 * Mark Messages as Read API
 *
 * POST /api/support/chat/[sessionId]/read - Mark messages as read by visitor
 *
 * @ai-pattern api-route
 * @ai-note Public endpoint for visitor chat
 */

import { NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk/auth'
import { getChatSession, markMessagesRead } from '@cgk/support'

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

    await markMessagesRead(tenantId, sessionId, body.visitorId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[support/chat/read] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to mark messages as read' },
      { status: 500 }
    )
  }
}
