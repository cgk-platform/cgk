/**
 * Smart Inbox Message Service
 * PHASE-2H-WORKFLOWS
 */

import { sql, withTenant } from '@cgk/db'

import type {
  AIDraft,
  Message,
  MessageChannel,
  SendMessageInput,
  SenderType,
} from './types'

// ============================================================
// Message Operations
// ============================================================

/**
 * Get messages for a thread
 */
export async function getMessages(
  tenantId: string,
  threadId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ messages: Message[]; total: number }> {
  return withTenant(tenantId, async () => {
    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as count
      FROM inbox_messages
      WHERE thread_id = ${threadId}
    `
    const total = parseInt(String(countResult.rows[0]?.count || '0'), 10)

    // Get messages
    const limit = options?.limit || 100
    const offset = options?.offset || 0

    const result = await sql`
      SELECT *
      FROM inbox_messages
      WHERE thread_id = ${threadId}
      ORDER BY created_at ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    return {
      messages: result.rows.map((row) => mapMessageFromDb(row as Record<string, unknown>)),
      total,
    }
  })
}

/**
 * Get a single message by ID
 */
export async function getMessage(
  tenantId: string,
  messageId: string
): Promise<Message | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT * FROM inbox_messages WHERE id = ${messageId}
    `

    if (result.rows.length === 0) {
      return null
    }

    return mapMessageFromDb(result.rows[0] as Record<string, unknown>)
  })
}

/**
 * Send a message (outbound)
 */
export async function sendMessage(
  tenantId: string,
  threadId: string,
  input: SendMessageInput,
  senderId: string
): Promise<Message> {
  return withTenant(tenantId, async () => {
    // Insert message
    const result = await sql`
      INSERT INTO inbox_messages (
        thread_id, direction, channel,
        subject, body, body_html,
        sender_type, sender_id,
        status
      ) VALUES (
        ${threadId}, 'outbound', ${input.channel},
        ${input.subject || null}, ${input.body}, ${input.bodyHtml || null},
        'team_member', ${senderId},
        'pending'
      )
      RETURNING *
    `

    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to create message')
    }
    const message = mapMessageFromDb(row as Record<string, unknown>)

    // Update thread's last message info
    await updateThreadLastMessage(
      tenantId,
      threadId,
      'team_member',
      input.body.substring(0, 100)
    )

    // Queue for actual sending via communications package
    await queueMessageForDelivery(tenantId, message, input.channel)

    return message
  })
}

/**
 * Record an inbound message
 */
export async function recordInboundMessage(
  tenantId: string,
  threadId: string,
  data: {
    channel: MessageChannel
    subject?: string
    body: string
    bodyHtml?: string
    externalId?: string
  }
): Promise<Message> {
  return withTenant(tenantId, async () => {
    // Insert message
    const result = await sql`
      INSERT INTO inbox_messages (
        thread_id, direction, channel,
        subject, body, body_html,
        sender_type, sender_id,
        status, external_id,
        sent_at
      ) VALUES (
        ${threadId}, 'inbound', ${data.channel},
        ${data.subject || null}, ${data.body}, ${data.bodyHtml || null},
        'contact', NULL,
        'delivered', ${data.externalId || null},
        NOW()
      )
      RETURNING *
    `

    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to record inbound message')
    }
    const message = mapMessageFromDb(row as Record<string, unknown>)

    // Update thread's last message info and increment unread
    await sql`
      UPDATE inbox_threads
      SET
        last_message_at = NOW(),
        last_message_sender = 'contact',
        last_message_preview = ${data.body.substring(0, 100)},
        unread_count = unread_count + 1,
        updated_at = NOW()
      WHERE id = ${threadId}
    `

    // Reopen thread if it was closed or snoozed
    await sql`
      UPDATE inbox_threads
      SET status = 'open', snoozed_until = NULL
      WHERE id = ${threadId}
        AND status IN ('closed', 'snoozed')
    `

    return message
  })
}

/**
 * Update message status (after delivery)
 */
export async function updateMessageStatus(
  tenantId: string,
  messageId: string,
  status: Message['status'],
  externalId?: string,
  failedReason?: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    if (status === 'sent') {
      await sql`
        UPDATE inbox_messages
        SET status = ${status}, sent_at = NOW(), external_id = ${externalId || null}
        WHERE id = ${messageId}
      `
    } else if (status === 'delivered') {
      await sql`
        UPDATE inbox_messages
        SET status = ${status}, delivered_at = NOW()
        WHERE id = ${messageId}
      `
    } else if (status === 'read') {
      await sql`
        UPDATE inbox_messages
        SET status = ${status}, read_at = NOW()
        WHERE id = ${messageId}
      `
    } else if (status === 'failed') {
      await sql`
        UPDATE inbox_messages
        SET status = ${status}, failed_reason = ${failedReason || null}
        WHERE id = ${messageId}
      `
    } else {
      await sql`
        UPDATE inbox_messages
        SET status = ${status}
        WHERE id = ${messageId}
      `
    }
  })
}

// ============================================================
// AI Draft Operations
// ============================================================

/**
 * Generate AI draft for a thread
 */
export async function generateDraft(
  tenantId: string,
  threadId: string
): Promise<AIDraft> {
  return withTenant(tenantId, async () => {
    // Get thread and recent messages for context
    const threadResult = await sql`
      SELECT t.*, c.name as contact_name, c.email as contact_email
      FROM inbox_threads t
      JOIN inbox_contacts c ON c.id = t.contact_id
      WHERE t.id = ${threadId}
    `

    if (threadResult.rows.length === 0) {
      throw new Error('Thread not found')
    }

    const thread = threadResult.rows[0] as Record<string, unknown>

    const messagesResult = await sql`
      SELECT * FROM inbox_messages
      WHERE thread_id = ${threadId}
      ORDER BY created_at DESC
      LIMIT 10
    `

    // Build context for AI
    const context = {
      contactName: thread.contact_name,
      contactEmail: thread.contact_email,
      subject: thread.subject,
      messages: messagesResult.rows.map((m) => ({
        direction: (m as Record<string, unknown>).direction,
        body: (m as Record<string, unknown>).body,
        createdAt: (m as Record<string, unknown>).created_at,
      })),
    }

    // TODO: Call actual AI service (e.g., OpenAI)
    // For now, generate a simple template response
    const draftBody = generateSimpleDraft(context)

    // Insert draft
    const draftResult = await sql`
      INSERT INTO inbox_ai_drafts (
        thread_id, body, body_html, suggested_channel,
        confidence, model, status
      ) VALUES (
        ${threadId},
        ${draftBody},
        ${draftBody.replace(/\n/g, '<br>')},
        'email',
        0.75,
        'template',
        'pending'
      )
      RETURNING *
    `

    const row = draftResult.rows[0]
    if (!row) {
      throw new Error('Failed to create draft')
    }
    return mapDraftFromDb(row as Record<string, unknown>)
  })
}

/**
 * Get pending AI draft for a thread
 */
export async function getPendingDraft(
  tenantId: string,
  threadId: string
): Promise<AIDraft | null> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT * FROM inbox_ai_drafts
      WHERE thread_id = ${threadId}
        AND status = 'pending'
      ORDER BY generated_at DESC
      LIMIT 1
    `

    if (result.rows.length === 0) {
      return null
    }

    return mapDraftFromDb(result.rows[0] as Record<string, unknown>)
  })
}

/**
 * Send an AI draft (with optional edits)
 */
export async function sendDraft(
  tenantId: string,
  draftId: string,
  userId: string,
  editedContent?: string
): Promise<Message> {
  return withTenant(tenantId, async () => {
    // Get draft
    const draftResult = await sql`
      SELECT * FROM inbox_ai_drafts WHERE id = ${draftId}
    `

    if (draftResult.rows.length === 0) {
      throw new Error('Draft not found')
    }

    const draft = draftResult.rows[0] as Record<string, unknown>
    const wasEdited = !!editedContent && editedContent !== draft.body
    const finalContent = editedContent || (draft.body as string)

    // Create message
    const messageResult = await sql`
      INSERT INTO inbox_messages (
        thread_id, direction, channel,
        body, body_html,
        sender_type, sender_id,
        ai_drafted, ai_confidence, ai_was_edited, original_ai_draft,
        status
      ) VALUES (
        ${draft.thread_id},
        'outbound',
        ${(draft.suggested_channel as string) || 'email'},
        ${finalContent},
        ${finalContent.replace(/\n/g, '<br>')},
        'team_member',
        ${userId},
        true,
        ${draft.confidence},
        ${wasEdited},
        ${wasEdited ? (draft.body as string) : null},
        'pending'
      )
      RETURNING *
    `

    const row = messageResult.rows[0]
    if (!row) {
      throw new Error('Failed to create message from draft')
    }
    const message = mapMessageFromDb(row as Record<string, unknown>)

    // Update draft status
    await sql`
      UPDATE inbox_ai_drafts
      SET
        status = ${wasEdited ? 'edited_and_sent' : 'sent'},
        sent_message_id = ${message.id},
        edited_content = ${wasEdited ? editedContent : null},
        actioned_at = NOW(),
        actioned_by = ${userId}
      WHERE id = ${draftId}
    `

    // Update thread
    await updateThreadLastMessage(
      tenantId,
      draft.thread_id as string,
      'team_member',
      finalContent.substring(0, 100)
    )

    // Queue for delivery
    await queueMessageForDelivery(
      tenantId,
      message,
      (draft.suggested_channel as MessageChannel) || 'email'
    )

    return message
  })
}

/**
 * Discard an AI draft
 */
export async function discardDraft(
  tenantId: string,
  draftId: string,
  userId: string
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      UPDATE inbox_ai_drafts
      SET
        status = 'discarded',
        actioned_at = NOW(),
        actioned_by = ${userId}
      WHERE id = ${draftId}
    `
  })
}

// ============================================================
// Helper Functions
// ============================================================

async function updateThreadLastMessage(
  _tenantId: string,
  threadId: string,
  senderType: SenderType,
  preview: string
): Promise<void> {
  // Already inside withTenant context from caller
  await sql`
    UPDATE inbox_threads
    SET
      last_message_at = NOW(),
      last_message_sender = ${senderType},
      last_message_preview = ${preview},
      updated_at = NOW()
    WHERE id = ${threadId}
  `
}

async function queueMessageForDelivery(
  _tenantId: string,
  message: Message,
  channel: MessageChannel
): Promise<void> {
  // Already inside withTenant context from caller
  // Get thread and contact info for delivery
  const result = await sql`
    SELECT
      t.subject,
      c.email,
      c.phone,
      c.name
    FROM inbox_threads t
    JOIN inbox_contacts c ON c.id = t.contact_id
    WHERE t.id = ${message.threadId}
  `

  if (result.rows.length === 0) {
    return
  }

  const contact = result.rows[0] as Record<string, unknown>

  if (channel === 'email' && contact.email) {
    // Queue via communications package
    try {
      await sql`
        INSERT INTO email_queue (
          to_address,
          subject,
          body_text,
          body_html,
          source,
          source_id,
          priority
        ) VALUES (
          ${contact.email},
          ${message.subject || (contact.subject as string) || 'Message'},
          ${message.body},
          ${message.bodyHtml || message.body},
          'inbox',
          ${message.id},
          'normal'
        )
      `
    } catch {
      // Email queue table might not exist
    }
  }

  // TODO: Implement SMS queueing if channel === 'sms'
}

function generateSimpleDraft(context: {
  contactName: unknown
  messages: Array<{ direction: unknown; body: unknown }>
}): string {
  const firstName = (context.contactName as string)?.split(' ')[0] || 'there'
  const lastInbound = context.messages.find((m) => m.direction === 'inbound')

  if (!lastInbound) {
    return `Hi ${firstName},\n\nThank you for reaching out. How can I help you today?\n\nBest regards`
  }

  return `Hi ${firstName},\n\nThank you for your message. I wanted to follow up on this.\n\nPlease let me know if you have any questions.\n\nBest regards`
}

// ============================================================
// Mappers
// ============================================================

function mapMessageFromDb(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    threadId: row.thread_id as string,
    direction: row.direction as Message['direction'],
    channel: row.channel as Message['channel'],
    subject: row.subject as string | null,
    body: row.body as string,
    bodyHtml: row.body_html as string | null,
    senderType: row.sender_type as Message['senderType'],
    senderId: row.sender_id as string | null,
    aiDrafted: (row.ai_drafted as boolean) || false,
    aiConfidence: row.ai_confidence as number | null,
    aiWasEdited: (row.ai_was_edited as boolean) || false,
    originalAiDraft: row.original_ai_draft as string | null,
    status: row.status as Message['status'],
    externalId: row.external_id as string | null,
    failedReason: row.failed_reason as string | null,
    sentAt: row.sent_at ? new Date(row.sent_at as string) : null,
    deliveredAt: row.delivered_at ? new Date(row.delivered_at as string) : null,
    readAt: row.read_at ? new Date(row.read_at as string) : null,
    createdAt: new Date(row.created_at as string),
  }
}

function mapDraftFromDb(row: Record<string, unknown>): AIDraft {
  return {
    id: row.id as string,
    threadId: row.thread_id as string,
    body: row.body as string,
    bodyHtml: row.body_html as string | null,
    suggestedChannel: row.suggested_channel as AIDraft['suggestedChannel'],
    confidence: row.confidence as number | null,
    model: row.model as string | null,
    promptTokens: row.prompt_tokens as number | null,
    completionTokens: row.completion_tokens as number | null,
    status: row.status as AIDraft['status'],
    sentMessageId: row.sent_message_id as string | null,
    editedContent: row.edited_content as string | null,
    generatedAt: new Date(row.generated_at as string),
    actionedAt: row.actioned_at ? new Date(row.actioned_at as string) : null,
    actionedBy: row.actioned_by
      ? { id: row.actioned_by as string, name: '' }
      : null,
  }
}
