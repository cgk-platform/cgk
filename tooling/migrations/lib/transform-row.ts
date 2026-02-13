/**
 * Row Transformation Utilities
 *
 * Per-table transformation logic for migrating RAWDOG data
 * to the new CGK multi-tenant schema.
 */

import { encryptSensitiveColumns } from './encryption.js'

/**
 * Generic row type from database
 */
export type DatabaseRow = Record<string, unknown>

/**
 * Transformation context with metadata
 */
export interface TransformContext {
  /** Source table name */
  sourceTable: string
  /** Target table name */
  targetTable: string
  /** Tenant slug for the migration */
  tenantSlug: string
  /** Whether to encrypt sensitive columns */
  encryptSensitive: boolean
  /** Specific columns to encrypt (overrides auto-detection) */
  sensitiveColumns?: string[] | undefined
}

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

/**
 * Convert camelCase to snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

/**
 * Normalize a value to ensure it's suitable for PostgreSQL
 */
function normalizeValue(value: unknown, key: string): unknown {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return null
  }

  // Handle dates - convert to ISO string
  if (value instanceof Date) {
    return value.toISOString()
  }

  // Handle BigInt - convert to string for JSON compatibility
  if (typeof value === 'bigint') {
    return value.toString()
  }

  // Handle arrays - ensure proper format
  if (Array.isArray(value)) {
    return value
  }

  // Handle objects (JSONB columns)
  if (typeof value === 'object') {
    return value
  }

  // Handle cents columns - ensure integer
  if (key.endsWith('_cents') && typeof value === 'number') {
    return Math.round(value)
  }

  // Handle percentage columns - ensure proper float
  if (
    (key.endsWith('_pct') || key.endsWith('_percent') || key.endsWith('_rate')) &&
    typeof value === 'string'
  ) {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? null : parsed
  }

  return value
}

/**
 * Generic row transformation - normalizes all values
 */
function transformGenericRow(row: DatabaseRow, _context: TransformContext): DatabaseRow {
  const transformed: DatabaseRow = {}

  for (const [key, value] of Object.entries(row)) {
    transformed[key] = normalizeValue(value, key)
  }

  return transformed
}

/**
 * Transform order row
 * - Normalize gross_sales_cents to integer
 * - Ensure line_items is valid JSON
 * - Normalize status values
 */
function transformOrderRow(row: DatabaseRow): DatabaseRow {
  const transformed = { ...row }

  // Normalize gross_sales_cents / total_cents
  if ('gross_sales_cents' in transformed) {
    const value = transformed['gross_sales_cents']
    if (typeof value === 'string') {
      transformed['gross_sales_cents'] = parseInt(value, 10) || 0
    } else if (typeof value === 'number') {
      transformed['gross_sales_cents'] = Math.round(value)
    }
  }

  if ('total_cents' in transformed) {
    const value = transformed['total_cents']
    if (typeof value === 'string') {
      transformed['total_cents'] = parseInt(value, 10) || 0
    } else if (typeof value === 'number') {
      transformed['total_cents'] = Math.round(value)
    }
  }

  // Ensure line_items is an array
  if ('line_items' in transformed) {
    const lineItems = transformed['line_items']
    if (typeof lineItems === 'string') {
      try {
        transformed['line_items'] = JSON.parse(lineItems)
      } catch {
        transformed['line_items'] = []
      }
    } else if (!Array.isArray(lineItems)) {
      transformed['line_items'] = []
    }
  }

  // Normalize status enum values
  const statusFields = ['status', 'fulfillment_status', 'financial_status']
  for (const field of statusFields) {
    if (field in transformed && typeof transformed[field] === 'string') {
      transformed[field] = (transformed[field] as string).toLowerCase()
    }
  }

  return transformed
}

/**
 * Transform creator row
 * - Normalize commission_percent to float
 * - Ensure social_profiles is valid JSON
 * - Handle tier normalization
 */
function transformCreatorRow(row: DatabaseRow): DatabaseRow {
  const transformed = { ...row }

  // Normalize commission_rate_pct
  if ('commission_rate' in transformed || 'commission_percent' in transformed) {
    const rate = transformed['commission_rate'] ?? transformed['commission_percent']
    if (typeof rate === 'string') {
      const parsed = parseFloat(rate)
      transformed['commission_rate_pct'] = isNaN(parsed) ? 10.0 : parsed
    } else if (typeof rate === 'number') {
      transformed['commission_rate_pct'] = rate
    }
    // Clean up old column names
    delete transformed['commission_rate']
    delete transformed['commission_percent']
  }

  // Ensure social_profiles is an object
  if ('social_profiles' in transformed) {
    const profiles = transformed['social_profiles']
    if (typeof profiles === 'string') {
      try {
        transformed['social_profiles'] = JSON.parse(profiles)
      } catch {
        transformed['social_profiles'] = {}
      }
    } else if (profiles === null || profiles === undefined) {
      transformed['social_profiles'] = {}
    }
  }

  // Normalize tier to lowercase
  if ('tier' in transformed && typeof transformed['tier'] === 'string') {
    transformed['tier'] = (transformed['tier'] as string).toLowerCase()
  }

  // Normalize status to lowercase
  if ('status' in transformed && typeof transformed['status'] === 'string') {
    transformed['status'] = (transformed['status'] as string).toLowerCase()
  }

  return transformed
}

/**
 * Transform withdrawal request to payout
 * Maps RAWDOG withdrawal_requests schema to CGK payouts schema
 */
function transformWithdrawalRequestRow(row: DatabaseRow): DatabaseRow {
  const transformed: DatabaseRow = {}

  // Direct mappings
  transformed['id'] = row['id']
  transformed['creator_id'] = row['creator_id']
  transformed['amount_cents'] = row['amount_cents'] ?? row['amount']
  transformed['currency'] = row['currency'] ?? 'USD'
  transformed['created_at'] = row['created_at']
  transformed['updated_at'] = row['updated_at'] ?? row['created_at']

  // Map status
  const status = (row['status'] as string)?.toLowerCase() ?? 'pending'
  const statusMap: Record<string, string> = {
    requested: 'pending',
    pending: 'pending',
    processing: 'processing',
    approved: 'completed',
    completed: 'completed',
    paid: 'completed',
    rejected: 'failed',
    failed: 'failed',
    cancelled: 'cancelled',
  }
  transformed['status'] = statusMap[status] ?? 'pending'

  // Map method
  const method = (row['method'] as string)?.toLowerCase() ?? 'manual'
  transformed['method'] = method === 'paypal' ? 'paypal' : method === 'stripe' ? 'stripe' : 'manual'

  // Calculate net amount (assuming no fees if not specified)
  const feeCents = (row['fee_cents'] as number) ?? 0
  const amountCents = (transformed['amount_cents'] as number) ?? 0
  transformed['fee_cents'] = feeCents
  transformed['net_amount_cents'] = amountCents - feeCents

  // Timestamps based on status
  if (transformed['status'] === 'completed') {
    transformed['completed_at'] = row['completed_at'] ?? row['updated_at']
  }
  if (transformed['status'] === 'failed') {
    transformed['failed_at'] = row['failed_at'] ?? row['updated_at']
    transformed['failure_reason'] = row['failure_reason'] ?? row['rejection_reason']
  }

  // Notes
  transformed['notes'] = row['notes'] ?? row['admin_notes']

  // Payout details snapshot
  if (row['payout_details'] || row['bank_details']) {
    transformed['payout_details'] = row['payout_details'] ?? row['bank_details']
  }

  return transformed
}

/**
 * Transform review row
 * - Ensure proper rating range
 * - Normalize status values
 */
function transformReviewRow(row: DatabaseRow): DatabaseRow {
  const transformed = { ...row }

  // Ensure rating is within 1-5 range
  if ('rating' in transformed) {
    const rating = transformed['rating']
    if (typeof rating === 'number') {
      transformed['rating'] = Math.max(1, Math.min(5, Math.round(rating)))
    } else if (typeof rating === 'string') {
      const parsed = parseInt(rating, 10)
      transformed['rating'] = isNaN(parsed) ? 5 : Math.max(1, Math.min(5, parsed))
    }
  }

  // Normalize status
  if ('status' in transformed && typeof transformed['status'] === 'string') {
    const status = (transformed['status'] as string).toLowerCase()
    const validStatuses = ['pending', 'approved', 'rejected', 'spam']
    transformed['status'] = validStatuses.includes(status) ? status : 'pending'
  }

  return transformed
}

/**
 * Transform blog post row
 * - Ensure proper status values
 * - Handle body_html generation if missing
 */
function transformBlogPostRow(row: DatabaseRow): DatabaseRow {
  const transformed = { ...row }

  // Normalize status
  if ('status' in transformed && typeof transformed['status'] === 'string') {
    const status = (transformed['status'] as string).toLowerCase()
    const validStatuses = ['draft', 'scheduled', 'published', 'archived']
    transformed['status'] = validStatuses.includes(status) ? status : 'draft'
  }

  // Ensure tags is an array
  if ('tags' in transformed && typeof transformed['tags'] === 'string') {
    try {
      transformed['tags'] = JSON.parse(transformed['tags'] as string)
    } catch {
      transformed['tags'] = []
    }
  }

  return transformed
}

/**
 * Transform attribution touchpoint row
 * - Ensure proper channel/source values
 * - Normalize timestamps
 */
function transformAttributionTouchpointRow(row: DatabaseRow): DatabaseRow {
  const transformed = { ...row }

  // Ensure tenant_id is set (will be handled by insert, but we normalize here)
  // Note: tenant_id will be added during insert based on context

  // Normalize channel to lowercase
  if ('channel' in transformed && typeof transformed['channel'] === 'string') {
    transformed['channel'] = (transformed['channel'] as string).toLowerCase()
  }

  // Normalize touchpoint_type
  if ('touchpoint_type' in transformed && typeof transformed['touchpoint_type'] === 'string') {
    transformed['touchpoint_type'] = (transformed['touchpoint_type'] as string).toLowerCase()
  }

  return transformed
}

/**
 * Transform e-sign document row
 * - Normalize status values
 * - Handle encrypted access tokens
 */
function transformEsignDocumentRow(row: DatabaseRow): DatabaseRow {
  const transformed = { ...row }

  // Normalize status
  if ('status' in transformed && typeof transformed['status'] === 'string') {
    const status = (transformed['status'] as string).toLowerCase()
    const validStatuses = ['draft', 'pending', 'in_progress', 'completed', 'declined', 'voided', 'expired']
    transformed['status'] = validStatuses.includes(status) ? status : 'draft'
  }

  return transformed
}

/**
 * Get the appropriate transformation function for a table
 */
export function getTransformFunction(
  tableName: string
): ((row: DatabaseRow) => DatabaseRow) | null {
  const transformers: Record<string, (row: DatabaseRow) => DatabaseRow> = {
    orders: transformOrderRow,
    creators: transformCreatorRow,
    withdrawal_requests: transformWithdrawalRequestRow,
    payouts: transformWithdrawalRequestRow, // Alias
    reviews: transformReviewRow,
    blog_posts: transformBlogPostRow,
    attribution_touchpoints: transformAttributionTouchpointRow,
    esign_documents: transformEsignDocumentRow,
  }

  return transformers[tableName] ?? null
}

/**
 * Main row transformation function
 *
 * Applies generic normalization, table-specific transformations,
 * and encryption for sensitive columns.
 */
export function transformRow(row: DatabaseRow, context: TransformContext): DatabaseRow {
  // Step 1: Apply generic normalization
  let transformed = transformGenericRow(row, context)

  // Step 2: Apply table-specific transformation
  const tableTransformer = getTransformFunction(context.sourceTable)
  if (tableTransformer) {
    transformed = tableTransformer(transformed)
  }

  // Step 3: Encrypt sensitive columns if enabled
  if (context.encryptSensitive) {
    transformed = encryptSensitiveColumns(transformed, context.sensitiveColumns)
  }

  return transformed
}

/**
 * Transform a batch of rows
 */
export function transformBatch(
  rows: DatabaseRow[],
  context: TransformContext
): DatabaseRow[] {
  return rows.map((row) => transformRow(row, context))
}

/**
 * Validate a transformed row has required fields
 */
export function validateTransformedRow(
  row: DatabaseRow,
  requiredFields: string[]
): { valid: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter(
    (field) => !(field in row) || row[field] === null || row[field] === undefined
  )

  return {
    valid: missingFields.length === 0,
    missingFields,
  }
}
