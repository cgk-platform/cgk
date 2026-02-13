/**
 * Subscription Selling Plans Service
 *
 * Manages Shopify selling plans for subscription products.
 * All operations are tenant-scoped using withTenant().
 */

import { withTenant, sql } from '@cgk-platform/db'

import type { SellingPlan, SubscriptionFrequency } from './types'

/**
 * List all selling plans
 */
export async function listSellingPlans(tenantSlug: string): Promise<SellingPlan[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM subscription_selling_plans
      ORDER BY name ASC
    `

    return result.rows.map(mapRowToSellingPlan)
  })
}

/**
 * Get a single selling plan by ID
 */
export async function getSellingPlan(
  tenantSlug: string,
  planId: string
): Promise<SellingPlan | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM subscription_selling_plans WHERE id = ${planId}
    `
    if (result.rows.length === 0) return null
    return mapRowToSellingPlan(result.rows[0] as Record<string, unknown>)
  })
}

/**
 * Create a new selling plan
 */
export async function createSellingPlan(
  tenantSlug: string,
  data: {
    name: string
    description?: string
    billingFrequency: SubscriptionFrequency
    billingInterval?: number
    deliveryFrequency: SubscriptionFrequency
    deliveryInterval?: number
    discountType?: 'percentage' | 'fixed' | 'price'
    discountValue?: number
    trialDays?: number
    minCycles?: number
    maxCycles?: number
    productIds?: string[]
    isActive?: boolean
  }
): Promise<SellingPlan> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO subscription_selling_plans (
        name, description,
        billing_frequency, billing_interval,
        delivery_frequency, delivery_interval,
        discount_type, discount_value,
        trial_days, min_cycles, max_cycles,
        product_ids, is_active
      )
      VALUES (
        ${data.name},
        ${data.description || null},
        ${data.billingFrequency}::subscription_frequency,
        ${data.billingInterval ?? 1},
        ${data.deliveryFrequency}::subscription_frequency,
        ${data.deliveryInterval ?? 1},
        ${data.discountType || null},
        ${data.discountValue || null},
        ${data.trialDays || null},
        ${data.minCycles || null},
        ${data.maxCycles || null},
        ${data.productIds ? `{${data.productIds.map(s => `"${s}"`).join(',')}}` : '{}'}::text[],
        ${data.isActive ?? true}
      )
      RETURNING *
    `

    const row = result.rows[0]
    if (!row) {
      throw new Error('Failed to create selling plan')
    }
    return mapRowToSellingPlan(row as Record<string, unknown>)
  })
}

/**
 * Update a selling plan
 */
export async function updateSellingPlan(
  tenantSlug: string,
  planId: string,
  data: Partial<{
    name: string
    description: string
    billingFrequency: SubscriptionFrequency
    billingInterval: number
    deliveryFrequency: SubscriptionFrequency
    deliveryInterval: number
    discountType: 'percentage' | 'fixed' | 'price'
    discountValue: number
    trialDays: number
    minCycles: number
    maxCycles: number
    productIds: string[]
    isActive: boolean
  }>
): Promise<SellingPlan | null> {
  return withTenant(tenantSlug, async () => {
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    const fieldMap: Record<string, string> = {
      name: 'name',
      description: 'description',
      billingFrequency: 'billing_frequency',
      billingInterval: 'billing_interval',
      deliveryFrequency: 'delivery_frequency',
      deliveryInterval: 'delivery_interval',
      discountType: 'discount_type',
      discountValue: 'discount_value',
      trialDays: 'trial_days',
      minCycles: 'min_cycles',
      maxCycles: 'max_cycles',
      productIds: 'product_ids',
      isActive: 'is_active',
    }

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (key in data) {
        paramIndex++
        if (key === 'billingFrequency' || key === 'deliveryFrequency') {
          updates.push(`${dbField} = $${paramIndex}::subscription_frequency`)
        } else {
          updates.push(`${dbField} = $${paramIndex}`)
        }
        values.push(data[key as keyof typeof data])
      }
    }

    if (updates.length === 0) {
      return getSellingPlan(tenantSlug, planId)
    }

    paramIndex++
    values.push(planId)

    const result = await sql.query(
      `UPDATE subscription_selling_plans
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    )

    if (result.rows.length === 0) return null
    return mapRowToSellingPlan(result.rows[0] as Record<string, unknown>)
  })
}

/**
 * Delete a selling plan
 */
export async function deleteSellingPlan(
  tenantSlug: string,
  planId: string
): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM subscription_selling_plans WHERE id = ${planId}
    `
    return (result.rowCount || 0) > 0
  })
}

/**
 * Toggle selling plan active status
 */
export async function toggleSellingPlan(
  tenantSlug: string,
  planId: string,
  active: boolean
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE subscription_selling_plans
      SET is_active = ${active}, updated_at = NOW()
      WHERE id = ${planId}
    `
  })
}

/**
 * Associate products with a selling plan
 */
export async function associateProducts(
  tenantSlug: string,
  planId: string,
  productIds: string[]
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE subscription_selling_plans
      SET product_ids = ${`{${productIds.map(s => `"${s}"`).join(',')}}`}::text[], updated_at = NOW()
      WHERE id = ${planId}
    `
  })
}

/**
 * Get selling plans for a product
 */
export async function getSellingPlansForProduct(
  tenantSlug: string,
  productId: string
): Promise<SellingPlan[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT * FROM subscription_selling_plans
      WHERE ${productId} = ANY(product_ids) AND is_active = true
      ORDER BY name ASC
    `
    return result.rows.map(mapRowToSellingPlan)
  })
}

/**
 * Sync selling plans with Shopify
 * This is a placeholder - actual implementation would use Shopify API
 */
export async function syncWithShopify(
  tenantSlug: string,
  planId?: string
): Promise<{ success: boolean; synced: number; errors: string[] }> {
  return withTenant(tenantSlug, async () => {
    // In a real implementation, this would:
    // 1. Fetch credentials from subscription_settings
    // 2. Call Shopify GraphQL API to create/update selling plans
    // 3. Update local records with Shopify IDs

    const errors: string[] = []

    if (planId) {
      // Sync single plan
      const plan = await getSellingPlan(tenantSlug, planId)
      if (!plan) {
        errors.push(`Plan ${planId} not found`)
        return { success: false, synced: 0, errors }
      }

      // Mark as synced (placeholder)
      await sql`
        UPDATE subscription_selling_plans
        SET last_synced_at = NOW(), sync_error = NULL
        WHERE id = ${planId}
      `

      return { success: true, synced: 1, errors }
    }

    // Sync all active plans
    const result = await sql`
      UPDATE subscription_selling_plans
      SET last_synced_at = NOW(), sync_error = NULL
      WHERE is_active = true
    `

    return { success: true, synced: result.rowCount || 0, errors }
  })
}

/**
 * Calculate price with selling plan discount
 */
export function calculateDiscountedPrice(
  priceCents: number,
  discountType: 'percentage' | 'fixed' | 'price' | null,
  discountValue: number | null
): number {
  if (!discountType || discountValue === null) {
    return priceCents
  }

  switch (discountType) {
    case 'percentage':
      return Math.round(priceCents * (1 - discountValue / 100))
    case 'fixed':
      return Math.max(0, priceCents - discountValue)
    case 'price':
      return discountValue // Fixed price, discountValue is the actual price
    default:
      return priceCents
  }
}

// Helper function to map database row to SellingPlan type
function mapRowToSellingPlan(row: Record<string, unknown>): SellingPlan {
  return {
    id: row.id as string,
    shopifySellingPlanId: row.shopify_selling_plan_id as string | null,
    shopifySellingPlanGroupId: row.shopify_selling_plan_group_id as string | null,
    name: row.name as string,
    description: row.description as string | null,
    billingFrequency: row.billing_frequency as SubscriptionFrequency,
    billingInterval: row.billing_interval as number,
    deliveryFrequency: row.delivery_frequency as SubscriptionFrequency,
    deliveryInterval: row.delivery_interval as number,
    discountType: row.discount_type as SellingPlan['discountType'],
    discountValue: row.discount_value as number | null,
    trialDays: row.trial_days as number | null,
    minCycles: row.min_cycles as number | null,
    maxCycles: row.max_cycles as number | null,
    productIds: (row.product_ids as string[]) || [],
    isActive: row.is_active as boolean,
    lastSyncedAt: row.last_synced_at as string | null,
    syncError: row.sync_error as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}
