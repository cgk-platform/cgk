/**
 * E-Sign Template Database Operations
 * CRUD operations for contract templates with tenant isolation
 */

import { sql, withTenant } from '@cgk-platform/db'
import { nanoid } from 'nanoid'
import type {
  EsignTemplate,
  EsignTemplateField,
  CreateTemplateInput,
  UpdateTemplateInput,
  CreateTemplateFieldInput,
  TemplateStatus,
  TemplateWithFields,
  ListTemplatesOptions,
  FieldValidation,
  FieldOption,
} from '../types.js'

// ============================================================================
// HELPER: Parse decimal fields from database
// Postgres DECIMAL columns return as strings, need to convert to numbers
// ============================================================================

function parseFieldDecimals(field: Record<string, unknown>): EsignTemplateField {
  return {
    ...field,
    x: parseFloat(String(field.x)),
    y: parseFloat(String(field.y)),
    width: parseFloat(String(field.width)),
    height: parseFloat(String(field.height)),
    page: parseInt(String(field.page), 10),
    signer_order: parseInt(String(field.signer_order ?? 1), 10),
    options: field.options as FieldOption[] | null,
    validation: (field.validation || {}) as FieldValidation,
  } as EsignTemplateField
}

// ============================================================================
// TEMPLATE CRUD OPERATIONS
// ============================================================================

/**
 * Create a new template
 */
export async function createTemplate(
  tenantSlug: string,
  input: CreateTemplateInput
): Promise<EsignTemplate> {
  const id = `tmpl_${nanoid(12)}`

  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO esign_templates (
        id, name, description, file_url, file_size, page_count, thumbnail_url, created_by
      ) VALUES (
        ${id},
        ${input.name},
        ${input.description || null},
        ${input.file_url},
        ${input.file_size || null},
        ${input.page_count || null},
        ${input.thumbnail_url || null},
        ${input.created_by}
      )
      RETURNING *
    `

    return result.rows[0] as EsignTemplate
  })
}

/**
 * Get a template by ID
 */
export async function getTemplate(
  tenantSlug: string,
  id: string
): Promise<EsignTemplate | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_templates WHERE id = ${id}
    `

    return (result.rows[0] as EsignTemplate) || null
  })
}

/**
 * Get a template with all its fields
 */
export async function getTemplateWithFields(
  tenantSlug: string,
  id: string
): Promise<TemplateWithFields | null> {
  return withTenant(tenantSlug, async () => {
    const templateResult = await sql`
      SELECT * FROM esign_templates WHERE id = ${id}
    `

    if (templateResult.rows.length === 0) return null

    const template = templateResult.rows[0] as EsignTemplate

    const fieldsResult = await sql`
      SELECT * FROM esign_template_fields
      WHERE template_id = ${id}
      ORDER BY page ASC, y ASC, x ASC
    `

    return {
      ...template,
      fields: fieldsResult.rows.map(parseFieldDecimals),
    }
  })
}

/**
 * List templates with optional filtering
 */
export async function listTemplates(
  tenantSlug: string,
  options?: ListTemplatesOptions
): Promise<{ templates: EsignTemplate[]; total: number }> {
  const { status = 'all', limit = 50, offset = 0, search } = options || {}

  return withTenant(tenantSlug, async () => {
    // Build dynamic query based on filters
    let whereConditions = ''
    const conditions: string[] = []

    if (status !== 'all') {
      conditions.push(`status = '${status}'`)
    }
    if (search) {
      // Escape single quotes in search term
      const escapedSearch = search.replace(/'/g, "''")
      conditions.push(`(name ILIKE '%${escapedSearch}%' OR description ILIKE '%${escapedSearch}%')`)
    }

    if (conditions.length > 0) {
      whereConditions = `WHERE ${conditions.join(' AND ')}`
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM esign_templates ${whereConditions}`
    const countResult = await sql.query(countQuery)
    const total = parseInt(countResult.rows[0].count, 10)

    // Get templates with field count
    const query = `
      SELECT t.*,
        (SELECT COUNT(*) FROM esign_template_fields WHERE template_id = t.id) as field_count
      FROM esign_templates t
      ${whereConditions}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    const result = await sql.query(query)

    return {
      templates: result.rows as EsignTemplate[],
      total,
    }
  })
}

/**
 * Update a template
 */
export async function updateTemplate(
  tenantSlug: string,
  id: string,
  input: UpdateTemplateInput
): Promise<EsignTemplate | null> {
  return withTenant(tenantSlug, async () => {
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(input.name)
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      values.push(input.description)
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      values.push(input.status)
    }
    if (input.page_count !== undefined) {
      updates.push(`page_count = $${paramIndex++}`)
      values.push(input.page_count)
    }
    if (input.thumbnail_url !== undefined) {
      updates.push(`thumbnail_url = $${paramIndex++}`)
      values.push(input.thumbnail_url)
    }

    if (updates.length === 0) {
      return getTemplate(tenantSlug, id)
    }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    const query = `
      UPDATE esign_templates
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await sql.query(query, values)
    return (result.rows[0] as EsignTemplate) || null
  })
}

/**
 * Delete a template (hard delete)
 */
export async function deleteTemplate(
  tenantSlug: string,
  id: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM esign_templates WHERE id = ${id}
    `
    return result.rowCount !== null && result.rowCount > 0
  })
}

/**
 * Archive a template (soft delete)
 */
export async function archiveTemplate(
  tenantSlug: string,
  id: string
): Promise<EsignTemplate | null> {
  return updateTemplate(tenantSlug, id, { status: 'archived' })
}

/**
 * Activate a template
 */
export async function activateTemplate(
  tenantSlug: string,
  id: string
): Promise<EsignTemplate | null> {
  return updateTemplate(tenantSlug, id, { status: 'active' })
}

/**
 * Duplicate a template with all its fields
 */
export async function duplicateTemplate(
  tenantSlug: string,
  id: string,
  newName: string,
  createdBy: string
): Promise<EsignTemplate | null> {
  const original = await getTemplateWithFields(tenantSlug, id)
  if (!original) return null

  // Create new template
  const newTemplate = await createTemplate(tenantSlug, {
    name: newName,
    description: original.description || undefined,
    file_url: original.file_url,
    file_size: original.file_size || undefined,
    page_count: original.page_count || undefined,
    thumbnail_url: original.thumbnail_url || undefined,
    created_by: createdBy,
  })

  // Copy fields
  for (const field of original.fields) {
    await createTemplateField(tenantSlug, {
      template_id: newTemplate.id,
      type: field.type,
      page: field.page,
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
      required: field.required,
      placeholder: field.placeholder || undefined,
      default_value: field.default_value || undefined,
      options: field.options || undefined,
      validation: field.validation,
      group_id: field.group_id || undefined,
      formula: field.formula || undefined,
      read_only: field.read_only,
      signer_order: field.signer_order,
    })
  }

  return newTemplate
}

// ============================================================================
// TEMPLATE FIELD OPERATIONS
// ============================================================================

/**
 * Create a field on a template
 */
export async function createTemplateField(
  tenantSlug: string,
  input: CreateTemplateFieldInput
): Promise<EsignTemplateField> {
  const id = `tfield_${nanoid(12)}`

  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO esign_template_fields (
        id, template_id, type, page, x, y, width, height,
        required, placeholder, default_value, options, validation,
        group_id, formula, read_only, signer_order
      ) VALUES (
        ${id},
        ${input.template_id},
        ${input.type},
        ${input.page},
        ${input.x},
        ${input.y},
        ${input.width},
        ${input.height},
        ${input.required ?? true},
        ${input.placeholder || null},
        ${input.default_value || null},
        ${input.options ? JSON.stringify(input.options) : null},
        ${JSON.stringify(input.validation || {})},
        ${input.group_id || null},
        ${input.formula || null},
        ${input.read_only ?? false},
        ${input.signer_order ?? 1}
      )
      RETURNING *
    `

    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to create template field')
    }
    return parseFieldDecimals(row)
  })
}

/**
 * Update a template field
 */
export async function updateTemplateField(
  tenantSlug: string,
  id: string,
  input: Partial<Omit<CreateTemplateFieldInput, 'template_id'>>
): Promise<EsignTemplateField | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE esign_template_fields SET
        type = COALESCE(${input.type ?? null}, type),
        page = COALESCE(${input.page ?? null}, page),
        x = COALESCE(${input.x ?? null}, x),
        y = COALESCE(${input.y ?? null}, y),
        width = COALESCE(${input.width ?? null}, width),
        height = COALESCE(${input.height ?? null}, height),
        required = COALESCE(${input.required ?? null}, required),
        placeholder = COALESCE(${input.placeholder ?? null}, placeholder),
        default_value = COALESCE(${input.default_value ?? null}, default_value),
        options = COALESCE(${input.options ? JSON.stringify(input.options) : null}, options),
        validation = COALESCE(${input.validation ? JSON.stringify(input.validation) : null}, validation),
        group_id = COALESCE(${input.group_id ?? null}, group_id),
        formula = COALESCE(${input.formula ?? null}, formula),
        read_only = COALESCE(${input.read_only ?? null}, read_only),
        signer_order = COALESCE(${input.signer_order ?? null}, signer_order)
      WHERE id = ${id}
      RETURNING *
    `

    return result.rows[0] ? parseFieldDecimals(result.rows[0]) : null
  })
}

/**
 * Delete a template field
 */
export async function deleteTemplateField(
  tenantSlug: string,
  id: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM esign_template_fields WHERE id = ${id}
    `
    return result.rowCount !== null && result.rowCount > 0
  })
}

/**
 * Get fields for a template
 */
export async function getTemplateFields(
  tenantSlug: string,
  templateId: string
): Promise<EsignTemplateField[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_template_fields
      WHERE template_id = ${templateId}
      ORDER BY page ASC, y ASC, x ASC
    `

    return result.rows.map(parseFieldDecimals)
  })
}

/**
 * Replace all fields on a template (bulk update)
 */
export async function replaceTemplateFields(
  tenantSlug: string,
  templateId: string,
  fields: Omit<CreateTemplateFieldInput, 'template_id'>[]
): Promise<EsignTemplateField[]> {
  return withTenant(tenantSlug, async () => {
    // Delete existing fields
    await sql`
      DELETE FROM esign_template_fields WHERE template_id = ${templateId}
    `

    // Create new fields
    const newFields: EsignTemplateField[] = []
    for (const field of fields) {
      const created = await createTemplateField(tenantSlug, {
        ...field,
        template_id: templateId,
      })
      newFields.push(created)
    }

    return newFields
  })
}

// ============================================================================
// TEMPLATE STATUS HELPERS
// ============================================================================

/**
 * Check if a template exists and is active
 */
export async function isTemplateActive(
  tenantSlug: string,
  id: string
): Promise<boolean> {
  const template = await getTemplate(tenantSlug, id)
  return template?.status === 'active'
}

/**
 * Get template counts by status
 */
export async function getTemplateCounts(
  tenantSlug: string
): Promise<Record<TemplateStatus, number>> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT status, COUNT(*) as count
      FROM esign_templates
      GROUP BY status
    `

    const counts: Record<string, number> = {
      draft: 0,
      active: 0,
      archived: 0,
    }

    for (const row of result.rows) {
      counts[row.status as string] = parseInt(row.count as string, 10)
    }

    return counts as Record<TemplateStatus, number>
  })
}
