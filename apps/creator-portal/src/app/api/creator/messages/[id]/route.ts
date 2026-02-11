/**
 * Creator Conversation Messages API Route
 *
 * GET /api/creator/messages/[id] - Get messages for a conversation
 * POST /api/creator/messages/[id] - Send a message
 */

import { sql } from '@cgk/db'

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * Get messages for a conversation
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

  try {
    // Verify conversation belongs to this creator
    const convResult = await sql`
      SELECT id, creator_id, subject, coordinator_name, brand_id
      FROM creator_conversations
      WHERE id = ${conversationId}
        AND creator_id = ${context.creatorId}
    `

    const conversation = convResult.rows[0]
    if (!conversation) {
      return Response.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Get messages
    const messagesResult = await sql`
      SELECT
        id, conversation_id, content, sender_type, sender_id, sender_name,
        status, read_at, ai_generated, reply_to_id, attachments, created_at
      FROM creator_messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at ASC
    `

    // Mark messages as read
    await sql`
      UPDATE creator_messages
      SET status = 'read', read_at = NOW()
      WHERE conversation_id = ${conversationId}
        AND sender_type = 'admin'
        AND status != 'read'
    `

    // Reset unread count for creator
    await sql`
      UPDATE creator_conversations
      SET unread_creator = 0
      WHERE id = ${conversationId}
    `

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
      conversation: {
        id: conversation.id,
        subject: conversation.subject,
        coordinatorName: conversation.coordinator_name,
        brandId: conversation.brand_id,
      },
      messages,
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return Response.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

/**
 * Send a message in a conversation
 */
export async function POST(
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

  let body: { content: string; attachments?: Array<{ url: string; name: string; type: string; size: number }> }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { content, attachments = [] } = body

  if (!content || content.trim().length === 0) {
    return Response.json(
      { error: 'Message content is required' },
      { status: 400 }
    )
  }

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

    // Create the message
    const messageResult = await sql`
      INSERT INTO creator_messages (
        conversation_id, content, sender_type, sender_id, sender_name, attachments
      )
      VALUES (
        ${conversationId},
        ${content.trim()},
        'creator',
        ${context.creatorId},
        ${context.name},
        ${JSON.stringify(attachments)}::jsonb
      )
      RETURNING *
    `

    const message = messageResult.rows[0]

    return Response.json({
      success: true,
      message: {
        id: message?.id,
        conversationId: message?.conversation_id,
        content: message?.content,
        senderType: message?.sender_type,
        senderName: message?.sender_name,
        createdAt: message?.created_at,
      },
    })
  } catch (error) {
    console.error('Error sending message:', error)
    return Response.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
