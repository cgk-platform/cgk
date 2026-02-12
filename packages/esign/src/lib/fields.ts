/**
 * E-Sign Field Database Operations
 * CRUD operations for document fields with tenant isolation
 */

import { sql, withTenant } from '@cgk/db'
import { nanoid } from 'nanoid'
import type {
  EsignField,
  EsignTemplateField,
  CreateFieldInput,
  UpdateFieldInput,
  FieldValidation,
  FieldOption,
} from '../types.js'

// ============================================================================
// HELPER: Parse field decimals
// ============================================================================

function parseFieldDecimals(field: Record<string, unknown>): EsignField {
  return {
    ...field,
    x: parseFloat(String(field.x)),
    y: parseFloat(String(field.y)),
    width: parseFloat(String(field.width)),
    height: parseFloat(String(field.height)),
    page: parseInt(String(field.page), 10),
    options: field.options as FieldOption[] | null,
    validation: (field.validation || {}) as FieldValidation,
  } as EsignField
}

// ============================================================================
// FIELD CRUD OPERATIONS
// ============================================================================

/**
 * Create a new field on a document
 */
export async function createField(
  tenantSlug: string,
  input: CreateFieldInput
): Promise<EsignField> {
  const id = `field_${nanoid(12)}`

  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO esign_fields (
        id, document_id, signer_id, template_field_id, type, page,
        x, y, width, height, required, placeholder, default_value,
        options, validation, group_id, formula, read_only
      ) VALUES (
        ${id},
        ${input.document_id},
        ${input.signer_id || null},
        ${input.template_field_id || null},
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
        ${input.read_only ?? false}
      )
      RETURNING *
    `

    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to create field')
    }
    return parseFieldDecimals(row)
  })
}

/**
 * Get a field by ID
 */
export async function getField(
  tenantSlug: string,
  id: string
): Promise<EsignField | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_fields WHERE id = ${id}
    `

    return result.rows[0] ? parseFieldDecimals(result.rows[0]) : null
  })
}

/**
 * Get all fields for a document
 */
export async function getDocumentFields(
  tenantSlug: string,
  documentId: string
): Promise<EsignField[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_fields
      WHERE document_id = ${documentId}
      ORDER BY page ASC, y ASC, x ASC
    `

    return result.rows.map(parseFieldDecimals)
  })
}

/**
 * Get fields assigned to a specific signer
 */
export async function getSignerFields(
  tenantSlug: string,
  signerId: string
): Promise<EsignField[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_fields
      WHERE signer_id = ${signerId}
      ORDER BY page ASC, y ASC, x ASC
    `

    return result.rows.map(parseFieldDecimals)
  })
}

/**
 * Update a field
 */
export async function updateField(
  tenantSlug: string,
  id: string,
  input: UpdateFieldInput
): Promise<EsignField | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE esign_fields SET
        signer_id = COALESCE(${input.signer_id ?? null}, signer_id),
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
        value = COALESCE(${input.value ?? null}, value),
        filled_at = COALESCE(${input.filled_at?.toISOString() ?? null}, filled_at)
      WHERE id = ${id}
      RETURNING *
    `

    return result.rows[0] ? parseFieldDecimals(result.rows[0]) : null
  })
}

/**
 * Delete a field
 */
export async function deleteField(
  tenantSlug: string,
  id: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM esign_fields WHERE id = ${id}
    `
    return result.rowCount !== null && result.rowCount > 0
  })
}

/**
 * Set field value
 */
export async function setFieldValue(
  tenantSlug: string,
  id: string,
  value: string
): Promise<EsignField | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE esign_fields
      SET value = ${value}, filled_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `

    return result.rows[0] ? parseFieldDecimals(result.rows[0]) : null
  })
}

/**
 * Clear field value
 */
export async function clearFieldValue(
  tenantSlug: string,
  id: string
): Promise<EsignField | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE esign_fields
      SET value = NULL, filled_at = NULL
      WHERE id = ${id}
      RETURNING *
    `

    return result.rows[0] ? parseFieldDecimals(result.rows[0]) : null
  })
}

/**
 * Set multiple field values at once
 */
export async function setFieldValues(
  tenantSlug: string,
  fields: Array<{ id: string; value: string }>
): Promise<EsignField[]> {
  return withTenant(tenantSlug, async () => {
    const results: EsignField[] = []

    for (const { id, value } of fields) {
      const result = await sql`
        UPDATE esign_fields
        SET value = ${value}, filled_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `
      if (result.rows[0]) {
        results.push(parseFieldDecimals(result.rows[0]))
      }
    }

    return results
  })
}

// ============================================================================
// COPY FIELDS FROM TEMPLATE
// ============================================================================

/**
 * Copy fields from a template to a document
 * Maps template fields to document fields and assigns to signer
 */
export async function copyFieldsFromTemplate(
  tenantSlug: string,
  templateId: string,
  documentId: string,
  signerMapping: Record<number, string> // signerOrder -> signerId
): Promise<EsignField[]> {
  return withTenant(tenantSlug, async () => {
    // Get template fields
    const templateFieldsResult = await sql`
      SELECT * FROM esign_template_fields
      WHERE template_id = ${templateId}
      ORDER BY page ASC, y ASC, x ASC
    `

    const templateFields = templateFieldsResult.rows as unknown as EsignTemplateField[]
    const createdFields: EsignField[] = []

    for (const tf of templateFields) {
      const signerId = signerMapping[tf.signer_order] || null
      const fieldId = `field_${nanoid(12)}`

      const result = await sql`
        INSERT INTO esign_fields (
          id, document_id, signer_id, template_field_id, type, page,
          x, y, width, height, required, placeholder, default_value,
          options, validation, group_id, formula, read_only
        ) VALUES (
          ${fieldId},
          ${documentId},
          ${signerId},
          ${tf.id},
          ${tf.type},
          ${tf.page},
          ${tf.x},
          ${tf.y},
          ${tf.width},
          ${tf.height},
          ${tf.required},
          ${tf.placeholder},
          ${tf.default_value},
          ${tf.options ? JSON.stringify(tf.options) : null},
          ${JSON.stringify(tf.validation || {})},
          ${tf.group_id},
          ${tf.formula},
          ${tf.read_only}
        )
        RETURNING *
      `

      if (result.rows[0]) {
        createdFields.push(parseFieldDecimals(result.rows[0]))
      }
    }

    return createdFields
  })
}

// ============================================================================
// FIELD VALIDATION
// ============================================================================

/**
 * Check if all required fields for a signer are filled
 */
export async function areRequiredFieldsFilled(
  tenantSlug: string,
  signerId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT COUNT(*) as unfilled
      FROM esign_fields
      WHERE signer_id = ${signerId}
        AND required = true
        AND (value IS NULL OR value = '')
    `

    const row = result.rows[0]
    return row ? parseInt(row.unfilled as string, 10) === 0 : true
  })
}

/**
 * Check if all required fields for a document are filled
 */
export async function areDocumentFieldsFilled(
  tenantSlug: string,
  documentId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT COUNT(*) as unfilled
      FROM esign_fields
      WHERE document_id = ${documentId}
        AND required = true
        AND (value IS NULL OR value = '')
    `

    const row = result.rows[0]
    return row ? parseInt(row.unfilled as string, 10) === 0 : true
  })
}

/**
 * Get unfilled required fields for a signer
 */
export async function getUnfilledRequiredFields(
  tenantSlug: string,
  signerId: string
): Promise<EsignField[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_fields
      WHERE signer_id = ${signerId}
        AND required = true
        AND (value IS NULL OR value = '')
      ORDER BY page ASC, y ASC, x ASC
    `

    return result.rows.map(parseFieldDecimals)
  })
}

/**
 * Get field completion stats for a document
 */
export async function getFieldStats(
  tenantSlug: string,
  documentId: string
): Promise<{
  total: number
  filled: number
  required: number
  requiredFilled: number
}> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE value IS NOT NULL AND value != '') as filled,
        COUNT(*) FILTER (WHERE required = true) as required,
        COUNT(*) FILTER (WHERE required = true AND value IS NOT NULL AND value != '') as required_filled
      FROM esign_fields
      WHERE document_id = ${documentId}
    `

    const row = result.rows[0]
    if (!row) {
      return { total: 0, filled: 0, required: 0, requiredFilled: 0 }
    }
    return {
      total: parseInt(row.total as string, 10),
      filled: parseInt(row.filled as string, 10),
      required: parseInt(row.required as string, 10),
      requiredFilled: parseInt(row.required_filled as string, 10),
    }
  })
}

// ============================================================================
// FIELD GROUPING
// ============================================================================

/**
 * Get fields by group
 */
export async function getFieldsByGroup(
  tenantSlug: string,
  documentId: string,
  groupId: string
): Promise<EsignField[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM esign_fields
      WHERE document_id = ${documentId}
        AND group_id = ${groupId}
      ORDER BY page ASC, y ASC, x ASC
    `

    return result.rows.map(parseFieldDecimals)
  })
}

/**
 * Get unique group IDs for a document
 */
export async function getFieldGroups(
  tenantSlug: string,
  documentId: string
): Promise<string[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT DISTINCT group_id
      FROM esign_fields
      WHERE document_id = ${documentId}
        AND group_id IS NOT NULL
      ORDER BY group_id
    `

    return result.rows.map((r) => r.group_id as string)
  })
}
