/**
 * Public Chat Session Detail API
 *
 * GET /api/support/chat/[sessionId] - Get session and messages
 * POST /api/support/chat/[sessionId] - Send message as visitor
 *
 * @ai-pattern api-route
 * @ai-note Public endpoint for visitor chat
 */

import { type NextRequest, NextResponse } from 'next/server'

import { getTenantContext } from '@cgk-platform/auth'
import {
  getChatSession,
  getMessages,
  sendMessage,
  type SendMessageInput,
} from '@cgk-platform/support'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
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

    const [session, messages] = await Promise.all([
      getChatSession(tenantId, sessionId),
      getMessages(tenantId, sessionId),
    ])

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      session,
      messages,
    })
  } catch (error) {
    console.error('[support/chat/session] GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch session' },
      { status: 500 }
    )
  }
}

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
    const body = await req.json() as {
      visitorId: string
      content: string
      attachments?: string[]
    }

    if (!body.visitorId) {
      return NextResponse.json(
        { error: 'Visitor ID is required' },
        { status: 400 }
      )
    }

    if (!body.content?.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
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
        { error: 'Cannot send message to ended session' },
        { status: 400 }
      )
    }

    const messageInput: SendMessageInput = {
      senderId: body.visitorId,
      senderType: 'visitor',
      content: body.content.trim(),
      attachments: body.attachments,
    }

    const message = await sendMessage(tenantId, sessionId, messageInput)

    return NextResponse.json({ message })
  } catch (error) {
    console.error('[support/chat/session] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send message' },
      { status: 500 }
    )
  }
}
