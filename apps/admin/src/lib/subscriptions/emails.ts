/**
 * Subscription Email Templates Service
 *
 * Manages email templates for subscription notifications.
 * All operations are tenant-scoped using withTenant().
 */

import { withTenant, sql } from '@cgk-platform/db'

import type { SubscriptionEmailTemplate } from './types'

type DbRow = Record<string, unknown>

/**
 * List all subscription email templates
 */
export async function listEmailTemplates(
  tenantSlug: string
): Promise<SubscriptionEmailTemplate[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM email_templates
      WHERE notification_type = 'subscription'
      ORDER BY template_key ASC
    `

    return result.rows.map(mapRowToTemplate)
  })
}

/**
 * Get a single email template by ID
 */
export async function getEmailTemplate(
  tenantSlug: string,
  templateId: string
): Promise<SubscriptionEmailTemplate | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM email_templates
      WHERE id = ${templateId} AND notification_type = 'subscription'
    `
    const row = result.rows[0]
    if (!row) return null
    return mapRowToTemplate(row as DbRow)
  })
}

/**
 * Get email template by key
 */
export async function getEmailTemplateByKey(
  tenantSlug: string,
  templateKey: string
): Promise<SubscriptionEmailTemplate | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM email_templates
      WHERE notification_type = 'subscription' AND template_key = ${templateKey}
    `
    const row = result.rows[0]
    if (!row) return null
    return mapRowToTemplate(row as DbRow)
  })
}

/**
 * Update an email template
 */
export async function updateEmailTemplate(
  tenantSlug: string,
  templateId: string,
  data: Partial<{
    name: string
    description: string
    subject: string
    bodyHtml: string
    bodyText: string
    senderName: string
    senderEmail: string
    replyToEmail: string
    isActive: boolean
  }>,
  userId?: string
): Promise<SubscriptionEmailTemplate | null> {
  return withTenant(tenantSlug, async () => {
    // First, save current version to history
    await sql`
      INSERT INTO email_template_versions (template_id, version, subject, body_html, body_text, changed_by)
      SELECT id, version, subject, body_html, body_text, ${userId || null}
      FROM email_templates
      WHERE id = ${templateId}
    `

    // Build update query
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    const fieldMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      subject: 'subject',
      bodyHtml: 'body_html',
      bodyText: 'body_text',
      senderName: 'sender_name',
      senderEmail: 'sender_email',
      replyToEmail: 'reply_to_email',
      isActive: 'is_active',
    }

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (key in data) {
        paramIndex++
        updates.push(`${dbField} = $${paramIndex}`)
        values.push(data[key as keyof typeof data])
      }
    }

    if (updates.length === 0) {
      return getEmailTemplate(tenantSlug, templateId)
    }

    // Always increment version and update metadata
    updates.push('version = version + 1')
    updates.push('is_default = false')
    paramIndex++
    updates.push(`last_edited_by = $${paramIndex}`)
    values.push(userId || null)
    updates.push('last_edited_at = NOW()')

    paramIndex++
    values.push(templateId)

    const result = await sql.query(
      `UPDATE email_templates
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    )

    if (result.rows.length === 0) return null
    return mapRowToTemplate(result.rows[0])
  })
}

/**
 * Toggle template active status
 */
export async function toggleEmailTemplate(
  tenantSlug: string,
  templateId: string,
  active: boolean
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE email_templates
      SET is_active = ${active}, updated_at = NOW()
      WHERE id = ${templateId}
    `
  })
}

/**
 * Reset template to default
 */
export async function resetTemplateToDefault(
  tenantSlug: string,
  templateId: string,
  userId?: string
): Promise<SubscriptionEmailTemplate | null> {
  return withTenant(tenantSlug, async () => {
    // Get original version (version 1)
    const originalResult = await sql`
      SELECT subject, body_html, body_text
      FROM email_template_versions
      WHERE template_id = ${templateId} AND version = 1
    `

    const original = originalResult.rows[0]
    if (!original) {
      // No version history, cannot reset
      return null
    }

    // Update to original values
    const result = await sql`
      UPDATE email_templates
      SET
        subject = ${original.subject as string},
        body_html = ${original.body_html as string},
        body_text = ${original.body_text as string | null},
        is_default = true,
        version = version + 1,
        last_edited_by = ${userId || null},
        last_edited_at = NOW(),
        updated_at = NOW()
      WHERE id = ${templateId}
      RETURNING *
    `

    const resultRow = result.rows[0]
    if (!resultRow) return null
    return mapRowToTemplate(resultRow as DbRow)
  })
}

/**
 * Get template version history
 */
export async function getTemplateVersionHistory(
  tenantSlug: string,
  templateId: string
): Promise<{
  version: number
  subject: string
  bodyHtml: string
  changedBy: string | null
  createdAt: string
}[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT version, subject, body_html, changed_by, created_at
      FROM email_template_versions
      WHERE template_id = ${templateId}
      ORDER BY version DESC
    `

    return result.rows.map((row) => ({
      version: row.version as number,
      subject: row.subject as string,
      bodyHtml: row.body_html as string,
      changedBy: row.changed_by as string | null,
      createdAt: row.created_at as string,
    }))
  })
}

/**
 * Send a test email
 */
export async function sendTestEmail(
  tenantSlug: string,
  templateId: string,
  recipientEmail: string,
  sampleData?: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  return withTenant(tenantSlug, async () => {
    // Get template
    const template = await getEmailTemplate(tenantSlug, templateId)
    if (!template) {
      return { success: false, error: 'Template not found' }
    }

    // Replace variables with sample data
    let subject = template.subject
    let bodyHtml = template.bodyHtml

    const defaultSampleData: Record<string, string> = {
      '{{customer_name}}': 'John Doe',
      '{{customer_email}}': recipientEmail,
      '{{order_number}}': 'ORD-12345',
      '{{product_name}}': 'Sample Product',
      '{{subscription_id}}': 'SUB-12345',
      '{{renewal_date}}': new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      '{{frequency}}': 'monthly',
      '{{last4}}': '4242',
      '{{exp_date}}': '12/2025',
      '{{resume_date}}': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      ...sampleData,
    }

    for (const [key, value] of Object.entries(defaultSampleData)) {
      subject = subject.replace(new RegExp(key, 'g'), value)
      bodyHtml = bodyHtml.replace(new RegExp(key, 'g'), value)
    }

    // In a real implementation, this would send via email provider
    // For now, we'll just queue it
    try {
      await sql`
        INSERT INTO email_queue (
          to_email, subject, body_html, body_text,
          from_email, from_name, template_id, status
        )
        VALUES (
          ${recipientEmail},
          ${'[TEST] ' + subject},
          ${bodyHtml},
          ${template.bodyText || null},
          ${template.senderEmail || 'noreply@example.com'},
          ${template.senderName || 'CGK Subscriptions'},
          ${templateId},
          'pending'
        )
      `
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })
}

/**
 * Preview template with sample data
 */
export function previewTemplate(
  template: SubscriptionEmailTemplate,
  sampleData?: Record<string, string>
): { subject: string; bodyHtml: string } {
  const defaultSampleData: Record<string, string> = {
    '{{customer_name}}': 'John Doe',
    '{{customer_email}}': 'john.doe@example.com',
    '{{order_number}}': 'ORD-12345',
    '{{product_name}}': 'Sample Product Subscription',
    '{{subscription_id}}': 'SUB-12345',
    '{{renewal_date}}': new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    '{{amount}}': '$29.99',
    '{{frequency}}': 'monthly',
    '{{last4}}': '4242',
    '{{exp_date}}': '12/2025',
    '{{resume_date}}': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    '{{pause_reason}}': 'Customer requested',
    '{{cancel_reason}}': 'Too expensive',
    '{{brand_name}}': 'RAWDOG',
    ...sampleData,
  }

  let subject = template.subject
  let bodyHtml = template.bodyHtml

  for (const [key, value] of Object.entries(defaultSampleData)) {
    subject = subject.replace(new RegExp(key, 'g'), value)
    bodyHtml = bodyHtml.replace(new RegExp(key, 'g'), value)
  }

  return { subject, bodyHtml }
}

/**
 * Get available template variables
 */
export function getTemplateVariables(templateKey: string): string[] {
  const commonVariables = [
    '{{customer_name}}',
    '{{customer_email}}',
    '{{subscription_id}}',
    '{{product_name}}',
    '{{frequency}}',
    '{{amount}}',
    '{{brand_name}}',
  ]

  const templateSpecificVariables: Record<string, string[]> = {
    order_confirmation: ['{{order_number}}', '{{shipping_address}}'],
    upcoming_renewal: ['{{renewal_date}}', '{{next_order_date}}'],
    payment_failed_1: ['{{retry_date}}'],
    payment_failed_2: ['{{retry_date}}'],
    payment_failed_3: ['{{cancel_date}}'],
    payment_expiring: ['{{last4}}', '{{exp_date}}'],
    paused: ['{{pause_reason}}', '{{resume_date}}'],
    resumed: [],
    cancelled: ['{{cancel_reason}}'],
    skip_confirmation: ['{{skip_date}}', '{{next_order_date}}'],
    frequency_changed: ['{{old_frequency}}', '{{new_frequency}}'],
  }

  return [...commonVariables, ...(templateSpecificVariables[templateKey] || [])]
}

// Helper function to map database row to SubscriptionEmailTemplate
function mapRowToTemplate(row: DbRow): SubscriptionEmailTemplate {
  return {
    id: row.id as string,
    notificationType: 'subscription',
    templateKey: row.template_key as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    subject: row.subject as string,
    bodyHtml: row.body_html as string,
    bodyText: (row.body_text as string | null) ?? null,
    senderName: (row.sender_name as string | null) ?? null,
    senderEmail: (row.sender_email as string | null) ?? null,
    replyToEmail: (row.reply_to_email as string | null) ?? null,
    isActive: row.is_active as boolean,
    version: row.version as number,
    isDefault: row.is_default as boolean,
    lastEditedBy: (row.last_edited_by as string | null) ?? null,
    lastEditedAt: (row.last_edited_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}
