/**
 * Creator Messages Poll API Route
 *
 * GET /api/creator/messages/[id]/poll - Poll for new messages
 * Returns new messages since last check and typing indicator
 */

import { sql } from '@cgk-platform/db'

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// In-memory typing indicators (would use Redis in production)
const typingIndicators = new Map<string, { isTyping: boolean; lastUpdate: number }>()

/**
 * Poll for new messages in a conversation
 */
export async function GET(
  req: Request,
  { params }: RouteParams
): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  const { id: conversationId } = await params

  // Get lastCheckedAt from query params
  const url = new URL(req.url)
  const lastCheckedAt = url.searchParams.get('since')

  try {
    // Verify conversation belongs to this creator
    const convResult = await sql`
      SELECT id, creator_id FROM creator_conversations
      WHERE id = ${conversationId}
        AND creator_id = ${context.creatorId}
    `

    if (!convResult.rows[0]) {
      return Response.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Build query based on whether we have a lastCheckedAt
    let messagesResult
    if (lastCheckedAt) {
      messagesResult = await sql`
        SELECT
          id, conversation_id, content, sender_type, sender_id, sender_name,
          status, read_at, ai_generated, reply_to_id, attachments, created_at
        FROM creator_messages
        WHERE conversation_id = ${conversationId}
          AND created_at > ${lastCheckedAt}
        ORDER BY created_at ASC
      `
    } else {
      // No lastCheckedAt, return empty (initial load should use the main GET endpoint)
      messagesResult = { rows: [] }
    }

    // Check typing indicator
    const typingKey = `${conversationId}:admin`
    const typingState = typingIndicators.get(typingKey)
    const isTyping = typingState
      ? (Date.now() - typingState.lastUpdate < 5000) && typingState.isTyping
      : false

    // Mark new messages as read
    if (messagesResult.rows.length > 0) {
      await sql`
        UPDATE creator_messages
        SET status = 'read', read_at = NOW()
        WHERE conversation_id = ${conversationId}
          AND sender_type = 'admin'
          AND status != 'read'
      `

      await sql`
        UPDATE creator_conversations
        SET unread_creator = 0
        WHERE id = ${conversationId}
      `
    }

    const messages = messagesResult.rows.map((row) => ({
      id: row.id,
      conversationId: row.conversation_id,
      content: row.content,
      senderType: row.sender_type,
      senderId: row.sender_id,
      senderName: row.sender_name,
      status: row.status,
      readAt: row.read_at,
      aiGenerated: row.ai_generated,
      replyToId: row.reply_to_id,
      attachments: row.attachments || [],
      createdAt: row.created_at,
    }))

    return Response.json({
      messages,
      hasNew: messages.length > 0,
      isTyping,
      lastCheckedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error polling messages:', error)
    return Response.json({ error: 'Failed to poll messages' }, { status: 500 })
  }
}

/**
 * Update typing indicator (called by admin side)
 * This is a placeholder - in production, use Redis pub/sub
 */
export async function POST(
  req: Request,
  { params }: RouteParams
): Promise<Response> {
  // This would be called by the admin side to set typing indicator
  // For now, we'll just acknowledge the request
  const { id: conversationId } = await params

  let body: { isTyping: boolean }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const typingKey = `${conversationId}:admin`
  typingIndicators.set(typingKey, {
    isTyping: body.isTyping,
    lastUpdate: Date.now(),
  })

  return Response.json({ success: true })
}
