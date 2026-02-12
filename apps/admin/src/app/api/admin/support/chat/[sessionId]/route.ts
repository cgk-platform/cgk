/**
 * Chat Session Detail API
 *
 * GET /api/admin/support/chat/[sessionId] - Get session with messages
 * POST /api/admin/support/chat/[sessionId] - Send message as agent
 * DELETE /api/admin/support/chat/[sessionId] - End session
 *
 * @ai-pattern api-route
 * @ai-required Uses getTenantContext for tenant isolation
 */

import { type NextRequest, NextResponse } from 'next/server'

import { getTenantContext, requireAuth } from '@cgk/auth'
import {
  endChatSession,
  getChatSession,
  getMessages,
  markMessagesRead,
  sendMessage,
  type SendMessageInput,
} from '@cgk/support'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
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

    // Mark messages as read by the agent viewing
    if (userId) {
      await markMessagesRead(tenantId, sessionId, userId)
    }

    return NextResponse.json({
      session,
      messages,
    })
  } catch (error) {
    console.error('[chat/session] GET error:', error)
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
    const auth = await requireAuth(req)
    const tenantId = auth.tenantId

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 400 }
      )
    }

    const { sessionId } = await params
    const body = await req.json() as { content: string; attachments?: string[] }

    if (!body.content?.trim()) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    // Verify session exists and is active
    const session = await getChatSession(tenantId, sessionId)
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    if (session.status === 'ended') {
      return NextResponse.json(
        { error: 'Cannot send message to ended session' },
        { status: 400 }
      )
    }

    const messageInput: SendMessageInput = {
      senderId: auth.userId,
      senderType: 'agent',
      content: body.content.trim(),
      attachments: body.attachments,
    }

    const message = await sendMessage(tenantId, sessionId, messageInput)

    return NextResponse.json({ message })
  } catch (error) {
    console.error('[chat/session] POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send message' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
        { error: 'Session is already ended' },
        { status: 400 }
      )
    }

    await endChatSession(tenantId, sessionId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[chat/session] DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to end session' },
      { status: 500 }
    )
  }
}
