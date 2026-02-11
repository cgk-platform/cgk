/**
 * Creator Reply Handler
 *
 * Handles inbound emails from creators, matching them to existing
 * creator threads and updating conversation history.
 *
 * @ai-pattern inbound-email
 * @ai-note Uses tenant-isolated database operations
 */

import { sql } from '@cgk/db'

import type {
  InboundEmail,
  ThreadMessage,
} from './types.js'
import {
  addInboundToThread,
  createThread,
  findCreatorByEmail,
  findOpenThreadForContact,
} from './thread-matcher.js'

// ============================================================================
// Creator-Specific Thread Matching
// ============================================================================

/**
 * Creator thread info
 */
export interface CreatorThreadInfo {
  creatorId: string
  creatorName: string
  creatorEmail: string
  threadId: string
  isNewThread: boolean
}

/**
 * Find or create thread for creator reply
 *
 * @param email - Inbound email from creator
 * @returns Thread info with creator details
 */
export async function findOrCreateCreatorThread(
  email: InboundEmail
): Promise<CreatorThreadInfo | null> {
  // First, verify sender is a known creator
  const creator = await findCreatorByEmail(email.from)

  if (!creator) {
    // Not a recognized creator email
    return null
  }

  // Try to find existing open thread for this creator
  const existingThread = await findOpenThreadForContact(creator.id, 'creator')

  if (existingThread) {
    return {
      creatorId: creator.id,
      creatorName: creator.name || 'Unknown Creator',
      creatorEmail: creator.email,
      threadId: existingThread.id,
      isNewThread: false,
    }
  }

  // Create new thread for creator
  const newThread = await createThread({
    contactType: 'creator',
    contactId: creator.id,
    contactEmail: creator.email,
    contactName: creator.name,
    subject: email.subject,
    status: 'open',
  })

  return {
    creatorId: creator.id,
    creatorName: creator.name || 'Unknown Creator',
    creatorEmail: creator.email,
    threadId: newThread.id,
    isNewThread: true,
  }
}

/**
 * Handle creator reply email
 *
 * Processes an inbound email from a creator, adding it to the
 * appropriate thread and updating creator activity.
 *
 * @param email - Inbound email to process
 * @param inboundEmailId - ID of the logged inbound email
 * @returns Thread info and message, or null if not from a creator
 */
export async function handleCreatorReply(
  email: InboundEmail,
  inboundEmailId: string
): Promise<{
  thread: CreatorThreadInfo
  message: ThreadMessage
} | null> {
  // Find or create thread for this creator
  const threadInfo = await findOrCreateCreatorThread(email)

  if (!threadInfo) {
    // Not from a recognized creator
    return null
  }

  // Add message to thread
  const message = await addInboundToThread(email, threadInfo.threadId, inboundEmailId)

  // Update creator's last activity
  await updateCreatorLastActivity(threadInfo.creatorId)

  return {
    thread: threadInfo,
    message,
  }
}

/**
 * Update creator's last activity timestamp
 */
async function updateCreatorLastActivity(creatorId: string): Promise<void> {
  try {
    await sql`
      UPDATE creators
      SET
        last_activity_at = NOW(),
        updated_at = NOW()
      WHERE id = ${creatorId}
    `
  } catch (error) {
    // Log but don't fail - creator table might not have last_activity_at column
    console.warn(`Failed to update creator last activity: ${error}`)
  }
}

// ============================================================================
// Creator Message History
// ============================================================================

/**
 * Get all threads for a creator
 */
export async function getCreatorThreads(
  creatorId: string
): Promise<{
  id: string
  subject: string | null
  status: string
  messageCount: number
  lastMessageAt: Date | null
}[]> {
  const result = await sql`
    SELECT
      id, subject, status, message_count, last_message_at
    FROM email_threads
    WHERE contact_type = 'creator'
    AND contact_id = ${creatorId}
    ORDER BY last_message_at DESC NULLS LAST
  `

  return result.rows.map((row) => ({
    id: row.id as string,
    subject: row.subject as string | null,
    status: row.status as string,
    messageCount: row.message_count as number,
    lastMessageAt: row.last_message_at ? new Date(row.last_message_at as string) : null,
  }))
}

/**
 * Get messages in a creator thread
 */
export async function getThreadMessages(
  threadId: string,
  limit = 50,
  offset = 0
): Promise<{
  messages: ThreadMessage[]
  total: number
}> {
  const [messagesResult, countResult] = await Promise.all([
    sql`
      SELECT *
      FROM thread_messages
      WHERE thread_id = ${threadId}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `,
    sql`
      SELECT COUNT(*) as total
      FROM thread_messages
      WHERE thread_id = ${threadId}
    `,
  ])

  const messages = messagesResult.rows.map((row) => ({
    id: row.id as string,
    threadId: row.thread_id as string,
    direction: row.direction as 'inbound' | 'outbound',
    fromAddress: row.from_address as string,
    toAddress: row.to_address as string | null,
    subject: row.subject as string | null,
    bodyText: row.body_text as string | null,
    bodyHtml: row.body_html as string | null,
    attachments: (row.attachments || []) as ThreadMessage['attachments'],
    messageId: row.message_id as string | null,
    inReplyTo: row.in_reply_to as string | null,
    inboundEmailId: row.inbound_email_id as string | null,
    queueEntryId: row.queue_entry_id as string | null,
    queueType: row.queue_type as string | null,
    status: row.status as ThreadMessage['status'],
    createdAt: new Date(row.created_at as string),
  }))

  const total = parseInt(countResult.rows[0]?.total as string, 10) || 0

  return { messages, total }
}

// ============================================================================
// Creator Activity Summary
// ============================================================================

/**
 * Creator communication summary
 */
export interface CreatorCommsSummary {
  creatorId: string
  totalThreads: number
  openThreads: number
  totalMessages: number
  inboundMessages: number
  outboundMessages: number
  lastInboundAt: Date | null
  lastOutboundAt: Date | null
}

/**
 * Get communication summary for a creator
 */
export async function getCreatorCommsSummary(
  creatorId: string
): Promise<CreatorCommsSummary> {
  const result = await sql`
    SELECT
      COUNT(DISTINCT t.id) as total_threads,
      COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'open') as open_threads,
      SUM(t.message_count) as total_messages,
      MAX(t.last_inbound_at) as last_inbound_at,
      MAX(t.last_outbound_at) as last_outbound_at
    FROM email_threads t
    WHERE t.contact_type = 'creator'
    AND t.contact_id = ${creatorId}
  `

  // Get inbound/outbound counts separately
  const messageCountsResult = await sql`
    SELECT
      direction,
      COUNT(*) as count
    FROM thread_messages m
    JOIN email_threads t ON t.id = m.thread_id
    WHERE t.contact_type = 'creator'
    AND t.contact_id = ${creatorId}
    GROUP BY direction
  `

  const messageCounts = messageCountsResult.rows.reduce(
    (acc, row) => {
      acc[row.direction as string] = parseInt(row.count as string, 10)
      return acc
    },
    { inbound: 0, outbound: 0 } as Record<string, number>
  )

  const row = result.rows[0]

  return {
    creatorId,
    totalThreads: parseInt(row?.total_threads as string, 10) || 0,
    openThreads: parseInt(row?.open_threads as string, 10) || 0,
    totalMessages: parseInt(row?.total_messages as string, 10) || 0,
    inboundMessages: messageCounts.inbound,
    outboundMessages: messageCounts.outbound,
    lastInboundAt: row?.last_inbound_at ? new Date(row.last_inbound_at as string) : null,
    lastOutboundAt: row?.last_outbound_at ? new Date(row.last_outbound_at as string) : null,
  }
}
