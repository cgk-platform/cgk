/**
 * Shipping Order Attribution
 *
 * Handles attribution of orders to shipping test variants.
 * Calculates net revenue and detects mismatches.
 */

import { withTenant, sql } from '@cgk/db'
import { extractSuffix, parseShippingPrice } from './config.js'
import { extractABDataFromAttributes } from './cart-bridge.js'
import type {
  ShippingAttribution,
  ShopifyOrder,
  ShippingVariantMetrics,
} from './types.js'
import type { ABTest, ABVariant, TrackEventInput } from '../types.js'

/**
 * Get test and variant data from database
 */
async function getTestWithVariants(
  tenantId: string,
  testId: string
): Promise<{ test: ABTest; variants: ABVariant[] } | null> {
  return withTenant(tenantId, async () => {
    const testResult = await sql`
      SELECT * FROM ab_tests WHERE id = ${testId}
    `
    if (testResult.rows.length === 0) return null

    const variantsResult = await sql`
      SELECT * FROM ab_variants WHERE test_id = ${testId}
    `

    return {
      test: testResult.rows[0] as ABTest,
      variants: variantsResult.rows as ABVariant[],
    }
  })
}

/**
 * Find variant by shipping suffix
 */
function findVariantBySuffix(
  variants: ABVariant[],
  suffix: string
): ABVariant | undefined {
  return variants.find(
    (v) => v.shippingSuffix?.toUpperCase() === suffix.toUpperCase()
  )
}

/**
 * Record shipping attribution in database
 */
async function recordShippingAttribution(
  tenantId: string,
  attribution: ShippingAttribution
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      INSERT INTO ab_shipping_attributions (
        order_id, test_id, assigned_variant_id, assigned_suffix,
        actual_shipping_method, actual_shipping_price_cents,
        product_revenue_cents, net_revenue_cents,
        is_mismatch, mismatch_reason, attributed_at
      ) VALUES (
        ${attribution.orderId},
        ${attribution.testId},
        ${attribution.assignedVariantId},
        ${attribution.assignedSuffix},
        ${attribution.actualShippingMethod},
        ${attribution.actualShippingPriceCents},
        ${attribution.productRevenueCents},
        ${attribution.netRevenueCents},
        ${attribution.isMismatch},
        ${attribution.mismatchReason || null},
        ${attribution.attributedAt.toISOString()}
      )
      ON CONFLICT (order_id, test_id) DO UPDATE SET
        actual_shipping_method = EXCLUDED.actual_shipping_method,
        actual_shipping_price_cents = EXCLUDED.actual_shipping_price_cents,
        product_revenue_cents = EXCLUDED.product_revenue_cents,
        net_revenue_cents = EXCLUDED.net_revenue_cents,
        is_mismatch = EXCLUDED.is_mismatch,
        mismatch_reason = EXCLUDED.mismatch_reason
    `
  })
}

/**
 * Record A/B event for shipping test
 */
async function recordShippingABEvent(
  tenantId: string,
  input: TrackEventInput
): Promise<void> {
  await withTenant(tenantId, async () => {
    await sql`
      INSERT INTO ab_events (
        test_id, variant_id, visitor_id, event_type,
        event_value_cents, order_id, created_at
      ) VALUES (
        ${input.testId},
        ${input.variantId},
        ${input.visitorId},
        ${input.eventType},
        ${input.eventValueCents || null},
        ${input.orderId || null},
        NOW()
      )
    `
  })
}

/**
 * Process order webhook to attribute shipping revenue
 *
 * @param tenantId - The tenant ID
 * @param order - The Shopify order data
 * @returns Attribution data or null if not part of a shipping test
 */
export async function attributeShippingOrder(
  tenantId: string,
  order: ShopifyOrder
): Promise<ShippingAttribution | null> {
  // Extract A/B test info from order note attributes
  const abData = extractABDataFromAttributes(order.noteAttributes)

  if (!abData.testId || !abData.suffix) {
    return null // Not part of a shipping test
  }

  if (abData.testType !== 'shipping') {
    return null // Not a shipping test
  }

  // Get test and variants from database
  const testData = await getTestWithVariants(tenantId, abData.testId)
  if (!testData) {
    console.error(`Shipping test not found: ${abData.testId}`)
    return null
  }

  // Find assigned variant
  const assignedVariant = findVariantBySuffix(testData.variants, abData.suffix)
  if (!assignedVariant) {
    console.error(`Unknown variant suffix: ${abData.suffix} for test ${abData.testId}`)
    return null
  }

  // Get actual shipping from order
  const actualShipping = order.shippingLines[0]
  if (!actualShipping) {
    console.error(`No shipping line found for order ${order.id}`)
    return null
  }

  const actualPriceCents = parseShippingPrice(actualShipping.price)
  const actualMethod = actualShipping.title
  const actualSuffix = extractSuffix(actualMethod)

  // Detect mismatch
  const isMismatch = actualSuffix !== '' && actualSuffix !== abData.suffix
  let mismatchReason: string | undefined
  if (isMismatch) {
    mismatchReason = `Expected suffix "${abData.suffix}" but got "${actualSuffix}"`
  }

  // Calculate revenues
  const productRevenueCents = parseShippingPrice(order.subtotalPrice)
  const netRevenueCents = productRevenueCents - actualPriceCents

  const attribution: ShippingAttribution = {
    orderId: order.id,
    testId: abData.testId,
    assignedVariantId: assignedVariant.id,
    assignedSuffix: abData.suffix,
    actualShippingMethod: actualMethod,
    actualShippingPriceCents: actualPriceCents,
    productRevenueCents,
    netRevenueCents,
    isMismatch,
    mismatchReason,
    attributedAt: new Date(),
  }

  // Record the attribution
  await recordShippingAttribution(tenantId, attribution)

  // Record A/B event with net revenue
  await recordShippingABEvent(tenantId, {
    testId: abData.testId,
    variantId: assignedVariant.id,
    visitorId: abData.visitorId || 'unknown',
    eventType: 'purchase',
    eventValueCents: netRevenueCents, // Use net revenue for shipping tests
    orderId: order.id,
  })

  return attribution
}

/**
 * Get shipping metrics for a test
 */
export async function getShippingMetrics(
  tenantId: string,
  testId: string
): Promise<Record<string, ShippingVariantMetrics>> {
  return withTenant(tenantId, async () => {
    // Get visitor and order counts per variant
    const metricsResult = await sql`
      SELECT
        v.id as variant_id,
        COUNT(DISTINCT vis.visitor_id) as visitors,
        COUNT(DISTINCT sa.order_id) as orders,
        COALESCE(SUM(sa.product_revenue_cents), 0) as product_revenue_cents,
        COALESCE(SUM(sa.actual_shipping_price_cents), 0) as shipping_revenue_cents,
        COALESCE(SUM(sa.net_revenue_cents), 0) as net_revenue_cents,
        COALESCE(VAR_SAMP(sa.net_revenue_cents), 0) as net_revenue_variance,
        COUNT(CASE WHEN sa.is_mismatch = true THEN 1 END) as mismatches
      FROM ab_variants v
      LEFT JOIN ab_visitors vis ON vis.variant_id = v.id AND vis.test_id = v.test_id
      LEFT JOIN ab_shipping_attributions sa ON sa.assigned_variant_id = v.id AND sa.test_id = v.test_id
      WHERE v.test_id = ${testId}
      GROUP BY v.id
    `

    const metrics: Record<string, ShippingVariantMetrics> = {}

    for (const row of metricsResult.rows) {
      metrics[row.variant_id as string] = {
        variantId: row.variant_id as string,
        visitors: Number(row.visitors) || 0,
        orders: Number(row.orders) || 0,
        productRevenueCents: Number(row.product_revenue_cents) || 0,
        shippingRevenueCents: Number(row.shipping_revenue_cents) || 0,
        netRevenueCents: Number(row.net_revenue_cents) || 0,
        netRevenueVariance: Number(row.net_revenue_variance) || 0,
        mismatches: Number(row.mismatches) || 0,
      }
    }

    return metrics
  })
}

/**
 * Get mismatch count for a test
 */
export async function getMismatchCount(
  tenantId: string,
  testId: string
): Promise<number> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM ab_shipping_attributions
      WHERE test_id = ${testId} AND is_mismatch = true
    `
    return Number(result.rows[0]?.count) || 0
  })
}

/**
 * Get mismatch rate for a test (mismatches / total orders)
 */
export async function getMismatchRate(
  tenantId: string,
  testId: string
): Promise<number> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN is_mismatch = true THEN 1 END) as mismatches
      FROM ab_shipping_attributions
      WHERE test_id = ${testId}
    `

    const total = Number(result.rows[0]?.total) || 0
    const mismatches = Number(result.rows[0]?.mismatches) || 0

    if (total === 0) return 0
    return mismatches / total
  })
}

/**
 * Get recent mismatches for debugging
 */
export async function getRecentMismatches(
  tenantId: string,
  testId: string,
  limit: number = 10
): Promise<ShippingAttribution[]> {
  return withTenant(tenantId, async () => {
    const result = await sql`
      SELECT
        order_id, test_id, assigned_variant_id, assigned_suffix,
        actual_shipping_method, actual_shipping_price_cents,
        product_revenue_cents, net_revenue_cents,
        is_mismatch, mismatch_reason, attributed_at
      FROM ab_shipping_attributions
      WHERE test_id = ${testId} AND is_mismatch = true
      ORDER BY attributed_at DESC
      LIMIT ${limit}
    `

    return result.rows.map((row) => ({
      orderId: row.order_id as string,
      testId: row.test_id as string,
      assignedVariantId: row.assigned_variant_id as string,
      assignedSuffix: row.assigned_suffix as string,
      actualShippingMethod: row.actual_shipping_method as string,
      actualShippingPriceCents: Number(row.actual_shipping_price_cents),
      productRevenueCents: Number(row.product_revenue_cents),
      netRevenueCents: Number(row.net_revenue_cents),
      isMismatch: row.is_mismatch as boolean,
      mismatchReason: row.mismatch_reason as string | undefined,
      attributedAt: new Date(row.attributed_at as string),
    }))
  })
}
