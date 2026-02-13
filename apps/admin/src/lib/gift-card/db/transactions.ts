/**
 * Gift Card Transactions Database Operations
 * All operations must be called within withTenant() context
 */
import { sql } from '@cgk-platform/db'

import type {
  GiftCardTransaction,
  CreateGiftCardTransactionInput,
  GiftCardTransactionFilters,
} from '../types'

/**
 * Get gift card transactions with filters and pagination
 */
export async function getGiftCardTransactions(
  filters: GiftCardTransactionFilters
): Promise<{ rows: GiftCardTransaction[]; totalCount: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let paramIndex = 0

  if (filters.status) {
    paramIndex++
    conditions.push(`status = $${paramIndex}`)
    values.push(filters.status)
  }

  if (filters.source) {
    paramIndex++
    conditions.push(`source = $${paramIndex}`)
    values.push(filters.source)
  }

  if (filters.search) {
    paramIndex++
    conditions.push(
      `(customer_email ILIKE $${paramIndex} OR shopify_order_name ILIKE $${paramIndex} OR customer_name ILIKE $${paramIndex})`
    )
    values.push(`%${filters.search}%`)
  }

  if (filters.date_from) {
    paramIndex++
    conditions.push(`created_at >= $${paramIndex}::timestamptz`)
    values.push(filters.date_from)
  }

  if (filters.date_to) {
    paramIndex++
    conditions.push(`created_at <= $${paramIndex}::timestamptz`)
    values.push(filters.date_to)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  paramIndex++
  const limitParam = paramIndex
  paramIndex++
  const offsetParam = paramIndex
  values.push(filters.limit, filters.offset)

  const dataResult = await sql.query(
    `SELECT id, shopify_order_id, shopify_order_name, shopify_customer_id,
            customer_email, customer_name, gift_card_product_id, gift_card_variant_id,
            gift_card_sku, amount_cents, source, source_page_slug, source_config,
            status, shopify_transaction_id, credited_at, error_message,
            created_at, updated_at
     FROM gift_card_transactions
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values
  )

  const countValues = values.slice(0, -2)
  const countResult = await sql.query(
    `SELECT COUNT(*)::text as count FROM gift_card_transactions ${whereClause}`,
    countValues
  )

  return {
    rows: dataResult.rows as GiftCardTransaction[],
    totalCount: parseInt(countResult.rows[0]?.count || '0', 10),
  }
}

/**
 * Get a transaction by ID
 */
export async function getGiftCardTransactionById(
  id: string
): Promise<GiftCardTransaction | null> {
  const result = await sql<GiftCardTransaction>`
    SELECT id, shopify_order_id, shopify_order_name, shopify_customer_id,
           customer_email, customer_name, gift_card_product_id, gift_card_variant_id,
           gift_card_sku, amount_cents, source, source_page_slug, source_config,
           status, shopify_transaction_id, credited_at, error_message,
           created_at, updated_at
    FROM gift_card_transactions
    WHERE id = ${id}
  `
  return result.rows[0] || null
}

/**
 * Get a transaction by order ID and variant ID (for idempotency)
 */
export async function getTransactionByOrderAndVariant(
  shopifyOrderId: string,
  variantId: string | null
): Promise<GiftCardTransaction | null> {
  if (variantId) {
    const result = await sql<GiftCardTransaction>`
      SELECT id, shopify_order_id, shopify_order_name, shopify_customer_id,
             customer_email, customer_name, gift_card_product_id, gift_card_variant_id,
             gift_card_sku, amount_cents, source, source_page_slug, source_config,
             status, shopify_transaction_id, credited_at, error_message,
             created_at, updated_at
      FROM gift_card_transactions
      WHERE shopify_order_id = ${shopifyOrderId} AND gift_card_variant_id = ${variantId}
    `
    return result.rows[0] || null
  }

  const result = await sql<GiftCardTransaction>`
    SELECT id, shopify_order_id, shopify_order_name, shopify_customer_id,
           customer_email, customer_name, gift_card_product_id, gift_card_variant_id,
           gift_card_sku, amount_cents, source, source_page_slug, source_config,
           status, shopify_transaction_id, credited_at, error_message,
           created_at, updated_at
    FROM gift_card_transactions
    WHERE shopify_order_id = ${shopifyOrderId} AND gift_card_variant_id IS NULL
  `
  return result.rows[0] || null
}

/**
 * Create a new gift card transaction
 */
export async function createGiftCardTransaction(
  input: CreateGiftCardTransactionInput
): Promise<GiftCardTransaction> {
  const sourceConfig = input.source_config ? JSON.stringify(input.source_config) : null

  const result = await sql<GiftCardTransaction>`
    INSERT INTO gift_card_transactions (
      shopify_order_id, shopify_order_name, shopify_customer_id,
      customer_email, customer_name, gift_card_product_id, gift_card_variant_id,
      gift_card_sku, amount_cents, source, source_page_slug, source_config
    ) VALUES (
      ${input.shopify_order_id},
      ${input.shopify_order_name},
      ${input.shopify_customer_id},
      ${input.customer_email},
      ${input.customer_name || null},
      ${input.gift_card_product_id || null},
      ${input.gift_card_variant_id || null},
      ${input.gift_card_sku || null},
      ${input.amount_cents},
      ${input.source || 'bundle_builder'},
      ${input.source_page_slug || null},
      ${sourceConfig}::jsonb
    )
    RETURNING id, shopify_order_id, shopify_order_name, shopify_customer_id,
              customer_email, customer_name, gift_card_product_id, gift_card_variant_id,
              gift_card_sku, amount_cents, source, source_page_slug, source_config,
              status, shopify_transaction_id, credited_at, error_message,
              created_at, updated_at
  `
  return result.rows[0]!
}

/**
 * Mark a transaction as credited
 */
export async function markTransactionCredited(
  id: string,
  shopifyTransactionId: string
): Promise<GiftCardTransaction | null> {
  const result = await sql<GiftCardTransaction>`
    UPDATE gift_card_transactions
    SET status = 'credited',
        shopify_transaction_id = ${shopifyTransactionId},
        credited_at = NOW(),
        error_message = NULL,
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, shopify_order_id, shopify_order_name, shopify_customer_id,
              customer_email, customer_name, gift_card_product_id, gift_card_variant_id,
              gift_card_sku, amount_cents, source, source_page_slug, source_config,
              status, shopify_transaction_id, credited_at, error_message,
              created_at, updated_at
  `
  return result.rows[0] || null
}

/**
 * Mark a transaction as failed
 */
export async function markTransactionFailed(
  id: string,
  errorMessage: string
): Promise<GiftCardTransaction | null> {
  const result = await sql<GiftCardTransaction>`
    UPDATE gift_card_transactions
    SET status = 'failed',
        error_message = ${errorMessage},
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, shopify_order_id, shopify_order_name, shopify_customer_id,
              customer_email, customer_name, gift_card_product_id, gift_card_variant_id,
              gift_card_sku, amount_cents, source, source_page_slug, source_config,
              status, shopify_transaction_id, credited_at, error_message,
              created_at, updated_at
  `
  return result.rows[0] || null
}

/**
 * Reset a failed transaction to pending for retry
 */
export async function resetTransactionToPending(
  id: string
): Promise<GiftCardTransaction | null> {
  const result = await sql<GiftCardTransaction>`
    UPDATE gift_card_transactions
    SET status = 'pending',
        error_message = NULL,
        updated_at = NOW()
    WHERE id = ${id} AND status = 'failed'
    RETURNING id, shopify_order_id, shopify_order_name, shopify_customer_id,
              customer_email, customer_name, gift_card_product_id, gift_card_variant_id,
              gift_card_sku, amount_cents, source, source_page_slug, source_config,
              status, shopify_transaction_id, credited_at, error_message,
              created_at, updated_at
  `
  return result.rows[0] || null
}

/**
 * Get pending transactions for processing
 */
export async function getPendingTransactions(limit = 50): Promise<GiftCardTransaction[]> {
  const result = await sql<GiftCardTransaction>`
    SELECT id, shopify_order_id, shopify_order_name, shopify_customer_id,
           customer_email, customer_name, gift_card_product_id, gift_card_variant_id,
           gift_card_sku, amount_cents, source, source_page_slug, source_config,
           status, shopify_transaction_id, credited_at, error_message,
           created_at, updated_at
    FROM gift_card_transactions
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT ${limit}
  `
  return result.rows
}

/**
 * Get transaction statistics
 */
export async function getTransactionStats(): Promise<{
  total_issued_cents: number
  total_credited_cents: number
  total_pending_cents: number
  total_failed_cents: number
  transaction_count: number
  credited_count: number
  pending_count: number
  failed_count: number
}> {
  const result = await sql<{
    total_issued_cents: string
    total_credited_cents: string
    total_pending_cents: string
    total_failed_cents: string
    transaction_count: string
    credited_count: string
    pending_count: string
    failed_count: string
  }>`
    SELECT
      COALESCE(SUM(amount_cents), 0)::text as total_issued_cents,
      COALESCE(SUM(CASE WHEN status = 'credited' THEN amount_cents ELSE 0 END), 0)::text as total_credited_cents,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN amount_cents ELSE 0 END), 0)::text as total_pending_cents,
      COALESCE(SUM(CASE WHEN status = 'failed' THEN amount_cents ELSE 0 END), 0)::text as total_failed_cents,
      COUNT(*)::text as transaction_count,
      COUNT(*) FILTER (WHERE status = 'credited')::text as credited_count,
      COUNT(*) FILTER (WHERE status = 'pending')::text as pending_count,
      COUNT(*) FILTER (WHERE status = 'failed')::text as failed_count
    FROM gift_card_transactions
  `

  const row = result.rows[0]
  return {
    total_issued_cents: parseInt(row?.total_issued_cents || '0', 10),
    total_credited_cents: parseInt(row?.total_credited_cents || '0', 10),
    total_pending_cents: parseInt(row?.total_pending_cents || '0', 10),
    total_failed_cents: parseInt(row?.total_failed_cents || '0', 10),
    transaction_count: parseInt(row?.transaction_count || '0', 10),
    credited_count: parseInt(row?.credited_count || '0', 10),
    pending_count: parseInt(row?.pending_count || '0', 10),
    failed_count: parseInt(row?.failed_count || '0', 10),
  }
}
