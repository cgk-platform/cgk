/**
 * Selling plan database operations with tenant isolation
 */

import { sql, withTenant } from '@cgk/db'

import type {
  CreateSellingPlanInput,
  SellingPlan,
  SellingPlanCollection,
  SellingPlanProduct,
  SellingPlanWithAssignments,
  UpdateSellingPlanInput,
} from './types'

export interface SellingPlanListResult {
  rows: SellingPlan[]
  totalCount: number
}

export interface SellingPlanListParams {
  limit?: number
  offset?: number
  activeOnly?: boolean
}

/**
 * Get list of selling plans
 */
export async function getSellingPlanList(
  tenantSlug: string,
  params: SellingPlanListParams = {},
): Promise<SellingPlanListResult> {
  const { limit = 50, offset = 0, activeOnly = false } = params

  return withTenant(tenantSlug, async () => {
    const whereClause = activeOnly ? 'WHERE is_active = true' : ''

    const dataResult = await sql.query(
      `SELECT
        id, name, internal_name, selector_title, priority,
        interval_unit, interval_count,
        discount_type, discount_value,
        discount_after_payment, discount_after_type, discount_after_value,
        shopify_selling_plan_id, shopify_selling_plan_group_id,
        is_active, created_at, updated_at
       FROM selling_plans
       ${whereClause}
       ORDER BY priority ASC, name ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    )

    const countResult = await sql.query(
      `SELECT COUNT(*) as count FROM selling_plans ${whereClause}`,
      [],
    )

    return {
      rows: dataResult.rows as SellingPlan[],
      totalCount: Number(countResult.rows[0]?.count || 0),
    }
  })
}

/**
 * Get single selling plan by ID
 */
export async function getSellingPlanById(
  tenantSlug: string,
  id: string,
): Promise<SellingPlan | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        id, name, internal_name, selector_title, priority,
        interval_unit, interval_count,
        discount_type, discount_value,
        discount_after_payment, discount_after_type, discount_after_value,
        shopify_selling_plan_id, shopify_selling_plan_group_id,
        is_active, created_at, updated_at
      FROM selling_plans
      WHERE id = ${id}
      LIMIT 1
    `
    return (result.rows[0] as SellingPlan) || null
  })
}

/**
 * Get selling plan with product and collection assignments
 */
export async function getSellingPlanWithAssignments(
  tenantSlug: string,
  id: string,
): Promise<SellingPlanWithAssignments | null> {
  return withTenant(tenantSlug, async () => {
    const planResult = await sql`
      SELECT
        id, name, internal_name, selector_title, priority,
        interval_unit, interval_count,
        discount_type, discount_value,
        discount_after_payment, discount_after_type, discount_after_value,
        shopify_selling_plan_id, shopify_selling_plan_group_id,
        is_active, created_at, updated_at
      FROM selling_plans
      WHERE id = ${id}
      LIMIT 1
    `

    const plan = planResult.rows[0] as SellingPlan
    if (!plan) return null

    const productsResult = await sql`
      SELECT product_id FROM selling_plan_products WHERE selling_plan_id = ${id}
    `
    const collectionsResult = await sql`
      SELECT collection_id FROM selling_plan_collections WHERE selling_plan_id = ${id}
    `

    return {
      ...plan,
      product_ids: productsResult.rows.map((r) => (r as { product_id: string }).product_id),
      collection_ids: collectionsResult.rows.map(
        (r) => (r as { collection_id: string }).collection_id,
      ),
    }
  })
}

/**
 * Create a selling plan
 */
export async function createSellingPlan(
  tenantSlug: string,
  input: CreateSellingPlanInput,
): Promise<SellingPlanWithAssignments> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      INSERT INTO selling_plans (
        name, internal_name, selector_title, priority,
        interval_unit, interval_count,
        discount_type, discount_value,
        discount_after_payment, discount_after_type, discount_after_value,
        is_active
      )
      VALUES (
        ${input.name},
        ${input.internal_name || null},
        ${input.selector_title},
        ${input.priority ?? 0},
        ${input.interval_unit}::selling_plan_interval_unit,
        ${input.interval_count},
        ${input.discount_type}::selling_plan_discount_type,
        ${input.discount_value},
        ${input.discount_after_payment || null},
        ${input.discount_after_type || null}::selling_plan_discount_type,
        ${input.discount_after_value || null},
        ${input.is_active ?? true}
      )
      RETURNING
        id, name, internal_name, selector_title, priority,
        interval_unit, interval_count,
        discount_type, discount_value,
        discount_after_payment, discount_after_type, discount_after_value,
        shopify_selling_plan_id, shopify_selling_plan_group_id,
        is_active, created_at, updated_at
    `

    const plan = result.rows[0] as SellingPlan
    const productIds: string[] = []
    const collectionIds: string[] = []

    // Add product assignments
    if (input.product_ids?.length) {
      for (const productId of input.product_ids) {
        await sql`
          INSERT INTO selling_plan_products (selling_plan_id, product_id)
          VALUES (${plan.id}, ${productId})
          ON CONFLICT (selling_plan_id, product_id) DO NOTHING
        `
        productIds.push(productId)
      }
    }

    // Add collection assignments
    if (input.collection_ids?.length) {
      for (const collectionId of input.collection_ids) {
        await sql`
          INSERT INTO selling_plan_collections (selling_plan_id, collection_id)
          VALUES (${plan.id}, ${collectionId})
          ON CONFLICT (selling_plan_id, collection_id) DO NOTHING
        `
        collectionIds.push(collectionId)
      }
    }

    return {
      ...plan,
      product_ids: productIds,
      collection_ids: collectionIds,
    }
  })
}

/**
 * Update a selling plan
 */
export async function updateSellingPlan(
  tenantSlug: string,
  id: string,
  input: UpdateSellingPlanInput,
): Promise<SellingPlanWithAssignments | null> {
  return withTenant(tenantSlug, async () => {
    // Build dynamic update
    const updates: string[] = []
    const values: unknown[] = []
    let paramIndex = 0

    if (input.name !== undefined) {
      paramIndex++
      updates.push(`name = $${paramIndex}`)
      values.push(input.name)
    }
    if (input.internal_name !== undefined) {
      paramIndex++
      updates.push(`internal_name = $${paramIndex}`)
      values.push(input.internal_name)
    }
    if (input.selector_title !== undefined) {
      paramIndex++
      updates.push(`selector_title = $${paramIndex}`)
      values.push(input.selector_title)
    }
    if (input.priority !== undefined) {
      paramIndex++
      updates.push(`priority = $${paramIndex}`)
      values.push(input.priority)
    }
    if (input.interval_unit !== undefined) {
      paramIndex++
      updates.push(`interval_unit = $${paramIndex}::selling_plan_interval_unit`)
      values.push(input.interval_unit)
    }
    if (input.interval_count !== undefined) {
      paramIndex++
      updates.push(`interval_count = $${paramIndex}`)
      values.push(input.interval_count)
    }
    if (input.discount_type !== undefined) {
      paramIndex++
      updates.push(`discount_type = $${paramIndex}::selling_plan_discount_type`)
      values.push(input.discount_type)
    }
    if (input.discount_value !== undefined) {
      paramIndex++
      updates.push(`discount_value = $${paramIndex}`)
      values.push(input.discount_value)
    }
    if (input.discount_after_payment !== undefined) {
      paramIndex++
      updates.push(`discount_after_payment = $${paramIndex}`)
      values.push(input.discount_after_payment)
    }
    if (input.discount_after_type !== undefined) {
      paramIndex++
      updates.push(`discount_after_type = $${paramIndex}::selling_plan_discount_type`)
      values.push(input.discount_after_type)
    }
    if (input.discount_after_value !== undefined) {
      paramIndex++
      updates.push(`discount_after_value = $${paramIndex}`)
      values.push(input.discount_after_value)
    }
    if (input.is_active !== undefined) {
      paramIndex++
      updates.push(`is_active = $${paramIndex}`)
      values.push(input.is_active)
    }

    if (updates.length === 0 && !input.product_ids && !input.collection_ids) {
      // Nothing to update, return current state
      return getSellingPlanWithAssignments(tenantSlug, id)
    }

    let plan: SellingPlan | null = null

    if (updates.length > 0) {
      paramIndex++
      values.push(id)

      const result = await sql.query(
        `UPDATE selling_plans
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${paramIndex}
         RETURNING
           id, name, internal_name, selector_title, priority,
           interval_unit, interval_count,
           discount_type, discount_value,
           discount_after_payment, discount_after_type, discount_after_value,
           shopify_selling_plan_id, shopify_selling_plan_group_id,
           is_active, created_at, updated_at`,
        values,
      )
      plan = (result.rows[0] as SellingPlan) || null
    } else {
      const planResult = await sql`
        SELECT
          id, name, internal_name, selector_title, priority,
          interval_unit, interval_count,
          discount_type, discount_value,
          discount_after_payment, discount_after_type, discount_after_value,
          shopify_selling_plan_id, shopify_selling_plan_group_id,
          is_active, created_at, updated_at
        FROM selling_plans
        WHERE id = ${id}
        LIMIT 1
      `
      plan = (planResult.rows[0] as SellingPlan) || null
    }

    if (!plan) return null

    // Update product assignments if provided
    if (input.product_ids !== undefined) {
      await sql`DELETE FROM selling_plan_products WHERE selling_plan_id = ${id}`
      for (const productId of input.product_ids) {
        await sql`
          INSERT INTO selling_plan_products (selling_plan_id, product_id)
          VALUES (${id}, ${productId})
          ON CONFLICT (selling_plan_id, product_id) DO NOTHING
        `
      }
    }

    // Update collection assignments if provided
    if (input.collection_ids !== undefined) {
      await sql`DELETE FROM selling_plan_collections WHERE selling_plan_id = ${id}`
      for (const collectionId of input.collection_ids) {
        await sql`
          INSERT INTO selling_plan_collections (selling_plan_id, collection_id)
          VALUES (${id}, ${collectionId})
          ON CONFLICT (selling_plan_id, collection_id) DO NOTHING
        `
      }
    }

    // Fetch updated assignments
    const productsResult = await sql`
      SELECT product_id FROM selling_plan_products WHERE selling_plan_id = ${id}
    `
    const collectionsResult = await sql`
      SELECT collection_id FROM selling_plan_collections WHERE selling_plan_id = ${id}
    `

    return {
      ...plan,
      product_ids: productsResult.rows.map((r) => (r as { product_id: string }).product_id),
      collection_ids: collectionsResult.rows.map(
        (r) => (r as { collection_id: string }).collection_id,
      ),
    }
  })
}

/**
 * Delete a selling plan
 */
export async function deleteSellingPlan(tenantSlug: string, id: string): Promise<boolean> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      DELETE FROM selling_plans WHERE id = ${id}
    `
    return (result.rowCount ?? 0) > 0
  })
}

/**
 * Get product assignments for a selling plan
 */
export async function getSellingPlanProducts(
  tenantSlug: string,
  sellingPlanId: string,
): Promise<SellingPlanProduct[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT id, selling_plan_id, product_id, created_at
      FROM selling_plan_products
      WHERE selling_plan_id = ${sellingPlanId}
    `
    return result.rows as SellingPlanProduct[]
  })
}

/**
 * Get collection assignments for a selling plan
 */
export async function getSellingPlanCollections(
  tenantSlug: string,
  sellingPlanId: string,
): Promise<SellingPlanCollection[]> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT id, selling_plan_id, collection_id, created_at
      FROM selling_plan_collections
      WHERE selling_plan_id = ${sellingPlanId}
    `
    return result.rows as SellingPlanCollection[]
  })
}

/**
 * Update Shopify sync IDs
 */
export async function updateSellingPlanShopifyIds(
  tenantSlug: string,
  id: string,
  shopifySellingPlanId: string,
  shopifySellingPlanGroupId: string,
): Promise<void> {
  await withTenant(tenantSlug, async () => {
    await sql`
      UPDATE selling_plans
      SET
        shopify_selling_plan_id = ${shopifySellingPlanId},
        shopify_selling_plan_group_id = ${shopifySellingPlanGroupId},
        updated_at = NOW()
      WHERE id = ${id}
    `
  })
}
