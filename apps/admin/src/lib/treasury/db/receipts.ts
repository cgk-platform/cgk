/**
 * Treasury Receipts database operations with tenant isolation
 */

import { sql, withTenant } from '@cgk-platform/db'

import type {
  TreasuryReceipt,
  CreateReceiptInput,
  UpdateReceiptInput,
  ReceiptStatus,
} from '../types'

/**
 * Get all receipts with optional filters
 */
export async function getReceipts(
  tenantSlug: string,
  options?: {
    status?: ReceiptStatus
    vendor?: string
    dateFrom?: string
    dateTo?: string
    limit?: number
    offset?: number
  }
): Promise<{ receipts: TreasuryReceipt[]; totalCount: number }> {
  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (options?.status) {
      paramIndex++
      conditions.push(`status = $${paramIndex}::receipt_status`)
      values.push(options.status)
    }

    if (options?.vendor) {
      paramIndex++
      conditions.push(`vendor_name ILIKE $${paramIndex}`)
      values.push(`%${options.vendor}%`)
    }

    if (options?.dateFrom) {
      paramIndex++
      conditions.push(`receipt_date >= $${paramIndex}::date`)
      values.push(options.dateFrom)
    }

    if (options?.dateTo) {
      paramIndex++
      conditions.push(`receipt_date <= $${paramIndex}::date`)
      values.push(options.dateTo)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limit = options?.limit || 50
    const offset = options?.offset || 0

    // Get total count
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM treasury_receipts ${whereClause}`,
      values
    )
    const totalCount = Number(countResult.rows[0]?.count || 0)

    // Get paginated results
    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(limit, offset)

    const result = await sql.query(
      `SELECT * FROM treasury_receipts
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values
    )

    return {
      receipts: result.rows as TreasuryReceipt[],
      totalCount,
    }
  })
}

/**
 * Get a single receipt by ID
 */
export async function getReceipt(
  tenantSlug: string,
  receiptId: string
): Promise<TreasuryReceipt | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM treasury_receipts
      WHERE id = ${receiptId}
    `
    return (result.rows[0] as TreasuryReceipt) || null
  })
}

/**
 * Create a new receipt
 */
export async function createReceipt(
  tenantSlug: string,
  input: CreateReceiptInput,
  uploadedBy: string
): Promise<TreasuryReceipt> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO treasury_receipts (
        file_url, file_name, file_type, file_size_bytes,
        vendor_name, description, amount_cents, currency, receipt_date,
        expense_id, operating_expense_id, notes, uploaded_by
      ) VALUES (
        ${input.file_url},
        ${input.file_name},
        ${input.file_type || null},
        ${input.file_size_bytes || null},
        ${input.vendor_name || null},
        ${input.description || null},
        ${input.amount_cents || null},
        ${input.currency || 'USD'},
        ${input.receipt_date || null},
        ${input.expense_id || null},
        ${input.operating_expense_id || null},
        ${input.notes || null},
        ${uploadedBy}
      )
      RETURNING *
    `
    return result.rows[0] as TreasuryReceipt
  })
}

/**
 * Update a receipt
 */
export async function updateReceipt(
  tenantSlug: string,
  receiptId: string,
  input: UpdateReceiptInput
): Promise<TreasuryReceipt | null> {
  return withTenant(tenantSlug, async () => {
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (input.vendor_name !== undefined) {
      paramIndex++
      updates.push(`vendor_name = $${paramIndex}`)
      values.push(input.vendor_name)
    }

    if (input.description !== undefined) {
      paramIndex++
      updates.push(`description = $${paramIndex}`)
      values.push(input.description)
    }

    if (input.amount_cents !== undefined) {
      paramIndex++
      updates.push(`amount_cents = $${paramIndex}`)
      values.push(input.amount_cents)
    }

    if (input.currency !== undefined) {
      paramIndex++
      updates.push(`currency = $${paramIndex}`)
      values.push(input.currency)
    }

    if (input.receipt_date !== undefined) {
      paramIndex++
      updates.push(`receipt_date = $${paramIndex}`)
      values.push(input.receipt_date)
    }

    if (input.status !== undefined) {
      paramIndex++
      updates.push(`status = $${paramIndex}::receipt_status`)
      values.push(input.status)
    }

    if (input.expense_id !== undefined) {
      paramIndex++
      updates.push(`expense_id = $${paramIndex}`)
      values.push(input.expense_id)
    }

    if (input.operating_expense_id !== undefined) {
      paramIndex++
      updates.push(`operating_expense_id = $${paramIndex}`)
      values.push(input.operating_expense_id)
    }

    if (input.notes !== undefined) {
      paramIndex++
      updates.push(`notes = $${paramIndex}`)
      values.push(input.notes)
    }

    if (updates.length === 0) {
      return getReceipt(tenantSlug, receiptId)
    }

    updates.push('updated_at = NOW()')
    paramIndex++
    values.push(receiptId)

    const result = await sql.query(
      `UPDATE treasury_receipts
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    )

    return (result.rows[0] as TreasuryReceipt) || null
  })
}

/**
 * Delete a receipt
 */
export async function deleteReceipt(
  tenantSlug: string,
  receiptId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM treasury_receipts
      WHERE id = ${receiptId}
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Archive a receipt
 */
export async function archiveReceipt(
  tenantSlug: string,
  receiptId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE treasury_receipts
      SET status = 'archived'::receipt_status, updated_at = NOW()
      WHERE id = ${receiptId}
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Mark receipt as processed
 */
export async function markReceiptProcessed(
  tenantSlug: string,
  receiptId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE treasury_receipts
      SET status = 'processed'::receipt_status, updated_at = NOW()
      WHERE id = ${receiptId} AND status = 'pending'
      RETURNING id
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Get receipts by expense ID
 */
export async function getReceiptsByExpense(
  tenantSlug: string,
  expenseId: string
): Promise<TreasuryReceipt[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM treasury_receipts
      WHERE expense_id = ${expenseId}
      ORDER BY created_at DESC
    `
    return result.rows as TreasuryReceipt[]
  })
}

/**
 * Get receipt summary statistics
 */
export async function getReceiptSummary(
  tenantSlug: string
): Promise<{
  pending_count: number
  processed_count: number
  archived_count: number
  total_amount_cents: number
}> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending_count,
        COUNT(*) FILTER (WHERE status = 'processed')::int as processed_count,
        COUNT(*) FILTER (WHERE status = 'archived')::int as archived_count,
        COALESCE(SUM(amount_cents), 0)::bigint as total_amount_cents
      FROM treasury_receipts
    `
    return result.rows[0] as {
      pending_count: number
      processed_count: number
      archived_count: number
      total_amount_cents: number
    }
  })
}
