/**
 * Promo code database operations with tenant isolation
 */

import { sql, withTenant } from '@cgk/db'

import type {
  CreatePromoCodeInput,
  PromoCodeAnalytics,
  PromoCodeMetadata,
  PromoCodeUsage,
  UpdatePromoCodeInput,
} from './types'

export interface PromoCodeListResult {
  rows: PromoCodeMetadata[]
  totalCount: number
}

export interface PromoCodeListParams {
  limit?: number
  offset?: number
  search?: string
  creatorId?: string
}

/**
 * Get list of promo code metadata
 */
export async function getPromoCodeList(
  tenantSlug: string,
  params: PromoCodeListParams = {},
): Promise<PromoCodeListResult> {
  const { limit = 20, offset = 0, search, creatorId } = params

  return withTenant(tenantSlug, async () => {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (search) {
      paramIndex++
      conditions.push(`code ILIKE $${paramIndex}`)
      values.push(`%${search}%`)
    }

    if (creatorId) {
      paramIndex++
      conditions.push(`creator_id = $${paramIndex}`)
      values.push(creatorId)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    paramIndex++
    const limitParam = paramIndex
    paramIndex++
    const offsetParam = paramIndex
    values.push(limit, offset)

    const dataResult = await sql.query(
      `SELECT
        id, code, shopify_discount_id, creator_id, commission_percent,
        og_title, og_description, og_image, redirect_target, redirect_handle,
        uses_count, revenue_generated_cents, created_at, updated_at
       FROM promo_code_metadata
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      values,
    )

    const countValues = values.slice(0, -2)
    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM promo_code_metadata ${whereClause}`,
      countValues,
    )

    return {
      rows: dataResult.rows as PromoCodeMetadata[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

/**
 * Get single promo code metadata by code
 */
export async function getPromoCodeByCode(
  tenantSlug: string,
  code: string,
): Promise<PromoCodeMetadata | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, code, shopify_discount_id, creator_id, commission_percent,
        og_title, og_description, og_image, redirect_target, redirect_handle,
        uses_count, revenue_generated_cents, created_at, updated_at
      FROM promo_code_metadata
      WHERE code = ${code.toUpperCase()}
      LIMIT 1
    `
    return (result.rows[0] as PromoCodeMetadata) || null
  })
}

/**
 * Get single promo code metadata by ID
 */
export async function getPromoCodeById(
  tenantSlug: string,
  id: string,
): Promise<PromoCodeMetadata | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, code, shopify_discount_id, creator_id, commission_percent,
        og_title, og_description, og_image, redirect_target, redirect_handle,
        uses_count, revenue_generated_cents, created_at, updated_at
      FROM promo_code_metadata
      WHERE id = ${id}
      LIMIT 1
    `
    return (result.rows[0] as PromoCodeMetadata) || null
  })
}

/**
 * Create promo code metadata
 */
export async function createPromoCodeMetadata(
  tenantSlug: string,
  input: CreatePromoCodeInput,
): Promise<PromoCodeMetadata> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO promo_code_metadata (
        code,
        shopify_discount_id,
        creator_id,
        commission_percent,
        og_title,
        og_description,
        og_image,
        redirect_target,
        redirect_handle
      )
      VALUES (
        ${input.code.toUpperCase()},
        ${input.shopify_discount_id || null},
        ${input.creator_id || null},
        ${input.commission_percent || null},
        ${input.og_title || null},
        ${input.og_description || null},
        ${input.og_image || null},
        ${input.redirect_target || 'HOME'}::promo_redirect_target,
        ${input.redirect_handle || null}
      )
      RETURNING
        id, code, shopify_discount_id, creator_id, commission_percent,
        og_title, og_description, og_image, redirect_target, redirect_handle,
        uses_count, revenue_generated_cents, created_at, updated_at
    `
    return result.rows[0] as PromoCodeMetadata
  })
}

/**
 * Update promo code metadata
 */
export async function updatePromoCodeMetadata(
  tenantSlug: string,
  code: string,
  input: UpdatePromoCodeInput,
): Promise<PromoCodeMetadata | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      UPDATE promo_code_metadata
      SET
        creator_id = COALESCE(${input.creator_id}, creator_id),
        commission_percent = COALESCE(${input.commission_percent}, commission_percent),
        og_title = COALESCE(${input.og_title}, og_title),
        og_description = COALESCE(${input.og_description}, og_description),
        og_image = COALESCE(${input.og_image}, og_image),
        redirect_target = COALESCE(${input.redirect_target}::promo_redirect_target, redirect_target),
        redirect_handle = COALESCE(${input.redirect_handle}, redirect_handle),
        updated_at = NOW()
      WHERE code = ${code.toUpperCase()}
      RETURNING
        id, code, shopify_discount_id, creator_id, commission_percent,
        og_title, og_description, og_image, redirect_target, redirect_handle,
        uses_count, revenue_generated_cents, created_at, updated_at
    `
    return (result.rows[0] as PromoCodeMetadata) || null
  })
}

/**
 * Delete promo code metadata
 */
export async function deletePromoCodeMetadata(
  tenantSlug: string,
  code: string,
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM promo_code_metadata
      WHERE code = ${code.toUpperCase()}
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Record promo code usage
 */
export async function recordPromoCodeUsage(
  tenantSlug: string,
  promoCodeId: string,
  orderId: string,
  customerEmail: string | null,
  discountAmountCents: number,
  orderTotalCents: number,
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    // Insert usage record
    await sql`
      INSERT INTO promo_code_usage (
        promo_code_id, order_id, customer_email, discount_amount_cents, order_total_cents
      )
      VALUES (
        ${promoCodeId}, ${orderId}, ${customerEmail}, ${discountAmountCents}, ${orderTotalCents}
      )
    `

    // Update aggregate counts
    await sql`
      UPDATE promo_code_metadata
      SET
        uses_count = uses_count + 1,
        revenue_generated_cents = revenue_generated_cents + ${orderTotalCents}
      WHERE id = ${promoCodeId}
    `
  })
}

/**
 * Get promo code usage history
 */
export async function getPromoCodeUsage(
  tenantSlug: string,
  promoCodeId: string,
  limit = 50,
): Promise<PromoCodeUsage[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT id, promo_code_id, order_id, customer_email, discount_amount_cents, order_total_cents, used_at
      FROM promo_code_usage
      WHERE promo_code_id = ${promoCodeId}
      ORDER BY used_at DESC
      LIMIT ${limit}
    `
    return result.rows as PromoCodeUsage[]
  })
}

/**
 * Get promo code analytics
 */
export async function getPromoCodeAnalytics(
  tenantSlug: string,
  promoCodeId: string,
  days = 30,
): Promise<PromoCodeAnalytics> {
  return withTenant(tenantSlug, async () => {
    // Aggregate stats
    const statsResult = await sql`
      SELECT
        COUNT(*)::integer as total_uses,
        COALESCE(SUM(order_total_cents), 0)::bigint as total_revenue_cents,
        COALESCE(AVG(order_total_cents), 0)::integer as average_order_value_cents,
        COUNT(DISTINCT customer_email)::integer as unique_customers
      FROM promo_code_usage
      WHERE promo_code_id = ${promoCodeId}
    `

    // Usage by day
    const dailyResult = await sql`
      SELECT
        DATE(used_at) as date,
        COUNT(*)::integer as uses,
        COALESCE(SUM(order_total_cents), 0)::bigint as revenue_cents
      FROM promo_code_usage
      WHERE promo_code_id = ${promoCodeId}
        AND used_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(used_at)
      ORDER BY date DESC
    `

    const stats = statsResult.rows[0] as {
      total_uses: number
      total_revenue_cents: number
      average_order_value_cents: number
      unique_customers: number
    }

    return {
      total_uses: stats?.total_uses ?? 0,
      total_revenue_cents: Number(stats?.total_revenue_cents ?? 0),
      average_order_value_cents: stats?.average_order_value_cents ?? 0,
      unique_customers: stats?.unique_customers ?? 0,
      usage_by_day: dailyResult.rows as Array<{
        date: string
        uses: number
        revenue_cents: number
      }>,
    }
  })
}

/**
 * Bulk create promo code metadata
 */
export async function bulkCreatePromoCodeMetadata(
  tenantSlug: string,
  codes: CreatePromoCodeInput[],
): Promise<PromoCodeMetadata[]> {
  if (codes.length === 0) return []

  return withTenant(tenantSlug, async () => {
    const results: PromoCodeMetadata[] = []

    // Insert in batches of 100
    const batchSize = 100
    for (let i = 0; i < codes.length; i += batchSize) {
      const batch = codes.slice(i, i + batchSize)

      for (const input of batch) {
        const result = await sql`
          INSERT INTO promo_code_metadata (
            code,
            shopify_discount_id,
            creator_id,
            commission_percent,
            og_title,
            og_description,
            og_image,
            redirect_target,
            redirect_handle
          )
          VALUES (
            ${input.code.toUpperCase()},
            ${input.shopify_discount_id || null},
            ${input.creator_id || null},
            ${input.commission_percent || null},
            ${input.og_title || null},
            ${input.og_description || null},
            ${input.og_image || null},
            ${input.redirect_target || 'HOME'}::promo_redirect_target,
            ${input.redirect_handle || null}
          )
          ON CONFLICT (code) DO NOTHING
          RETURNING
            id, code, shopify_discount_id, creator_id, commission_percent,
            og_title, og_description, og_image, redirect_target, redirect_handle,
            uses_count, revenue_generated_cents, created_at, updated_at
        `
        if (result.rows[0]) {
          results.push(result.rows[0] as PromoCodeMetadata)
        }
      }
    }

    return results
  })
}
