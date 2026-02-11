/**
 * Email Thread Matcher
 *
 * Matches inbound emails to existing conversation threads.
 * Uses In-Reply-To header, sender email, and subject matching.
 *
 * @ai-pattern inbound-email
 * @ai-note Uses tenant-isolated database operations
 */

import { sql } from '@cgk/db'

import type {
  ContactType,
  CreateThreadInput,
  CreateThreadMessageInput,
  EmailThread,
  InboundEmail,
  MatchedThread,
  ThreadMessage,
} from './types.js'

// ============================================================================
// Database Mappers
// ============================================================================

/**
 * Map database row to EmailThread
 */
function mapRowToThread(row: Record<string, unknown>): EmailThread {
  return {
    id: row.id as string,
    contactType: row.contact_type as ContactType,
    contactId: row.contact_id as string | null,
    contactEmail: row.contact_email as string,
    contactName: row.contact_name as string | null,
    subject: row.subject as string | null,
    status: row.status as EmailThread['status'],
    messageCount: row.message_count as number,
    lastMessageAt: row.last_message_at ? new Date(row.last_message_at as string) : null,
    lastInboundAt: row.last_inbound_at ? new Date(row.last_inbound_at as string) : null,
    lastOutboundAt: row.last_outbound_at ? new Date(row.last_outbound_at as string) : null,
    assignedTo: row.assigned_to as string | null,
    tags: row.tags as string[] | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Map database row to ThreadMessage
 */
function mapRowToMessage(row: Record<string, unknown>): ThreadMessage {
  return {
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
  }
}

// ============================================================================
// Thread Operations
// ============================================================================

/**
 * Find existing message by RFC 2822 Message-ID
 */
export async function findMessageByMessageId(
  messageId: string
): Promise<ThreadMessage | null> {
  const result = await sql`
    SELECT *
    FROM thread_messages
    WHERE message_id = ${messageId}
    LIMIT 1
  `

  const row = result.rows[0]
  return row ? mapRowToMessage(row as Record<string, unknown>) : null
}

/**
 * Find thread by contact email
 */
export async function findThreadByEmail(
  email: string
): Promise<EmailThread | null> {
  const result = await sql`
    SELECT *
    FROM email_threads
    WHERE contact_email = ${email}
    ORDER BY last_message_at DESC NULLS LAST
    LIMIT 1
  `

  const row = result.rows[0]
  return row ? mapRowToThread(row as Record<string, unknown>) : null
}

/**
 * Find open thread for a contact
 */
export async function findOpenThreadForContact(
  contactId: string,
  contactType: ContactType
): Promise<EmailThread | null> {
  const result = await sql`
    SELECT *
    FROM email_threads
    WHERE contact_id = ${contactId}
    AND contact_type = ${contactType}
    AND status = 'open'
    ORDER BY last_message_at DESC NULLS LAST
    LIMIT 1
  `

  const row = result.rows[0]
  return row ? mapRowToThread(row as Record<string, unknown>) : null
}

/**
 * Create a new thread
 */
export async function createThread(
  input: CreateThreadInput
): Promise<EmailThread> {
  const result = await sql`
    INSERT INTO email_threads (
      contact_type, contact_id, contact_email, contact_name, subject, status
    ) VALUES (
      ${input.contactType},
      ${input.contactId ?? null},
      ${input.contactEmail},
      ${input.contactName ?? null},
      ${input.subject ?? null},
      ${input.status ?? 'open'}
    )
    RETURNING *
  `

  return mapRowToThread(result.rows[0] as Record<string, unknown>)
}

/**
 * Update thread stats after new message
 */
export async function updateThreadStats(
  threadId: string,
  direction: 'inbound' | 'outbound'
): Promise<void> {
  if (direction === 'inbound') {
    await sql`
      UPDATE email_threads
      SET
        message_count = message_count + 1,
        last_message_at = NOW(),
        last_inbound_at = NOW(),
        status = CASE WHEN status = 'closed' THEN 'open' ELSE status END,
        updated_at = NOW()
      WHERE id = ${threadId}
    `
  } else {
    await sql`
      UPDATE email_threads
      SET
        message_count = message_count + 1,
        last_message_at = NOW(),
        last_outbound_at = NOW(),
        status = CASE WHEN status = 'closed' THEN 'open' ELSE status END,
        updated_at = NOW()
      WHERE id = ${threadId}
    `
  }
}

/**
 * Add message to thread
 */
export async function addMessageToThread(
  input: CreateThreadMessageInput
): Promise<ThreadMessage> {
  const result = await sql`
    INSERT INTO thread_messages (
      thread_id, direction, from_address, to_address, subject,
      body_text, body_html, attachments, message_id, in_reply_to,
      inbound_email_id, queue_entry_id, queue_type, status
    ) VALUES (
      ${input.threadId},
      ${input.direction},
      ${input.fromAddress},
      ${input.toAddress ?? null},
      ${input.subject ?? null},
      ${input.bodyText ?? null},
      ${input.bodyHtml ?? null},
      ${JSON.stringify(input.attachments ?? [])},
      ${input.messageId ?? null},
      ${input.inReplyTo ?? null},
      ${input.inboundEmailId ?? null},
      ${input.queueEntryId ?? null},
      ${input.queueType ?? null},
      ${'received'}
    )
    RETURNING *
  `

  // Update thread stats
  await updateThreadStats(input.threadId, input.direction)

  return mapRowToMessage(result.rows[0] as Record<string, unknown>)
}

// ============================================================================
// Contact Lookup
// ============================================================================

/**
 * Contact lookup result
 */
export interface ContactInfo {
  id: string
  type: ContactType
  email: string
  name?: string
}

/**
 * Find contact by email in creators table
 */
export async function findCreatorByEmail(
  email: string
): Promise<ContactInfo | null> {
  const result = await sql`
    SELECT id, email, name
    FROM creators
    WHERE email = ${email}
    LIMIT 1
  `

  const row = result.rows[0]
  if (!row) return null

  return {
    id: row.id as string,
    type: 'creator' as ContactType,
    email: row.email as string,
    name: row.name as string | undefined,
  }
}

/**
 * Find contact by email in customers table
 */
export async function findCustomerByEmail(
  email: string
): Promise<ContactInfo | null> {
  const result = await sql`
    SELECT id, email, first_name, last_name
    FROM customers
    WHERE email = ${email}
    LIMIT 1
  `

  const row = result.rows[0]
  if (!row) return null

  const firstName = row.first_name as string | null
  const lastName = row.last_name as string | null
  const name = [firstName, lastName].filter(Boolean).join(' ') || undefined

  return {
    id: row.id as string,
    type: 'customer' as ContactType,
    email: row.email as string,
    name,
  }
}

/**
 * Find contact by email (checks all contact tables)
 */
export async function findContactByEmail(
  email: string
): Promise<ContactInfo | null> {
  // Check creators first
  const creator = await findCreatorByEmail(email)
  if (creator) return creator

  // Check customers
  const customer = await findCustomerByEmail(email)
  if (customer) return customer

  // No contact found
  return null
}

// ============================================================================
// Thread Matching
// ============================================================================

/**
 * Match inbound email to existing conversation thread
 *
 * Uses the following strategy:
 * 1. Try In-Reply-To header first (most reliable)
 * 2. Try sender email lookup for existing threads
 * 3. Create new thread if no match
 *
 * @param email - Inbound email to match
 * @returns Matched thread info
 */
export async function matchToThread(
  email: InboundEmail
): Promise<MatchedThread> {
  // 1. Try In-Reply-To header first (most reliable)
  if (email.inReplyTo) {
    const existingMessage = await findMessageByMessageId(email.inReplyTo)
    if (existingMessage) {
      // Get thread info
      const threadResult = await sql`
        SELECT t.*, t.contact_id, t.contact_type
        FROM email_threads t
        WHERE t.id = ${existingMessage.threadId}
      `

      const thread = threadResult.rows[0]
      if (thread) {
        return {
          threadId: existingMessage.threadId,
          contactId: thread.contact_id as string | null,
          contactType: thread.contact_type as ContactType,
          isNewThread: false,
        }
      }
    }
  }

  // 2. Try references header
  if (email.references && email.references.length > 0) {
    for (const ref of email.references) {
      const existingMessage = await findMessageByMessageId(ref)
      if (existingMessage) {
        const threadResult = await sql`
          SELECT t.*, t.contact_id, t.contact_type
          FROM email_threads t
          WHERE t.id = ${existingMessage.threadId}
        `

        const thread = threadResult.rows[0]
        if (thread) {
          return {
            threadId: existingMessage.threadId,
            contactId: thread.contact_id as string | null,
            contactType: thread.contact_type as ContactType,
            isNewThread: false,
          }
        }
      }
    }
  }

  // 3. Try sender email lookup
  const contact = await findContactByEmail(email.from)

  if (contact) {
    // Find most recent open thread for this contact
    const existingThread = await findOpenThreadForContact(contact.id, contact.type)

    if (existingThread) {
      return {
        threadId: existingThread.id,
        contactId: contact.id,
        contactType: contact.type,
        isNewThread: false,
      }
    }

    // Create new thread for this known contact
    const newThread = await createThread({
      contactType: contact.type,
      contactId: contact.id,
      contactEmail: email.from,
      contactName: contact.name,
      subject: email.subject,
      status: 'open',
    })

    return {
      threadId: newThread.id,
      contactId: contact.id,
      contactType: contact.type,
      isNewThread: true,
    }
  }

  // 4. Check for existing thread by email (unknown contact)
  const existingThread = await findThreadByEmail(email.from)

  if (existingThread) {
    return {
      threadId: existingThread.id,
      contactId: existingThread.contactId,
      contactType: existingThread.contactType,
      isNewThread: false,
    }
  }

  // 5. Create new thread for unknown contact
  const newThread = await createThread({
    contactType: 'unknown',
    contactEmail: email.from,
    contactName: email.fromName,
    subject: email.subject,
    status: 'open',
  })

  return {
    threadId: newThread.id,
    contactId: null,
    contactType: 'unknown',
    isNewThread: true,
  }
}

/**
 * Add inbound email to matched thread
 */
export async function addInboundToThread(
  email: InboundEmail,
  threadId: string,
  inboundEmailId: string
): Promise<ThreadMessage> {
  return addMessageToThread({
    threadId,
    direction: 'inbound',
    fromAddress: email.from,
    toAddress: email.to,
    subject: email.subject,
    bodyText: email.bodyText,
    bodyHtml: email.bodyHtml,
    attachments: email.attachments,
    messageId: email.messageId,
    inReplyTo: email.inReplyTo,
    inboundEmailId,
  })
}
