/**
 * Smart Inbox Thread Service
 * PHASE-2H-WORKFLOWS
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  CreateThreadInput,
  InboxStats,
  Thread,
  ThreadFilters,
  ThreadStatus,
  UpdateThreadInput,
} from './types'

// ============================================================
// Thread CRUD
// ============================================================

/**
 * Get threads with optional filters
 */
export async function getThreads(
  tenantId: string,
  filters?: ThreadFilters
): Promise<{ threads: Thread[]; total: number }> {
  return withTenant(tenantId, async () => {
    const limit = filters?.limit || 50
    const offset = filters?.offset || 0

    // Build query based on filters - using explicit queries for each combination
    // Default: get all threads
    if (!filters?.status && !filters?.priority && !filters?.assignedTo && !filters?.search) {
      const countResult = await sql`
        SELECT COUNT(*) as count
        FROM inbox_threads t
        JOIN inbox_contacts c ON c.id = t.contact_id
      `
      const total = parseInt(String(countResult.rows[0]?.count || '0'), 10)

      const result = await sql`
        SELECT
          t.*,
          c.name as contact_name,
          c.email as contact_email,
          c.phone as contact_phone,
          c.avatar_url as contact_avatar_url,
          c.contact_type,
          u.name as assigned_to_name,
          u.email as assigned_to_email
        FROM inbox_threads t
        JOIN inbox_contacts c ON c.id = t.contact_id
        LEFT JOIN public.users u ON u.id = t.assigned_to
        ORDER BY
          CASE t.status WHEN 'open' THEN 1 WHEN 'snoozed' THEN 2 ELSE 3 END,
          CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
          t.last_message_at DESC NULLS LAST,
          t.updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return { threads: result.rows.map((row) => mapThreadFromDb(row as Record<string, unknown>)), total }
    }

    // Filter by status
    if (filters?.status && !filters?.priority && !filters?.search) {
      const countResult = await sql`
        SELECT COUNT(*) as count
        FROM inbox_threads t
        JOIN inbox_contacts c ON c.id = t.contact_id
        WHERE t.status = ${filters.status}
      `
      const total = parseInt(String(countResult.rows[0]?.count || '0'), 10)

      const result = await sql`
        SELECT
          t.*,
          c.name as contact_name,
          c.email as contact_email,
          c.phone as contact_phone,
          c.avatar_url as contact_avatar_url,
          c.contact_type,
          u.name as assigned_to_name,
          u.email as assigned_to_email
        FROM inbox_threads t
        JOIN inbox_contacts c ON c.id = t.contact_id
        LEFT JOIN public.users u ON u.id = t.assigned_to
        WHERE t.status = ${filters.status}
        ORDER BY
          CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
          t.last_message_at DESC NULLS LAST,
          t.updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return { threads: result.rows.map((row) => mapThreadFromDb(row as Record<string, unknown>)), total }
    }

    // Filter by status and priority
    if (filters?.status && filters?.priority) {
      const countResult = await sql`
        SELECT COUNT(*) as count
        FROM inbox_threads t
        JOIN inbox_contacts c ON c.id = t.contact_id
        WHERE t.status = ${filters.status} AND t.priority = ${filters.priority}
      `
      const total = parseInt(String(countResult.rows[0]?.count || '0'), 10)

      const result = await sql`
        SELECT
          t.*,
          c.name as contact_name,
          c.email as contact_email,
          c.phone as contact_phone,
          c.avatar_url as contact_avatar_url,
          c.contact_type,
          u.name as assigned_to_name,
          u.email as assigned_to_email
        FROM inbox_threads t
        JOIN inbox_contacts c ON c.id = t.contact_id
        LEFT JOIN public.users u ON u.id = t.assigned_to
        WHERE t.status = ${filters.status} AND t.priority = ${filters.priority}
        ORDER BY t.last_message_at DESC NULLS LAST, t.updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return { threads: result.rows.map((row) => mapThreadFromDb(row as Record<string, unknown>)), total }
    }

    // Search only
    if (filters?.search) {
      const searchPattern = `%${filters.search}%`
      const countResult = await sql`
        SELECT COUNT(*) as count
        FROM inbox_threads t
        JOIN inbox_contacts c ON c.id = t.contact_id
        WHERE t.subject ILIKE ${searchPattern}
          OR t.last_message_preview ILIKE ${searchPattern}
          OR c.name ILIKE ${searchPattern}
          OR c.email ILIKE ${searchPattern}
      `
      const total = parseInt(String(countResult.rows[0]?.count || '0'), 10)

      const result = await sql`
        SELECT
          t.*,
          c.name as contact_name,
          c.email as contact_email,
          c.phone as contact_phone,
          c.avatar_url as contact_avatar_url,
          c.contact_type,
          u.name as assigned_to_name,
          u.email as assigned_to_email
        FROM inbox_threads t
        JOIN inbox_contacts c ON c.id = t.contact_id
        LEFT JOIN public.users u ON u.id = t.assigned_to
        WHERE t.subject ILIKE ${searchPattern}
          OR t.last_message_preview ILIKE ${searchPattern}
          OR c.name ILIKE ${searchPattern}
          OR c.email ILIKE ${searchPattern}
        ORDER BY t.last_message_at DESC NULLS LAST, t.updated_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      return { threads: result.rows.map((row) => mapThreadFromDb(row as Record<string, unknown>)), total }
    }

    // Fallback
    const countResult = await sql`SELECT COUNT(*) as count FROM inbox_threads`
    const total = parseInt(String(countResult.rows[0]?.count || '0'), 10)
    const result = await sql`
      SELECT t.*, c.name as contact_name, c.email as contact_email, c.phone as contact_phone,
             c.avatar_url as contact_avatar_url, c.contact_type
      FROM inbox_threads t
      JOIN inbox_contacts c ON c.id = t.contact_id
      ORDER BY t.updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    return { threads: result.rows.map((row) => mapThreadFromDb(row as Record<string, unknown>)), total }
  })
}

/**
 * Get a single thread by ID
 */
export async function getThread(
  tenantId: string,
  threadId: string
): Promise<Thread | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        t.*,
        c.name as contact_name,
        c.email as contact_email,
        c.phone as contact_phone,
        c.avatar_url as contact_avatar_url,
        c.contact_type,
        u.name as assigned_to_name,
        u.email as assigned_to_email,
        r.name as resolved_by_name
      FROM inbox_threads t
      JOIN inbox_contacts c ON c.id = t.contact_id
      LEFT JOIN public.users u ON u.id = t.assigned_to
      LEFT JOIN public.users r ON r.id = t.resolved_by
      WHERE t.id = ${threadId}
    `

    if (result.rows.length === 0) {
      return null
    }

    return mapThreadFromDb(result.rows[0] as Record<string, unknown>)
  })
}

/**
 * Get thread by related entity
 */
export async function getThreadByEntity(
  tenantId: string,
  entityType: string,
  entityId: string
): Promise<Thread | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        t.*,
        c.name as contact_name,
        c.email as contact_email,
        c.phone as contact_phone,
        c.avatar_url as contact_avatar_url,
        c.contact_type,
        u.name as assigned_to_name
      FROM inbox_threads t
      JOIN inbox_contacts c ON c.id = t.contact_id
      LEFT JOIN public.users u ON u.id = t.assigned_to
      WHERE t.related_entity_type = ${entityType}
        AND t.related_entity_id = ${entityId}
      ORDER BY t.created_at DESC
      LIMIT 1
    `

    if (result.rows.length === 0) {
      return null
    }

    return mapThreadFromDb(result.rows[0] as Record<string, unknown>)
  })
}

/**
 * Create a new thread
 */
export async function createThread(
  tenantId: string,
  input: CreateThreadInput
): Promise<Thread> {
  return withTenant(tenantId, async () => {
    const tags = input.tags || []
    const tagsArray = `{${tags.map((t) => `"${t}"`).join(',')}}`

    const result = await sql`
      INSERT INTO inbox_threads (
        contact_id, thread_type, related_entity_type, related_entity_id,
        subject, status, priority, tags
      ) VALUES (
        ${input.contactId},
        ${input.threadType || 'general'},
        ${input.relatedEntityType || null},
        ${input.relatedEntityId || null},
        ${input.subject || null},
        ${input.status || 'open'},
        ${input.priority || 'normal'},
        ${tagsArray}::text[]
      )
      RETURNING *
    `

    // Fetch with contact info
    return getThread(tenantId, result.rows[0]?.id as string) as Promise<Thread>
  })
}

/**
 * Update a thread
 */
export async function updateThread(
  tenantId: string,
  threadId: string,
  input: UpdateThreadInput
): Promise<Thread | null> {
  return withTenant(tenantId, async () => {
    // Fetch current thread first
    const current = await sql`SELECT * FROM inbox_threads WHERE id = ${threadId}`
    if (current.rows.length === 0) {
      return null
    }

    const row = current.rows[0] as Record<string, unknown>
    const threadType = (input.threadType ?? row.thread_type) as string
    const subject = (input.subject !== undefined ? input.subject : row.subject) as string | null
    const priority = (input.priority ?? row.priority) as string
    const tags = input.tags ?? (row.tags as string[] || [])
    const tagsArray = `{${tags.map((t: string) => `"${t}"`).join(',')}}`

    await sql`
      UPDATE inbox_threads
      SET
        thread_type = ${threadType},
        subject = ${subject},
        priority = ${priority},
        tags = ${tagsArray}::text[],
        updated_at = NOW()
      WHERE id = ${threadId}
    `

    return getThread(tenantId, threadId)
  })
}

// ============================================================
// Thread Status Operations
// ============================================================

/**
 * Update thread status
 */
export async function updateThreadStatus(
  tenantId: string,
  threadId: string,
  status: ThreadStatus,
  userId?: string
): Promise<Thread | null> {
  return withTenant(tenantId, async () => {
    if (status === 'closed') {
      await sql`
        UPDATE inbox_threads
        SET
          status = ${status},
          resolved_at = NOW(),
          resolved_by = ${userId || null},
          snoozed_until = NULL,
          updated_at = NOW()
        WHERE id = ${threadId}
      `
    } else {
      await sql`
        UPDATE inbox_threads
        SET
          status = ${status},
          snoozed_until = NULL,
          updated_at = NOW()
        WHERE id = ${threadId}
      `
    }

    return getThread(tenantId, threadId)
  })
}

/**
 * Assign thread to user
 */
export async function assignThread(
  tenantId: string,
  threadId: string,
  userId: string | null,
  _previousAssignee?: string
): Promise<Thread | null> {
  return withTenant(tenantId, async () => {
    if (userId) {
      await sql`
        UPDATE inbox_threads
        SET assigned_to = ${userId}, assigned_at = NOW(), updated_at = NOW()
        WHERE id = ${threadId}
      `
    } else {
      await sql`
        UPDATE inbox_threads
        SET assigned_to = NULL, assigned_at = NULL, updated_at = NOW()
        WHERE id = ${threadId}
      `
    }

    return getThread(tenantId, threadId)
  })
}

/**
 * Snooze thread until a specified date
 */
export async function snoozeThread(
  tenantId: string,
  threadId: string,
  until: Date
): Promise<Thread | null> {
  return withTenant(tenantId, async () => {
    await sql`
      UPDATE inbox_threads
      SET
        status = 'snoozed',
        snoozed_until = ${until.toISOString()},
        updated_at = NOW()
      WHERE id = ${threadId}
    `

    return getThread(tenantId, threadId)
  })
}

/**
 * Unsnooze threads that are past their snooze date
 */
export async function unsnoozeThreads(tenantId: string): Promise<number> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      UPDATE inbox_threads
      SET
        status = 'open',
        snoozed_until = NULL,
        updated_at = NOW()
      WHERE status = 'snoozed'
        AND snoozed_until <= NOW()
      RETURNING id
    `

    return result.rows.length
  })
}

/**
 * Mark thread as read (reset unread count)
 */
export async function markThreadAsRead(
  tenantId: string,
  threadId: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE inbox_threads
      SET unread_count = 0, updated_at = NOW()
      WHERE id = ${threadId}
    `

    // Also mark all messages as read
    await sql`
      UPDATE inbox_messages
      SET read_at = NOW()
      WHERE thread_id = ${threadId}
        AND read_at IS NULL
        AND direction = 'inbound'
    `
  })
}

/**
 * Close thread with resolution notes
 */
export async function closeThread(
  tenantId: string,
  threadId: string,
  userId: string,
  resolutionNotes?: string
): Promise<Thread | null> {
  return withTenant(tenantId, async () => {
    await sql`
      UPDATE inbox_threads
      SET
        status = 'closed',
        resolved_at = NOW(),
        resolved_by = ${userId},
        resolution_notes = ${resolutionNotes || null},
        snoozed_until = NULL,
        updated_at = NOW()
      WHERE id = ${threadId}
    `

    return getThread(tenantId, threadId)
  })
}

// ============================================================
// Inbox Stats
// ============================================================

/**
 * Get inbox statistics
 */
export async function getInboxStats(
  tenantId: string,
  assignedTo?: string
): Promise<InboxStats> {
  return withTenant(tenantId, async () => {
    // Get thread counts by status
    let statusResult
    if (assignedTo) {
      statusResult = await sql`
        SELECT status, COUNT(*) as count
        FROM inbox_threads
        WHERE assigned_to = ${assignedTo}
        GROUP BY status
      `
    } else {
      statusResult = await sql`
        SELECT status, COUNT(*) as count
        FROM inbox_threads
        GROUP BY status
      `
    }

    const counts: Record<string, number> = {}
    let total = 0
    for (const row of statusResult.rows) {
      const count = parseInt(String(row.count), 10)
      counts[row.status as string] = count
      total += count
    }

    // Get total unread
    let unreadResult
    if (assignedTo) {
      unreadResult = await sql`
        SELECT COALESCE(SUM(unread_count), 0) as total
        FROM inbox_threads
        WHERE assigned_to = ${assignedTo}
      `
    } else {
      unreadResult = await sql`
        SELECT COALESCE(SUM(unread_count), 0) as total
        FROM inbox_threads
      `
    }
    const unreadCount = parseInt(String(unreadResult.rows[0]?.total || '0'), 10)

    return {
      totalThreads: total,
      openThreads: counts.open || 0,
      snoozedThreads: counts.snoozed || 0,
      closedThreads: counts.closed || 0,
      unreadCount,
      avgResponseTimeHours: null, // Simplified - would need lateral join
    }
  })
}

// ============================================================
// Mappers
// ============================================================

function mapThreadFromDb(row: Record<string, unknown>): Thread {
  return {
    id: row.id as string,
    contact: {
      id: row.contact_id as string,
      name: (row.contact_name as string) || '',
      email: row.contact_email as string | null,
      phone: row.contact_phone as string | null,
      avatarUrl: row.contact_avatar_url as string | null,
      contactType: (row.contact_type as Thread['contact']['contactType']) || 'other',
    },
    threadType: (row.thread_type as Thread['threadType']) || 'general',
    relatedEntity: row.related_entity_type
      ? {
          type: row.related_entity_type as string,
          id: row.related_entity_id as string,
        }
      : null,
    subject: row.subject as string | null,
    status: (row.status as Thread['status']) || 'open',
    snoozedUntil: row.snoozed_until ? new Date(row.snoozed_until as string) : null,
    priority: (row.priority as Thread['priority']) || 'normal',
    assignedTo: row.assigned_to
      ? {
          id: row.assigned_to as string,
          name: (row.assigned_to_name as string) || '',
          avatarUrl: null,
        }
      : null,
    assignedAt: row.assigned_at ? new Date(row.assigned_at as string) : null,
    lastMessageAt: row.last_message_at ? new Date(row.last_message_at as string) : null,
    lastMessageSender: row.last_message_sender as Thread['lastMessageSender'],
    lastMessagePreview: row.last_message_preview as string | null,
    unreadCount: (row.unread_count as number) || 0,
    tags: (row.tags as string[]) || [],
    resolvedAt: row.resolved_at ? new Date(row.resolved_at as string) : null,
    resolvedBy: row.resolved_by
      ? { id: row.resolved_by as string, name: (row.resolved_by_name as string) || '' }
      : null,
    resolutionNotes: row.resolution_notes as string | null,
    externalThreadId: row.external_thread_id as string | null,
    externalThreadType: row.external_thread_type as string | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}
