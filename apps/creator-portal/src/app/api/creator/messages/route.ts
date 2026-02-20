/**
 * Creator Messages API Route
 *
 * GET /api/creator/messages - List conversations with unread counts
 *
 * Supports brand context filtering via cookie:
 * - If brand is selected: returns conversations for that brand only
 * - If no brand selected ("All Brands"): returns all conversations
 */

import { sql } from '@cgk-platform/db'

import { requireCreatorAuth, type CreatorAuthContext } from '@/lib/auth'
import { getBrandFilter } from '@/lib/brand-filter'

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
    // Get brand filter from cookie
    const { brandId } = getBrandFilter(req, context)

    // Get conversations with brand info - filter by brand if selected
    let result
    if (brandId) {
      result = await sql`
        SELECT
          c.*,
          o.name as brand_name
        FROM creator_conversations c
        LEFT JOIN public.organizations o ON o.id = c.brand_id
        WHERE c.creator_id = ${context.creatorId}
          AND c.brand_id = ${brandId}
          AND c.status != 'archived'
        ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
      `
    } else {
      result = await sql`
        SELECT
          c.*,
          o.name as brand_name
        FROM creator_conversations c
        LEFT JOIN public.organizations o ON o.id = c.brand_id
        WHERE c.creator_id = ${context.creatorId}
          AND c.status != 'archived'
        ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
      `
    }

    // Get total unread count - filter by brand if selected
    let totalUnread = 0
    if (brandId) {
      const unreadResult = await sql`
        SELECT COALESCE(SUM(unread_creator), 0) as total_unread
        FROM creator_conversations
        WHERE creator_id = ${context.creatorId}
          AND brand_id = ${brandId}
          AND status != 'archived'
      `
      totalUnread = parseInt(unreadResult.rows[0]?.total_unread as string || '0', 10)
    } else {
      const unreadResult = await sql`
        SELECT COALESCE(SUM(unread_creator), 0) as total_unread
        FROM creator_conversations
        WHERE creator_id = ${context.creatorId}
          AND status != 'archived'
      `
      totalUnread = parseInt(unreadResult.rows[0]?.total_unread as string || '0', 10)
    }

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
      filter: {
        brandId: brandId || null,
        isFiltered: !!brandId,
      },
    })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return Response.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}
