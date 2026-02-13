/**
 * Gift Card Products Database Operations
 * All operations must be called within withTenant() context
 */
import { sql } from '@cgk-platform/db'

import type {
  GiftCardProduct,
  GiftCardProductStatus,
  CreateGiftCardProductInput,
  UpdateGiftCardProductInput,
} from '../types'

/**
 * Get all gift card products
 */
export async function getGiftCardProducts(
  status?: GiftCardProductStatus
): Promise<GiftCardProduct[]> {
  if (status) {
    const result = await sql<GiftCardProduct>`
      SELECT id, variant_id, variant_id_numeric, title, sku, amount_cents,
             min_order_subtotal_cents, status, shopify_status, image_url,
             created_at, updated_at, synced_at
      FROM gift_card_products
      WHERE status = ${status}
      ORDER BY created_at DESC
    `
    return result.rows
  }

  const result = await sql<GiftCardProduct>`
    SELECT id, variant_id, variant_id_numeric, title, sku, amount_cents,
           min_order_subtotal_cents, status, shopify_status, image_url,
           created_at, updated_at, synced_at
    FROM gift_card_products
    ORDER BY created_at DESC
  `
  return result.rows
}

/**
 * Get a gift card product by ID
 */
export async function getGiftCardProductById(id: string): Promise<GiftCardProduct | null> {
  const result = await sql<GiftCardProduct>`
    SELECT id, variant_id, variant_id_numeric, title, sku, amount_cents,
           min_order_subtotal_cents, status, shopify_status, image_url,
           created_at, updated_at, synced_at
    FROM gift_card_products
    WHERE id = ${id}
  `
  return result.rows[0] || null
}

/**
 * Get a gift card product by variant ID
 */
export async function getGiftCardProductByVariantId(
  variantId: string
): Promise<GiftCardProduct | null> {
  const result = await sql<GiftCardProduct>`
    SELECT id, variant_id, variant_id_numeric, title, sku, amount_cents,
           min_order_subtotal_cents, status, shopify_status, image_url,
           created_at, updated_at, synced_at
    FROM gift_card_products
    WHERE variant_id = ${variantId} OR variant_id_numeric = ${variantId}
  `
  return result.rows[0] || null
}

/**
 * Create or update a gift card product (upsert)
 */
export async function upsertGiftCardProduct(
  input: CreateGiftCardProductInput
): Promise<GiftCardProduct> {
  const result = await sql<GiftCardProduct>`
    INSERT INTO gift_card_products (
      id, variant_id, variant_id_numeric, title, sku, amount_cents,
      min_order_subtotal_cents, status, shopify_status, image_url, synced_at
    ) VALUES (
      ${input.id},
      ${input.variant_id},
      ${input.variant_id_numeric},
      ${input.title},
      ${input.sku || null},
      ${input.amount_cents},
      ${input.min_order_subtotal_cents || 0},
      ${input.status || 'active'},
      ${input.shopify_status || null},
      ${input.image_url || null},
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      variant_id = EXCLUDED.variant_id,
      variant_id_numeric = EXCLUDED.variant_id_numeric,
      title = EXCLUDED.title,
      sku = EXCLUDED.sku,
      amount_cents = EXCLUDED.amount_cents,
      shopify_status = EXCLUDED.shopify_status,
      image_url = EXCLUDED.image_url,
      synced_at = NOW(),
      updated_at = NOW()
    RETURNING id, variant_id, variant_id_numeric, title, sku, amount_cents,
              min_order_subtotal_cents, status, shopify_status, image_url,
              created_at, updated_at, synced_at
  `
  return result.rows[0]!
}

/**
 * Update a gift card product
 */
export async function updateGiftCardProduct(
  input: UpdateGiftCardProductInput
): Promise<GiftCardProduct | null> {
  const current = await getGiftCardProductById(input.id)
  if (!current) return null

  const result = await sql<GiftCardProduct>`
    UPDATE gift_card_products SET
      title = ${input.title ?? current.title},
      sku = ${input.sku !== undefined ? input.sku : current.sku},
      amount_cents = ${input.amount_cents ?? current.amount_cents},
      min_order_subtotal_cents = ${input.min_order_subtotal_cents ?? current.min_order_subtotal_cents},
      status = ${input.status ?? current.status},
      shopify_status = ${input.shopify_status !== undefined ? input.shopify_status : current.shopify_status},
      image_url = ${input.image_url !== undefined ? input.image_url : current.image_url},
      updated_at = NOW()
    WHERE id = ${input.id}
    RETURNING id, variant_id, variant_id_numeric, title, sku, amount_cents,
              min_order_subtotal_cents, status, shopify_status, image_url,
              created_at, updated_at, synced_at
  `
  return result.rows[0] || null
}

/**
 * Archive a gift card product
 */
export async function archiveGiftCardProduct(id: string): Promise<boolean> {
  const result = await sql`
    UPDATE gift_card_products
    SET status = 'archived', updated_at = NOW()
    WHERE id = ${id}
  `
  return (result.rowCount ?? 0) > 0
}

/**
 * Activate a gift card product
 */
export async function activateGiftCardProduct(id: string): Promise<boolean> {
  const result = await sql`
    UPDATE gift_card_products
    SET status = 'active', updated_at = NOW()
    WHERE id = ${id}
  `
  return (result.rowCount ?? 0) > 0
}

/**
 * Delete a gift card product
 */
export async function deleteGiftCardProduct(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM gift_card_products WHERE id = ${id}`
  return (result.rowCount ?? 0) > 0
}

/**
 * Count active gift card products
 */
export async function countActiveProducts(): Promise<number> {
  const result = await sql<{ count: string }>`
    SELECT COUNT(*)::text as count FROM gift_card_products WHERE status = 'active'
  `
  return parseInt(result.rows[0]?.count || '0', 10)
}
