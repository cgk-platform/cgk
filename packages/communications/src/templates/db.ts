/**
 * Email Template Database Operations
 *
 * CRUD operations for email templates with tenant isolation.
 *
 * @ai-pattern email-templates
 * @ai-required All operations use tenant context
 */

import { sql, withTenant } from '@cgk/db'

import { getDefaultTemplate, getAllDefaultTemplates } from './defaults.js'
import type {
  CreateTemplateInput,
  EmailTemplate,
  EmailTemplateVersion,
  TemplateFilters,
  UpdateTemplateInput,
} from './types.js'

/**
 * Convert database row to EmailTemplate
 */
function rowToTemplate(row: Record<string, unknown>): EmailTemplate {
  return {
    id: row.id as string,
    notificationType: row.notification_type as string,
    templateKey: row.template_key as string,
    category: row.category as 'transactional' | 'marketing',
    name: row.name as string,
    description: row.description as string | null,
    subject: row.subject as string,
    bodyHtml: row.body_html as string,
    bodyText: row.body_text as string | null,
    senderAddressId: row.sender_address_id as string | null,
    senderName: row.sender_name as string | null,
    senderEmail: row.sender_email as string | null,
    replyToEmail: row.reply_to_email as string | null,
    isActive: row.is_active as boolean,
    version: row.version as number,
    isDefault: row.is_default as boolean,
    lastEditedBy: row.last_edited_by as string | null,
    lastEditedAt: row.last_edited_at ? new Date(row.last_edited_at as string) : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Convert database row to EmailTemplateVersion
 */
function rowToVersion(row: Record<string, unknown>): EmailTemplateVersion {
  return {
    id: row.id as string,
    templateId: row.template_id as string,
    version: row.version as number,
    subject: row.subject as string,
    bodyHtml: row.body_html as string,
    bodyText: row.body_text as string | null,
    changedBy: row.changed_by as string | null,
    changeNote: row.change_note as string | null,
    createdAt: new Date(row.created_at as string),
  }
}

/**
 * Get all templates for a tenant
 */
export async function getTemplates(
  tenantSlug: string,
  filters?: TemplateFilters
): Promise<EmailTemplate[]> {
  return withTenant(tenantSlug, async () => {
    // Simple query without dynamic building for TypeScript compatibility
    const result = await sql`
      SELECT * FROM email_templates
      ORDER BY category, notification_type, template_key
    `

    let templates = result.rows.map((row) => rowToTemplate(row as Record<string, unknown>))

    // Apply filters in memory for simplicity
    if (filters?.category) {
      templates = templates.filter((t) => t.category === filters.category)
    }

    if (filters?.notificationType) {
      templates = templates.filter((t) => t.notificationType === filters.notificationType)
    }

    if (filters?.isActive !== undefined) {
      templates = templates.filter((t) => t.isActive === filters.isActive)
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          (t.description && t.description.toLowerCase().includes(searchLower))
      )
    }

    return templates
  })
}

/**
 * Get a template by notification type and key
 */
export async function getTemplate(
  tenantSlug: string,
  notificationType: string,
  templateKey?: string
): Promise<EmailTemplate | null> {
  const key = templateKey || notificationType

  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM email_templates
      WHERE notification_type = ${notificationType}
        AND template_key = ${key}
    `

    if (result.rows.length === 0) {
      return null
    }

    return rowToTemplate(result.rows[0] as Record<string, unknown>)
  })
}

/**
 * Get a template by ID
 */
export async function getTemplateById(
  tenantSlug: string,
  templateId: string
): Promise<EmailTemplate | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM email_templates
      WHERE id = ${templateId}
    `

    if (result.rows.length === 0) {
      return null
    }

    return rowToTemplate(result.rows[0] as Record<string, unknown>)
  })
}

/**
 * Get template for tenant with fallback to default
 */
export async function getTemplateForTenant(
  tenantSlug: string,
  notificationType: string,
  templateKey?: string
): Promise<EmailTemplate | null> {
  // First try to get tenant's custom template
  const template = await getTemplate(tenantSlug, notificationType, templateKey)

  if (template) {
    return template
  }

  // Fall back to system default
  const defaultTemplate = getDefaultTemplate(notificationType, templateKey)

  if (!defaultTemplate) {
    return null
  }

  // Return a virtual template from defaults
  return {
    id: `default_${notificationType}_${templateKey || notificationType}`,
    notificationType: defaultTemplate.notificationType,
    templateKey: defaultTemplate.templateKey,
    category: defaultTemplate.category,
    name: defaultTemplate.name,
    description: defaultTemplate.description,
    subject: defaultTemplate.subject,
    bodyHtml: defaultTemplate.bodyHtml,
    bodyText: null,
    senderAddressId: null,
    senderName: null,
    senderEmail: null,
    replyToEmail: null,
    isActive: true,
    version: 0,
    isDefault: true,
    lastEditedBy: null,
    lastEditedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Create a new template
 */
export async function createTemplate(
  tenantSlug: string,
  input: CreateTemplateInput,
  userId?: string
): Promise<EmailTemplate> {
  return withTenant(tenantSlug, async () => {
    const now = new Date().toISOString()
    const result = await sql`
      INSERT INTO email_templates (
        notification_type,
        template_key,
        category,
        name,
        description,
        subject,
        body_html,
        body_text,
        sender_address_id,
        sender_name,
        sender_email,
        reply_to_email,
        is_default,
        last_edited_by,
        last_edited_at
      ) VALUES (
        ${input.notificationType},
        ${input.templateKey},
        ${input.category || 'transactional'},
        ${input.name},
        ${input.description || null},
        ${input.subject},
        ${input.bodyHtml},
        ${input.bodyText || null},
        ${input.senderAddressId || null},
        ${input.senderName || null},
        ${input.senderEmail || null},
        ${input.replyToEmail || null},
        ${input.isDefault || false},
        ${userId || null},
        ${userId ? now : null}
      )
      RETURNING *
    `

    const template = rowToTemplate(result.rows[0] as Record<string, unknown>)

    // Create initial version
    await sql`
      INSERT INTO email_template_versions (
        template_id,
        version,
        subject,
        body_html,
        body_text,
        changed_by,
        change_note
      ) VALUES (
        ${template.id},
        1,
        ${template.subject},
        ${template.bodyHtml},
        ${template.bodyText || null},
        ${userId || null},
        ${'Initial version'}
      )
    `

    return template
  })
}

/**
 * Update a template
 */
export async function updateTemplate(
  tenantSlug: string,
  templateId: string,
  input: UpdateTemplateInput,
  userId?: string
): Promise<EmailTemplate> {
  // Get current template
  const current = await getTemplateById(tenantSlug, templateId)
  if (!current) {
    throw new Error(`Template ${templateId} not found`)
  }

  // Check if content changed
  const contentChanged =
    (input.subject !== undefined && input.subject !== current.subject) ||
    (input.bodyHtml !== undefined && input.bodyHtml !== current.bodyHtml) ||
    (input.bodyText !== undefined && input.bodyText !== current.bodyText)

  // Increment version if content changed
  const newVersion = contentChanged ? current.version + 1 : current.version

  return withTenant(tenantSlug, async () => {
    // Use explicit values for each field
    const name = input.name !== undefined ? input.name : current.name
    const description = input.description !== undefined ? input.description : current.description
    const subject = input.subject !== undefined ? input.subject : current.subject
    const bodyHtml = input.bodyHtml !== undefined ? input.bodyHtml : current.bodyHtml
    const bodyText = input.bodyText !== undefined ? input.bodyText : current.bodyText
    const senderAddressId = input.senderAddressId !== undefined ? input.senderAddressId : current.senderAddressId
    const senderName = input.senderName !== undefined ? input.senderName : current.senderName
    const senderEmail = input.senderEmail !== undefined ? input.senderEmail : current.senderEmail
    const replyToEmail = input.replyToEmail !== undefined ? input.replyToEmail : current.replyToEmail
    const isActive = input.isActive !== undefined ? input.isActive : current.isActive

    const result = await sql`
      UPDATE email_templates
      SET
        name = ${name},
        description = ${description || null},
        subject = ${subject},
        body_html = ${bodyHtml},
        body_text = ${bodyText || null},
        sender_address_id = ${senderAddressId || null},
        sender_name = ${senderName || null},
        sender_email = ${senderEmail || null},
        reply_to_email = ${replyToEmail || null},
        is_active = ${isActive},
        version = ${newVersion},
        is_default = false,
        last_edited_by = ${userId || null},
        last_edited_at = NOW()
      WHERE id = ${templateId}
      RETURNING *
    `

    const template = rowToTemplate(result.rows[0] as Record<string, unknown>)

    // Create version history if content changed
    if (contentChanged) {
      await sql`
        INSERT INTO email_template_versions (
          template_id,
          version,
          subject,
          body_html,
          body_text,
          changed_by,
          change_note
        ) VALUES (
          ${templateId},
          ${newVersion},
          ${template.subject},
          ${template.bodyHtml},
          ${template.bodyText || null},
          ${userId || null},
          ${input.changeNote || null}
        )
      `
    }

    return template
  })
}

/**
 * Delete a template
 */
export async function deleteTemplate(
  tenantSlug: string,
  templateId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM email_templates
      WHERE id = ${templateId}
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Reset a template to system default
 */
export async function resetToDefault(
  tenantSlug: string,
  notificationType: string,
  templateKey?: string,
  userId?: string
): Promise<EmailTemplate | null> {
  const key = templateKey || notificationType
  const defaultTemplate = getDefaultTemplate(notificationType, key)

  if (!defaultTemplate) {
    return null
  }

  // Get current template
  const current = await getTemplate(tenantSlug, notificationType, key)

  if (!current) {
    // Create new from default
    return createTemplate(
      tenantSlug,
      {
        notificationType: defaultTemplate.notificationType,
        templateKey: defaultTemplate.templateKey,
        category: defaultTemplate.category,
        name: defaultTemplate.name,
        description: defaultTemplate.description,
        subject: defaultTemplate.subject,
        bodyHtml: defaultTemplate.bodyHtml,
        isDefault: true,
      },
      userId
    )
  }

  // Update existing to default content
  const newVersion = current.version + 1

  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE email_templates
      SET
        name = ${defaultTemplate.name},
        description = ${defaultTemplate.description},
        subject = ${defaultTemplate.subject},
        body_html = ${defaultTemplate.bodyHtml},
        body_text = ${null},
        version = ${newVersion},
        is_default = true,
        last_edited_by = ${userId || null},
        last_edited_at = NOW()
      WHERE id = ${current.id}
      RETURNING *
    `

    const template = rowToTemplate(result.rows[0] as Record<string, unknown>)

    // Create version history
    await sql`
      INSERT INTO email_template_versions (
        template_id,
        version,
        subject,
        body_html,
        body_text,
        changed_by,
        change_note
      ) VALUES (
        ${current.id},
        ${newVersion},
        ${template.subject},
        ${template.bodyHtml},
        ${template.bodyText || null},
        ${userId || null},
        ${'Reset to default'}
      )
    `

    return template
  })
}

/**
 * Get version history for a template
 */
export async function getTemplateVersions(
  tenantSlug: string,
  templateId: string
): Promise<EmailTemplateVersion[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM email_template_versions
      WHERE template_id = ${templateId}
      ORDER BY version DESC
    `
    return result.rows.map((row) => rowToVersion(row as Record<string, unknown>))
  })
}

/**
 * Get a specific version
 */
export async function getTemplateVersion(
  tenantSlug: string,
  templateId: string,
  version: number
): Promise<EmailTemplateVersion | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM email_template_versions
      WHERE template_id = ${templateId}
        AND version = ${version}
    `

    if (result.rows.length === 0) {
      return null
    }

    return rowToVersion(result.rows[0] as Record<string, unknown>)
  })
}

/**
 * Restore a template to a previous version
 */
export async function restoreVersion(
  tenantSlug: string,
  templateId: string,
  version: number,
  userId?: string
): Promise<EmailTemplate> {
  const targetVersion = await getTemplateVersion(tenantSlug, templateId, version)

  if (!targetVersion) {
    throw new Error(`Version ${version} not found for template ${templateId}`)
  }

  return updateTemplate(
    tenantSlug,
    templateId,
    {
      subject: targetVersion.subject,
      bodyHtml: targetVersion.bodyHtml,
      bodyText: targetVersion.bodyText || undefined,
      changeNote: `Restored from version ${version}`,
    },
    userId
  )
}

/**
 * Seed default templates for a tenant
 */
export async function seedDefaultTemplates(
  tenantSlug: string
): Promise<EmailTemplate[]> {
  const defaults = getAllDefaultTemplates()
  const templates: EmailTemplate[] = []

  for (const defaultTemplate of defaults) {
    // Check if template already exists
    const existing = await getTemplate(
      tenantSlug,
      defaultTemplate.notificationType,
      defaultTemplate.templateKey
    )

    if (!existing) {
      const template = await createTemplate(tenantSlug, {
        notificationType: defaultTemplate.notificationType,
        templateKey: defaultTemplate.templateKey,
        category: defaultTemplate.category,
        name: defaultTemplate.name,
        description: defaultTemplate.description,
        subject: defaultTemplate.subject,
        bodyHtml: defaultTemplate.bodyHtml,
        isDefault: true,
      })
      templates.push(template)
    }
  }

  return templates
}
