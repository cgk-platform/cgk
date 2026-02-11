/**
 * E-Signature Template Data Layer
 *
 * Functions for managing e-signature templates.
 */

import { sql, withTenant } from '@cgk/db'
import type {
  EsignTemplate,
  EsignTemplateWithFields,
  EsignTemplateField,
  EsignTemplateStatus,
} from './types'

/**
 * List templates with optional filtering
 */
export async function listTemplates(
  tenantSlug: string,
  options: {
    status?: EsignTemplateStatus
    page?: number
    limit?: number
  } = {}
): Promise<{ templates: EsignTemplate[]; total: number }> {
  const { page = 1, limit = 20, status } = options
  const offset = (page - 1) * limit

  return withTenant(tenantSlug, async () => {
    const statusCondition = status ? sql`AND status = ${status}` : sql``

    const countResult = await sql`
      SELECT COUNT(*) as count
      FROM esign_templates
      WHERE 1=1 ${statusCondition}
    `
    const total = Number(countResult.rows[0]?.count || 0)

    const result = await sql`
      SELECT
        id,
        name,
        description,
        file_url as "fileUrl",
        file_size as "fileSize",
        page_count as "pageCount",
        thumbnail_url as "thumbnailUrl",
        status,
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM esign_templates
      WHERE 1=1 ${statusCondition}
      ORDER BY updated_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    return {
      templates: result.rows as unknown as EsignTemplate[],
      total,
    }
  })
}

/**
 * Get template by ID
 */
export async function getTemplate(
  tenantSlug: string,
  templateId: string
): Promise<EsignTemplate | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id,
        name,
        description,
        file_url as "fileUrl",
        file_size as "fileSize",
        page_count as "pageCount",
        thumbnail_url as "thumbnailUrl",
        status,
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM esign_templates
      WHERE id = ${templateId}
    `
    return result.rows.length > 0 ? (result.rows[0] as unknown as EsignTemplate) : null
  })
}

/**
 * Get template with fields
 */
export async function getTemplateWithFields(
  tenantSlug: string,
  templateId: string
): Promise<EsignTemplateWithFields | null> {
  return withTenant(tenantSlug, async () => {
    const template = await getTemplate(tenantSlug, templateId)
    if (!template) return null

    const fieldsResult = await sql`
      SELECT
        id,
        template_id as "templateId",
        type,
        page,
        x,
        y,
        width,
        height,
        required,
        placeholder,
        default_value as "defaultValue",
        options,
        validation,
        group_id as "groupId",
        formula,
        read_only as "readOnly",
        signer_order as "signerOrder",
        created_at as "createdAt"
      FROM esign_template_fields
      WHERE template_id = ${templateId}
      ORDER BY page ASC, y ASC, x ASC
    `

    return {
      ...template,
      fields: fieldsResult.rows as unknown as EsignTemplateField[],
    }
  })
}

/**
 * Get template usage stats
 */
export async function getTemplateStats(
  tenantSlug: string,
  templateId: string
): Promise<{
  documentCount: number
  completedCount: number
  pendingCount: number
  lastUsed: Date | null
}> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*) as "documentCount",
        COUNT(*) FILTER (WHERE status = 'completed') as "completedCount",
        COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress')) as "pendingCount",
        MAX(created_at) as "lastUsed"
      FROM esign_documents
      WHERE template_id = ${templateId}
    `

    const row = result.rows[0]
    return {
      documentCount: Number(row?.documentCount || 0),
      completedCount: Number(row?.completedCount || 0),
      pendingCount: Number(row?.pendingCount || 0),
      lastUsed: row?.lastUsed ? new Date(row.lastUsed as string) : null,
    }
  })
}

/**
 * Get all active templates for selection
 */
export async function getActiveTemplates(
  tenantSlug: string
): Promise<Array<{ id: string; name: string; pageCount: number | null }>> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT id, name, page_count as "pageCount"
      FROM esign_templates
      WHERE status = 'active'
      ORDER BY name ASC
    `
    return result.rows as unknown as Array<{ id: string; name: string; pageCount: number | null }>
  })
}

/**
 * Get template field count
 */
export async function getTemplateFieldCount(
  tenantSlug: string,
  templateId: string
): Promise<number> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM esign_template_fields
      WHERE template_id = ${templateId}
    `
    return Number(result.rows[0]?.count || 0)
  })
}

/**
 * Duplicate a template
 */
export async function duplicateTemplate(
  tenantSlug: string,
  templateId: string,
  newName: string,
  createdBy: string
): Promise<EsignTemplate | null> {
  return withTenant(tenantSlug, async () => {
    const original = await getTemplateWithFields(tenantSlug, templateId)
    if (!original) return null

    // Create new template
    const newId = `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const result = await sql`
      INSERT INTO esign_templates (
        id, name, description, file_url, file_size, page_count,
        thumbnail_url, status, created_by
      ) VALUES (
        ${newId},
        ${newName},
        ${original.description},
        ${original.fileUrl},
        ${original.fileSize},
        ${original.pageCount},
        ${original.thumbnailUrl},
        'draft',
        ${createdBy}
      )
      RETURNING
        id,
        name,
        description,
        file_url as "fileUrl",
        file_size as "fileSize",
        page_count as "pageCount",
        thumbnail_url as "thumbnailUrl",
        status,
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `

    // Copy fields
    for (const field of original.fields) {
      const fieldId = `fld_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await sql`
        INSERT INTO esign_template_fields (
          id, template_id, type, page, x, y, width, height,
          required, placeholder, default_value, options, validation,
          group_id, formula, read_only, signer_order
        ) VALUES (
          ${fieldId},
          ${newId},
          ${field.type},
          ${field.page},
          ${field.x},
          ${field.y},
          ${field.width},
          ${field.height},
          ${field.required},
          ${field.placeholder},
          ${field.defaultValue},
          ${field.options ? JSON.stringify(field.options) : null},
          ${JSON.stringify(field.validation)},
          ${field.groupId},
          ${field.formula},
          ${field.readOnly},
          ${field.signerOrder}
        )
      `
    }

    return result.rows[0] as unknown as EsignTemplate
  })
}

/**
 * Archive a template
 */
export async function archiveTemplate(
  tenantSlug: string,
  templateId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE esign_templates
      SET status = 'archived'
      WHERE id = ${templateId}
      RETURNING id
    `
    return result.rows.length > 0
  })
}

/**
 * Activate a template
 */
export async function activateTemplate(
  tenantSlug: string,
  templateId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE esign_templates
      SET status = 'active'
      WHERE id = ${templateId}
      RETURNING id
    `
    return result.rows.length > 0
  })
}
