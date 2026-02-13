/**
 * Messaging database operations with tenant isolation
 */

import { sql, withTenant } from '@cgk-platform/db'

import type { Thread, Message, ThreadFilters, MessageChannel } from './types'

export async function getThreads(
  tenantSlug: string,
  filters: ThreadFilters,
): Promise<{ rows: Thread[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.status) {
      paramIndex++
      conditions.push(`t.status = $${paramIndex}::thread_status`)
      values.push(filters.status)
    }

    if (filters.search) {
      paramIndex++
      conditions.push(
        `(t.subject ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex} OR c.first_name ILIKE $${paramIndex})`,
      )
      values.push(`%${filters.search}%`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, filters.offset)

    const dataResult = await sql.query(
      `SELECT
        t.id, t.creator_id, t.subject, t.status,
        t.last_message_at, t.created_at, t.updated_at,
        c.first_name || ' ' || c.last_name as creator_name,
        c.email as creator_email,
        c.avatar_url as creator_avatar_url,
        COALESCE(u.unread_count, 0)::int as unread_count,
        m.content as last_message_preview
      FROM creator_threads t
      JOIN creators c ON c.id = t.creator_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int as unread_count
        FROM creator_messages
        WHERE thread_id = t.id AND direction = 'inbound' AND read_at IS NULL
      ) u ON true
      LEFT JOIN LATERAL (
        SELECT content
        FROM creator_messages
        WHERE thread_id = t.id
        ORDER BY created_at DESC
        LIMIT 1
      ) m ON true
      ${whereClause}
      ORDER BY t.last_message_at DESC NULLS LAST
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count
       FROM creator_threads t
       JOIN creators c ON c.id = t.creator_id
       ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as Thread[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

export async function getThread(
  tenantSlug: string,
  threadId: string,
): Promise<Thread | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        t.id, t.creator_id, t.subject, t.status,
        t.last_message_at, t.created_at, t.updated_at,
        c.first_name || ' ' || c.last_name as creator_name,
        c.email as creator_email,
        c.avatar_url as creator_avatar_url,
        COALESCE(u.unread_count, 0)::int as unread_count,
        m.content as last_message_preview
      FROM creator_threads t
      JOIN creators c ON c.id = t.creator_id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int as unread_count
        FROM creator_messages
        WHERE thread_id = t.id AND direction = 'inbound' AND read_at IS NULL
      ) u ON true
      LEFT JOIN LATERAL (
        SELECT content
        FROM creator_messages
        WHERE thread_id = t.id
        ORDER BY created_at DESC
        LIMIT 1
      ) m ON true
      WHERE t.id = ${threadId}
      LIMIT 1
    `
    return (result.rows[0] as Thread) || null
  })
}

export async function getMessages(
  tenantSlug: string,
  threadId: string,
): Promise<Message[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, thread_id, direction, channel, sender_name, sender_id,
        content, delivered_at, read_at, created_at
      FROM creator_messages
      WHERE thread_id = ${threadId}
      ORDER BY created_at ASC
    `
    return result.rows as Message[]
  })
}

export async function sendMessage(
  tenantSlug: string,
  threadId: string,
  senderName: string,
  senderId: string,
  content: string,
  channel: MessageChannel,
): Promise<Message | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO creator_messages (
        thread_id, direction, channel, sender_name, sender_id, content, delivered_at
      ) VALUES (
        ${threadId}, 'outbound', ${channel}::message_channel, ${senderName}, ${senderId},
        ${content}, NOW()
      )
      RETURNING id, thread_id, direction, channel, sender_name, sender_id, content, delivered_at, read_at, created_at
    `

    await sql`
      UPDATE creator_threads
      SET last_message_at = NOW(), status = 'pending', updated_at = NOW()
      WHERE id = ${threadId}
    `

    return (result.rows[0] as Message) || null
  })
}

export async function markThreadRead(
  tenantSlug: string,
  threadId: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    await sql`
      UPDATE creator_messages
      SET read_at = NOW()
      WHERE thread_id = ${threadId} AND direction = 'inbound' AND read_at IS NULL
    `
    return true
  })
}

export async function updateThreadStatus(
  tenantSlug: string,
  threadId: string,
  status: 'open' | 'pending' | 'closed',
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE creator_threads
      SET status = ${status}::thread_status, updated_at = NOW()
      WHERE id = ${threadId}
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}
