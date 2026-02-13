/**
 * Shipping A/B Test Results API
 *
 * GET - Get test results with NRPV calculations
 */

import { getTenantContext } from '@cgk-platform/auth'
import { withTenant, sql } from '@cgk-platform/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteParams {
  params: Promise<{ id: string }>
}

interface ShippingVariantResults {
  variantId: string
  variantName: string
  suffix: string
  shippingPriceCents: number
  visitors: number
  orders: number
  conversionRate: number
  productRevenue: number
  shippingRevenue: number
  netRevenue: number
  avgShippingPerOrder: number
  revenuePerVisitor: number
  netRevenuePerVisitor: number
  improvement: number | null
  zScore: number | null
  pValue: number | null
  isSignificant: boolean
  isWinner: boolean
  isControl: boolean
}

interface ShippingTestResults {
  testId: string
  variants: ShippingVariantResults[]
  totalOrders: number
  totalMismatches: number
  mismatchRate: number
}

/**
 * Get shipping test results
 */
export async function GET(req: Request, { params }: RouteParams) {
  const { tenantId } = await getTenantContext(req)
  const { id } = await params

  if (!tenantId) {
    return Response.json({ error: 'Tenant context required' }, { status: 400 })
  }

  const results = await calculateShippingResults(tenantId, id)

  if (!results) {
    return Response.json({ error: 'Test not found' }, { status: 404 })
  }

  // Get summary
  const summary = {
    hasEnoughData: results.totalOrders >= 20,
    hasWinner: results.variants.some((v) => v.isWinner),
    winnerVariantId: results.variants.find((v) => v.isWinner)?.variantId || null,
    mismatchAlertLevel:
      results.mismatchRate > 0.1
        ? 'critical'
        : results.mismatchRate > 0.05
          ? 'warning'
          : 'ok',
    recommendedAction: results.variants.some((v) => v.isWinner)
      ? `Implement winning variant`
      : 'Continue collecting data',
  }

  return Response.json({ results, summary })
}

/**
 * Calculate shipping test results
 */
async function calculateShippingResults(
  tenantId: string,
  testId: string
): Promise<ShippingTestResults | null> {
  return withTenant(tenantId, async () => {
    // Get test
    const testResult = await sql`
      SELECT * FROM ab_tests WHERE id = ${testId} AND test_type = 'shipping'
    `
    if (testResult.rows.length === 0) return null

    // Get variants
    const variantsResult = await sql`
      SELECT * FROM ab_variants WHERE test_id = ${testId}
    `

    if (variantsResult.rows.length === 0) return null

    // Get metrics per variant
    const metricsResult = await sql`
      SELECT
        v.id as variant_id,
        v.name as variant_name,
        v.is_control,
        v.shipping_suffix,
        v.shipping_price_cents,
        COUNT(DISTINCT vis.visitor_id) as visitors,
        COUNT(DISTINCT sa.order_id) as orders,
        COALESCE(SUM(sa.product_revenue_cents), 0) as product_revenue_cents,
        COALESCE(SUM(sa.actual_shipping_price_cents), 0) as shipping_revenue_cents,
        COALESCE(SUM(sa.net_revenue_cents), 0) as net_revenue_cents,
        COUNT(CASE WHEN sa.is_mismatch = true THEN 1 END) as mismatches
      FROM ab_variants v
      LEFT JOIN ab_visitors vis ON vis.variant_id = v.id AND vis.test_id = v.test_id
      LEFT JOIN ab_shipping_attributions sa ON sa.assigned_variant_id = v.id AND sa.test_id = v.test_id
      WHERE v.test_id = ${testId}
      GROUP BY v.id, v.name, v.is_control, v.shipping_suffix, v.shipping_price_cents
    `

    const variants: ShippingVariantResults[] = metricsResult.rows.map((row) => {
      const visitors = Number(row.visitors) || 0
      const orders = Number(row.orders) || 0
      const productRevenueCents = Number(row.product_revenue_cents) || 0
      const shippingRevenueCents = Number(row.shipping_revenue_cents) || 0
      const netRevenueCents = Number(row.net_revenue_cents) || 0

      return {
        variantId: row.variant_id as string,
        variantName: row.variant_name as string,
        suffix: (row.shipping_suffix as string) || '',
        shippingPriceCents: Number(row.shipping_price_cents) || 0,
        visitors,
        orders,
        conversionRate: visitors > 0 ? orders / visitors : 0,
        productRevenue: productRevenueCents / 100,
        shippingRevenue: shippingRevenueCents / 100,
        netRevenue: netRevenueCents / 100,
        avgShippingPerOrder: orders > 0 ? shippingRevenueCents / orders / 100 : 0,
        revenuePerVisitor: visitors > 0 ? productRevenueCents / visitors / 100 : 0,
        netRevenuePerVisitor: visitors > 0 ? netRevenueCents / visitors / 100 : 0,
        improvement: null,
        zScore: null,
        pValue: null,
        isSignificant: false,
        isWinner: false,
        isControl: row.is_control as boolean,
      }
    })

    // Get total mismatches
    const mismatchResult = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN is_mismatch = true THEN 1 END) as mismatches
      FROM ab_shipping_attributions
      WHERE test_id = ${testId}
    `

    const totalOrders = Number(mismatchResult.rows[0]?.total) || 0
    const totalMismatches = Number(mismatchResult.rows[0]?.mismatches) || 0
    const mismatchRate = totalOrders > 0 ? totalMismatches / totalOrders : 0

    return {
      testId,
      variants,
      totalOrders,
      totalMismatches,
      mismatchRate,
    }
  })
}
