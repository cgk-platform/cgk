/**
 * Creator Communications Database Operations
 * PHASE-2U-CREATORS-ADMIN-COMMUNICATIONS
 *
 * All operations use tenant isolation via withTenant()
 */

import { sql, withTenant } from '@cgk/db'

import type {
  BulkSend,
  BulkSendRecipient,
  CommunicationSettings,
  Conversation,
  ConversationFilters,
  ConversationMessage,
  CreateBulkSendInput,
  CreateTemplateInput,
  CreatorEmailTemplate,
  CreatorQueueEntry,
  NotificationSetting,
  QueueFilters,
  QueueStats,
  RecipientFilter,
  TemplateVersion,
  UpdateNotificationSettingInput,
  UpdateTemplateInput,
} from './types'

// ============================================================
// Email Templates
// ============================================================

export async function getTemplates(
  tenantSlug: string,
  category?: string,
): Promise<CreatorEmailTemplate[]> {
  return withTenant(tenantSlug, async () => {
    const result = category
      ? await sql`
          SELECT * FROM creator_email_templates
          WHERE category = ${category}
          ORDER BY name ASC
        `
      : await sql`
          SELECT * FROM creator_email_templates
          ORDER BY category, name ASC
        `
    return result.rows as CreatorEmailTemplate[]
  })
}

export async function getTemplateById(
  tenantSlug: string,
  id: string,
): Promise<CreatorEmailTemplate | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM creator_email_templates
      WHERE id = ${id}
      LIMIT 1
    `
    return (result.rows[0] as CreatorEmailTemplate) || null
  })
}

export async function getTemplateBySlug(
  tenantSlug: string,
  slug: string,
): Promise<CreatorEmailTemplate | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM creator_email_templates
      WHERE slug = ${slug}
      LIMIT 1
    `
    return (result.rows[0] as CreatorEmailTemplate) || null
  })
}

export async function createTemplate(
  tenantSlug: string,
  input: CreateTemplateInput,
  userId: string,
): Promise<CreatorEmailTemplate> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO creator_email_templates (
        category, name, slug, description, subject, content_html, content_text,
        variables, from_address, reply_to, is_default, created_by
      ) VALUES (
        ${input.category},
        ${input.name},
        ${input.slug},
        ${input.description || null},
        ${input.subject},
        ${input.content_html},
        ${input.content_text || null},
        ${JSON.stringify(input.variables || [])},
        ${input.from_address || null},
        ${input.reply_to || null},
        ${input.is_default || false},
        ${userId}
      )
      RETURNING *
    `
    return result.rows[0] as CreatorEmailTemplate
  })
}

export async function updateTemplate(
  tenantSlug: string,
  id: string,
  input: UpdateTemplateInput,
  userId: string,
): Promise<CreatorEmailTemplate | null> {
  return withTenant(tenantSlug, async () => {
    // Get current template for versioning
    const current = await sql`SELECT * FROM creator_email_templates WHERE id = ${id}`
    if (current.rows.length === 0) return null

    const template = current.rows[0] as CreatorEmailTemplate

    // Save version history if content changed
    if (input.subject || input.content_html) {
      await sql`
        INSERT INTO creator_email_template_versions (
          template_id, version, subject, content_html, content_text, variables,
          changed_by, change_note
        ) VALUES (
          ${id},
          ${template.version},
          ${template.subject},
          ${template.content_html},
          ${template.content_text},
          ${JSON.stringify(template.variables)},
          ${userId},
          ${input.change_note || null}
        )
      `
    }

    // Update template
    const result = await sql`
      UPDATE creator_email_templates
      SET
        name = COALESCE(${input.name || null}, name),
        description = COALESCE(${input.description || null}, description),
        subject = COALESCE(${input.subject || null}, subject),
        content_html = COALESCE(${input.content_html || null}, content_html),
        content_text = COALESCE(${input.content_text || null}, content_text),
        variables = COALESCE(${input.variables ? JSON.stringify(input.variables) : null}::jsonb, variables),
        from_address = COALESCE(${input.from_address || null}, from_address),
        reply_to = COALESCE(${input.reply_to || null}, reply_to),
        is_enabled = COALESCE(${input.is_enabled ?? null}, is_enabled),
        version = version + 1,
        last_edited_by = ${userId},
        last_edited_at = NOW(),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    return (result.rows[0] as CreatorEmailTemplate) || null
  })
}

export async function deleteTemplate(
  tenantSlug: string,
  id: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM creator_email_templates
      WHERE id = ${id} AND is_default = false
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

export async function getTemplateVersions(
  tenantSlug: string,
  templateId: string,
): Promise<TemplateVersion[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM creator_email_template_versions
      WHERE template_id = ${templateId}
      ORDER BY version DESC
      LIMIT 10
    `
    return result.rows as TemplateVersion[]
  })
}

export async function restoreTemplateVersion(
  tenantSlug: string,
  templateId: string,
  versionId: string,
  userId: string,
): Promise<CreatorEmailTemplate | null> {
  return withTenant(tenantSlug, async () => {
    const version = await sql`
      SELECT * FROM creator_email_template_versions
      WHERE id = ${versionId} AND template_id = ${templateId}
    `
    if (version.rows.length === 0) return null

    const v = version.rows[0] as TemplateVersion
    return updateTemplate(tenantSlug, templateId, {
      subject: v.subject,
      content_html: v.content_html,
      content_text: v.content_text || undefined,
      variables: v.variables,
      change_note: `Restored from version ${v.version}`,
    }, userId)
  })
}

// ============================================================
// Email Queue
// ============================================================

export async function getQueueEntries(
  tenantSlug: string,
  filters: QueueFilters,
): Promise<{ rows: CreatorQueueEntry[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
      paramIndex++
      conditions.push(`q.status = ANY($${paramIndex}::text[])`)
      values.push(statuses)
    }

    if (filters.creator_id) {
      paramIndex++
      conditions.push(`q.creator_id = $${paramIndex}`)
      values.push(filters.creator_id)
    }

    if (filters.template_id) {
      paramIndex++
      conditions.push(`q.template_type = $${paramIndex}`)
      values.push(filters.template_id)
    }

    if (filters.date_from) {
      paramIndex++
      conditions.push(`q.created_at >= $${paramIndex}::timestamptz`)
      values.push(filters.date_from)
    }

    if (filters.date_to) {
      paramIndex++
      conditions.push(`q.created_at <= $${paramIndex}::timestamptz`)
      values.push(filters.date_to)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, (filters.page - 1) * filters.limit)

    const dataResult = await sql.query(
      `SELECT
        q.id, q.creator_id, q.creator_email, q.creator_name,
        q.template_type as template_id, t.name as template_name,
        COALESCE(q.metadata->>'subject', t.subject) as subject,
        q.status, q.scheduled_at as scheduled_for, q.sent_at,
        q.metadata->>'opened_at' as opened_at,
        q.metadata->>'clicked_at' as clicked_at,
        q.error_message as failed_reason,
        q.attempts as retry_count,
        q.resend_message_id, q.metadata,
        q.created_at, q.updated_at
      FROM creator_email_queue q
      LEFT JOIN creator_email_templates t ON t.slug = q.template_type
      ${whereClause}
      ORDER BY q.created_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM creator_email_queue q ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as CreatorQueueEntry[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

export async function getQueueStats(tenantSlug: string): Promise<QueueStats> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('pending', 'scheduled')) as total_pending,
        COUNT(*) FILTER (WHERE status = 'sent' AND sent_at >= CURRENT_DATE) as sent_today,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COALESCE(
          ROUND(
            COUNT(*) FILTER (WHERE metadata->>'opened_at' IS NOT NULL AND sent_at >= NOW() - INTERVAL '7 days')::numeric /
            NULLIF(COUNT(*) FILTER (WHERE status = 'sent' AND sent_at >= NOW() - INTERVAL '7 days'), 0) * 100,
            1
          ), 0
        ) as open_rate_7d,
        COALESCE(
          ROUND(
            COUNT(*) FILTER (WHERE metadata->>'clicked_at' IS NOT NULL AND sent_at >= NOW() - INTERVAL '7 days')::numeric /
            NULLIF(COUNT(*) FILTER (WHERE status = 'sent' AND sent_at >= NOW() - INTERVAL '7 days'), 0) * 100,
            1
          ), 0
        ) as click_rate_7d
      FROM creator_email_queue
    `
    return result.rows[0] as QueueStats
  })
}

export async function retryQueueEntries(
  tenantSlug: string,
  ids: string[],
): Promise<number> {
  return withTenant(tenantSlug, async () => {
    const idsArrayLiteral = `{${ids.join(',')}}`
    const result = await sql`
      UPDATE creator_email_queue
      SET status = 'scheduled', scheduled_at = NOW(), error_message = NULL, updated_at = NOW()
      WHERE id = ANY(${idsArrayLiteral}::text[]) AND status = 'failed'
      RETURNING id
    `
    return result.rowCount ?? 0
  })
}

export async function cancelQueueEntries(
  tenantSlug: string,
  ids: string[],
): Promise<number> {
  return withTenant(tenantSlug, async () => {
    const idsArrayLiteral = `{${ids.join(',')}}`
    const result = await sql`
      UPDATE creator_email_queue
      SET status = 'skipped', skip_reason = 'Manually cancelled', skipped_at = NOW(), updated_at = NOW()
      WHERE id = ANY(${idsArrayLiteral}::text[]) AND status IN ('pending', 'scheduled')
      RETURNING id
    `
    return result.rowCount ?? 0
  })
}

// ============================================================
// Notification Settings
// ============================================================

export async function getNotificationSettings(
  tenantSlug: string,
): Promise<NotificationSetting[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM creator_notification_settings
      ORDER BY category, display_name
    `
    return result.rows as NotificationSetting[]
  })
}

export async function updateNotificationSetting(
  tenantSlug: string,
  notificationType: string,
  input: UpdateNotificationSettingInput,
): Promise<NotificationSetting | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE creator_notification_settings
      SET
        email_enabled = COALESCE(${input.email_enabled ?? null}, email_enabled),
        sms_enabled = COALESCE(${input.sms_enabled ?? null}, sms_enabled),
        push_enabled = COALESCE(${input.push_enabled ?? null}, push_enabled),
        template_id = COALESCE(${input.template_id ?? null}::uuid, template_id),
        delay_minutes = COALESCE(${input.delay_minutes ?? null}, delay_minutes),
        subject_override = COALESCE(${input.subject_override ?? null}, subject_override),
        is_enabled = COALESCE(${input.is_enabled ?? null}, is_enabled),
        updated_at = NOW()
      WHERE notification_type = ${notificationType}
      RETURNING *
    `
    return (result.rows[0] as NotificationSetting) || null
  })
}

export async function updateNotificationSettings(
  tenantSlug: string,
  settings: Array<{ notification_type: string } & UpdateNotificationSettingInput>,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    for (const setting of settings) {
      await updateNotificationSetting(tenantSlug, setting.notification_type, setting)
    }
    return true
  })
}

// ============================================================
// Bulk Sends
// ============================================================

export async function getBulkSends(
  tenantSlug: string,
  page: number = 1,
  limit: number = 20,
): Promise<{ rows: BulkSend[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const offset = (page - 1) * limit

    const dataResult = await sql`
      SELECT * FROM creator_bulk_sends
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const countResult = await sql`
      SELECT COUNT(*) as count FROM creator_bulk_sends
    `

    return {
      rows: dataResult.rows as BulkSend[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

export async function getBulkSendById(
  tenantSlug: string,
  id: string,
): Promise<BulkSend | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM creator_bulk_sends
      WHERE id = ${id}
      LIMIT 1
    `
    return (result.rows[0] as BulkSend) || null
  })
}

export async function createBulkSend(
  tenantSlug: string,
  input: CreateBulkSendInput,
  userId: string,
): Promise<BulkSend> {
  return withTenant(tenantSlug, async () => {
    // Calculate recipient count
    let recipientCount = 0
    if (input.recipient_ids?.length) {
      recipientCount = input.recipient_ids.length
    } else if (input.recipient_filter) {
      const countResult = await getCreatorsMatchingFilter(tenantSlug, input.recipient_filter)
      recipientCount = countResult.length
    }

    const result = await sql`
      INSERT INTO creator_bulk_sends (
        name, subject, content_html, content_text, recipient_count,
        recipient_filter, recipient_ids, status, scheduled_for,
        personalize, include_unsubscribe, send_as_separate_threads, created_by
      ) VALUES (
        ${input.name || null},
        ${input.subject},
        ${input.content_html},
        ${input.content_text || null},
        ${recipientCount},
        ${input.recipient_filter ? JSON.stringify(input.recipient_filter) : null},
        ${input.recipient_ids ? `{${input.recipient_ids.join(',')}}` : null},
        ${input.scheduled_for ? 'scheduled' : 'draft'},
        ${input.scheduled_for || null},
        ${input.personalize ?? true},
        ${input.include_unsubscribe ?? true},
        ${input.send_as_separate_threads ?? false},
        ${userId}
      )
      RETURNING *
    `
    return result.rows[0] as BulkSend
  })
}

export async function updateBulkSendStatus(
  tenantSlug: string,
  id: string,
  status: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE creator_bulk_sends
      SET
        status = ${status},
        started_at = CASE WHEN ${status} = 'sending' THEN NOW() ELSE started_at END,
        completed_at = CASE WHEN ${status} IN ('completed', 'cancelled') THEN NOW() ELSE completed_at END,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

export async function getBulkSendRecipients(
  tenantSlug: string,
  bulkSendId: string,
  page: number = 1,
  limit: number = 50,
): Promise<{ rows: BulkSendRecipient[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const offset = (page - 1) * limit

    const dataResult = await sql`
      SELECT * FROM creator_bulk_send_recipients
      WHERE bulk_send_id = ${bulkSendId}
      ORDER BY created_at ASC
      LIMIT ${limit} OFFSET ${offset}
    `

    const countResult = await sql`
      SELECT COUNT(*) as count FROM creator_bulk_send_recipients
      WHERE bulk_send_id = ${bulkSendId}
    `

    return {
      rows: dataResult.rows as BulkSendRecipient[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

async function getCreatorsMatchingFilter(
  tenantSlug: string,
  filter: RecipientFilter,
): Promise<Array<{ id: string; email: string; name: string }>> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (filter.status?.length) {
      paramIndex++
      conditions.push(`status = ANY($${paramIndex}::text[])`)
      values.push(filter.status)
    }

    if (filter.tier?.length) {
      paramIndex++
      conditions.push(`tier = ANY($${paramIndex}::text[])`)
      values.push(filter.tier)
    }

    if (filter.tags?.length) {
      paramIndex++
      conditions.push(`tags && $${paramIndex}::text[]`)
      values.push(filter.tags)
    }

    if (filter.last_activity_days) {
      paramIndex++
      conditions.push(`updated_at >= NOW() - INTERVAL '1 day' * $${paramIndex}`)
      values.push(filter.last_activity_days)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await sql.query(
      `SELECT id, email, first_name || ' ' || last_name as name
       FROM creators
       ${whereClause}
       ORDER BY email`,
      values,
    )

    return result.rows as Array<{ id: string; email: string; name: string }>
  })
}

// ============================================================
// Conversations (Inbox)
// ============================================================

export async function getConversations(
  tenantSlug: string,
  filters: ConversationFilters,
): Promise<{ rows: Conversation[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = ["t.contact_type = 'creator'"]
    const values: unknown[] = []
    let paramIndex = 0

    if (filters.status) {
      paramIndex++
      conditions.push(`t.status = $${paramIndex}`)
      values.push(filters.status)
    }

    if (filters.assigned_to) {
      paramIndex++
      conditions.push(`t.assigned_to = $${paramIndex}::uuid`)
      values.push(filters.assigned_to)
    }

    if (filters.creator_id) {
      paramIndex++
      conditions.push(`t.contact_id = $${paramIndex}`)
      values.push(filters.creator_id)
    }

    if (filters.is_starred !== undefined) {
      paramIndex++
      conditions.push(`t.is_starred = $${paramIndex}`)
      values.push(filters.is_starred)
    }

    if (filters.is_archived !== undefined) {
      paramIndex++
      conditions.push(`t.is_archived = $${paramIndex}`)
      values.push(filters.is_archived)
    } else {
      conditions.push(`COALESCE(t.is_archived, false) = false`)
    }

    if (filters.search) {
      paramIndex++
      conditions.push(
        `(t.subject ILIKE $${paramIndex} OR t.contact_name ILIKE $${paramIndex} OR t.contact_email ILIKE $${paramIndex})`,
      )
      values.push(`%${filters.search}%`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(filters.limit, (filters.page - 1) * filters.limit)

    const dataResult = await sql.query(
      `SELECT
        t.id, t.contact_id as creator_id, t.contact_name as creator_name,
        t.contact_email as creator_email, c.avatar_url as creator_avatar_url,
        t.subject, t.status,
        COALESCE(t.unread_count, 0) as unread_count,
        t.message_count, t.last_message_at,
        m.body_text as last_message_preview,
        t.assigned_to, u.name as assigned_name,
        t.project_id, p.name as project_name,
        COALESCE(t.is_starred, false) as is_starred,
        COALESCE(t.is_archived, false) as is_archived,
        COALESCE(t.tags, '{}') as tags,
        t.created_at, t.updated_at
      FROM email_threads t
      LEFT JOIN creators c ON c.id = t.contact_id
      LEFT JOIN public.users u ON u.id = t.assigned_to
      LEFT JOIN creator_projects p ON p.id = t.project_id
      LEFT JOIN LATERAL (
        SELECT body_text FROM thread_messages
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
      `SELECT COUNT(*) as count FROM email_threads t ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as Conversation[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

export async function getConversation(
  tenantSlug: string,
  id: string,
): Promise<Conversation | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        t.id, t.contact_id as creator_id, t.contact_name as creator_name,
        t.contact_email as creator_email, c.avatar_url as creator_avatar_url,
        t.subject, t.status,
        COALESCE(t.unread_count, 0) as unread_count,
        t.message_count, t.last_message_at,
        m.body_text as last_message_preview,
        t.assigned_to, u.name as assigned_name,
        t.project_id, p.name as project_name,
        COALESCE(t.is_starred, false) as is_starred,
        COALESCE(t.is_archived, false) as is_archived,
        COALESCE(t.tags, '{}') as tags,
        t.created_at, t.updated_at
      FROM email_threads t
      LEFT JOIN creators c ON c.id = t.contact_id
      LEFT JOIN public.users u ON u.id = t.assigned_to
      LEFT JOIN creator_projects p ON p.id = t.project_id
      LEFT JOIN LATERAL (
        SELECT body_text FROM thread_messages
        WHERE thread_id = t.id
        ORDER BY created_at DESC
        LIMIT 1
      ) m ON true
      WHERE t.id = ${id}
      LIMIT 1
    `
    return (result.rows[0] as Conversation) || null
  })
}

export async function getConversationMessages(
  tenantSlug: string,
  threadId: string,
): Promise<ConversationMessage[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        m.id, m.thread_id, m.direction, m.from_address, m.to_address,
        m.subject, m.body_text, m.body_html,
        COALESCE(m.attachments, '[]') as attachments,
        COALESCE(m.is_internal, false) as is_internal,
        m.scheduled_for, m.sender_user_id,
        u.name as sender_name,
        m.status, m.read_at, m.created_at
      FROM thread_messages m
      LEFT JOIN public.users u ON u.id = m.sender_user_id
      WHERE m.thread_id = ${threadId}
      ORDER BY m.created_at ASC
    `
    return result.rows as ConversationMessage[]
  })
}

export async function createConversationMessage(
  tenantSlug: string,
  threadId: string,
  content: string,
  userId: string,
  isInternal: boolean = false,
  scheduledFor?: string,
): Promise<ConversationMessage | null> {
  return withTenant(tenantSlug, async () => {
    // Get thread info
    const thread = await sql`SELECT * FROM email_threads WHERE id = ${threadId}`
    const t = thread.rows[0]
    if (!t) return null

    const result = await sql`
      INSERT INTO thread_messages (
        thread_id, direction, from_address, to_address, body_text,
        is_internal, scheduled_for, sender_user_id, status
      ) VALUES (
        ${threadId},
        'outbound',
        ${t.contact_email},
        ${t.contact_email},
        ${content},
        ${isInternal},
        ${scheduledFor || null},
        ${userId},
        ${scheduledFor ? 'scheduled' : 'sent'}
      )
      RETURNING *
    `

    // Update thread stats
    await sql`
      UPDATE email_threads
      SET
        message_count = COALESCE(message_count, 0) + 1,
        last_message_at = NOW(),
        last_outbound_at = NOW(),
        status = CASE WHEN ${isInternal} THEN status ELSE 'pending' END,
        updated_at = NOW()
      WHERE id = ${threadId}
    `

    return result.rows[0] as ConversationMessage
  })
}

export async function updateConversationStatus(
  tenantSlug: string,
  id: string,
  status: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE email_threads
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

export async function assignConversation(
  tenantSlug: string,
  id: string,
  userId: string | null,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE email_threads
      SET assigned_to = ${userId}::uuid, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

export async function starConversation(
  tenantSlug: string,
  id: string,
  starred: boolean,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE email_threads
      SET is_starred = ${starred}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

export async function archiveConversation(
  tenantSlug: string,
  id: string,
  archived: boolean,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE email_threads
      SET is_archived = ${archived}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

export async function markConversationRead(
  tenantSlug: string,
  id: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    await sql`
      UPDATE thread_messages
      SET read_at = NOW()
      WHERE thread_id = ${id} AND direction = 'inbound' AND read_at IS NULL
    `
    await sql`
      UPDATE email_threads
      SET unread_count = 0, updated_at = NOW()
      WHERE id = ${id}
    `
    return true
  })
}

export async function createConversation(
  tenantSlug: string,
  creatorId: string,
  subject: string | null,
  content: string,
  userId: string,
): Promise<Conversation | null> {
  return withTenant(tenantSlug, async () => {
    // Get creator info
    const creator = await sql`SELECT id, email, first_name, last_name FROM creators WHERE id = ${creatorId}`
    const c = creator.rows[0]
    if (!c) return null

    const creatorName = `${c.first_name} ${c.last_name}`

    // Create thread
    const thread = await sql`
      INSERT INTO email_threads (
        contact_type, contact_id, contact_email, contact_name,
        subject, status, message_count
      ) VALUES (
        'creator',
        ${creatorId},
        ${c.email},
        ${creatorName},
        ${subject || 'New Message'},
        'open',
        1
      )
      RETURNING id
    `

    const threadRow = thread.rows[0]
    if (!threadRow) return null

    const threadId = threadRow.id

    // Create first message
    await sql`
      INSERT INTO thread_messages (
        thread_id, direction, from_address, to_address, body_text,
        sender_user_id, status
      ) VALUES (
        ${threadId},
        'outbound',
        ${c.email},
        ${c.email},
        ${content},
        ${userId},
        'sent'
      )
    `

    return getConversation(tenantSlug, threadId)
  })
}

export async function getUnreadCount(tenantSlug: string): Promise<number> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT SUM(COALESCE(unread_count, 0))::int as count
      FROM email_threads
      WHERE contact_type = 'creator' AND COALESCE(is_archived, false) = false
    `
    return Number(result.rows[0]?.count || 0)
  })
}

// ============================================================
// Communication Settings
// ============================================================

export async function getCommunicationSettings(
  tenantSlug: string,
): Promise<CommunicationSettings | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM creator_communication_settings
      LIMIT 1
    `
    if (result.rows.length === 0) {
      // Create default settings
      const insert = await sql`
        INSERT INTO creator_communication_settings DEFAULT VALUES
        RETURNING *
      `
      return insert.rows[0] as CommunicationSettings
    }
    return result.rows[0] as CommunicationSettings
  })
}

export async function updateCommunicationSettings(
  tenantSlug: string,
  settings: Partial<CommunicationSettings>,
): Promise<CommunicationSettings | null> {
  return withTenant(tenantSlug, async () => {
    const current = await getCommunicationSettings(tenantSlug)
    if (!current) return null

    const result = await sql`
      UPDATE creator_communication_settings
      SET
        default_from_address = COALESCE(${settings.default_from_address || null}, default_from_address),
        default_reply_to = COALESCE(${settings.default_reply_to || null}, default_reply_to),
        quiet_hours_enabled = COALESCE(${settings.quiet_hours_enabled ?? null}, quiet_hours_enabled),
        quiet_hours_start = COALESCE(${settings.quiet_hours_start || null}::time, quiet_hours_start),
        quiet_hours_end = COALESCE(${settings.quiet_hours_end || null}::time, quiet_hours_end),
        quiet_hours_timezone = COALESCE(${settings.quiet_hours_timezone || null}, quiet_hours_timezone),
        unsubscribe_footer_enabled = COALESCE(${settings.unsubscribe_footer_enabled ?? null}, unsubscribe_footer_enabled),
        unsubscribe_url = COALESCE(${settings.unsubscribe_url || null}, unsubscribe_url),
        max_emails_per_day = COALESCE(${settings.max_emails_per_day ?? null}, max_emails_per_day),
        max_bulk_recipients = COALESCE(${settings.max_bulk_recipients ?? null}, max_bulk_recipients),
        bulk_send_rate_per_minute = COALESCE(${settings.bulk_send_rate_per_minute ?? null}, bulk_send_rate_per_minute),
        updated_at = NOW()
      WHERE id = ${current.id}
      RETURNING *
    `
    return result.rows[0] as CommunicationSettings
  })
}
