/**
 * Creator Messages API Route
 *
 * GET /api/creator/messages - List conversations with unread counts
 */

import { sql } from '@cgk/db'

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * List all conversations for the current creator
 */
export async function GET(req: Request): Promise<Response> {
  let context: CreatorAuthContext

  try {
    context = await requireCreatorAuth(req)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication required'
    return Response.json({ error: message }, { status: 401 })
  }

  try {
    // Get all conversations with brand info
    const result = await sql`
      SELECT
        c.*,
        o.name as brand_name
      FROM creator_conversations c
      LEFT JOIN organizations o ON o.id = c.brand_id
      WHERE c.creator_id = ${context.creatorId}
        AND c.status != 'archived'
      ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
    `

    // Get total unread count
    const unreadResult = await sql`
      SELECT COALESCE(SUM(unread_creator), 0) as total_unread
      FROM creator_conversations
      WHERE creator_id = ${context.creatorId}
        AND status != 'archived'
    `

    const totalUnread = parseInt(unreadResult.rows[0]?.total_unread as string || '0', 10)

    const conversations = result.rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      brandId: row.brand_id,
      brandName: row.brand_name,
      coordinatorName: row.coordinator_name,
      subject: row.subject,
      status: row.status,
      lastMessageAt: row.last_message_at,
      lastMessagePreview: row.last_message_preview,
      lastMessageSender: row.last_message_sender,
      unreadCount: parseInt(row.unread_creator as string || '0', 10),
      createdAt: row.created_at,
    }))

    return Response.json({
      conversations,
      totalUnread,
    })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return Response.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}
