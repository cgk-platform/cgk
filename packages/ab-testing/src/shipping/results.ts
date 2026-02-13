/**
 * Shipping Test Results Calculation
 *
 * Calculates Net Revenue Per Visitor (NRPV) and statistical significance
 * for shipping threshold A/B tests.
 */

import { withTenant, sql } from '@cgk-platform/db'
import {
  getShippingMetrics,
  getMismatchCount,
  getMismatchRate,
} from './attribution.js'
import { calculateRevenueSignificance } from '../statistics/core.js'
import type {
  ShippingTestResults,
  ShippingVariantResults,
} from './types.js'
import type { ABTest, ABVariant } from '../types.js'

/**
 * Get test with variants from database
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
 * Calculate shipping test results with NRPV as primary metric
 *
 * @param tenantId - The tenant ID
 * @param testId - The test ID
 * @returns Shipping test results with statistical analysis
 */
export async function calculateShippingResults(
  tenantId: string,
  testId: string
): Promise<ShippingTestResults | null> {
  // Get test and variants
  const testData = await getTestWithVariants(tenantId, testId)
  if (!testData) return null

  const { test, variants } = testData

  // Get metrics for each variant
  const metrics = await getShippingMetrics(tenantId, testId)

  // Find control variant
  const controlVariant = variants.find((v) => v.isControl)
  if (!controlVariant) {
    console.error(`No control variant found for test ${testId}`)
    return null
  }

  const controlStats = metrics[controlVariant.id]
  if (!controlStats) {
    console.error(`No metrics found for control variant ${controlVariant.id}`)
    return null
  }

  // Calculate results for each variant
  const variantResults: ShippingVariantResults[] = variants.map((v) => {
    const stats = metrics[v.id]
    if (!stats) {
      return createEmptyVariantResult(v)
    }

    const visitors = stats.visitors
    const orders = stats.orders
    const conversionRate = visitors > 0 ? orders / visitors : 0
    const productRevenue = stats.productRevenueCents / 100
    const shippingRevenue = stats.shippingRevenueCents / 100
    const netRevenue = stats.netRevenueCents / 100
    const avgShippingPerOrder = orders > 0 ? shippingRevenue / orders : 0
    const revenuePerVisitor = visitors > 0 ? productRevenue / visitors : 0
    const netRevenuePerVisitor = visitors > 0 ? netRevenue / visitors : 0

    // Calculate significance vs control for non-control variants
    let significance: {
      zScore: number
      pValue: number
      isSignificant: boolean
      improvement: number
    } | null = null

    if (!v.isControl && controlStats.visitors > 0 && stats.visitors > 0) {
      const confidenceLevel = (test.confidenceLevel || 0.95) as 0.9 | 0.95 | 0.99
      const sigResult = calculateRevenueSignificance(
        {
          visitors: controlStats.visitors,
          revenue: controlStats.netRevenueCents,
          revenueVariance: controlStats.netRevenueVariance,
        },
        {
          visitors: stats.visitors,
          revenue: stats.netRevenueCents,
          revenueVariance: stats.netRevenueVariance,
        },
        confidenceLevel
      )
      significance = {
        zScore: sigResult.zScore,
        pValue: sigResult.pValue,
        isSignificant: sigResult.isSignificant,
        improvement: sigResult.improvement,
      }
    }

    return {
      variantId: v.id,
      variantName: v.name,
      suffix: v.shippingSuffix || '',
      shippingPriceCents: v.shippingPriceCents || 0,
      visitors,
      orders,
      conversionRate,
      productRevenue,
      shippingRevenue,
      netRevenue,
      avgShippingPerOrder,
      revenuePerVisitor,
      netRevenuePerVisitor,
      improvement: significance?.improvement ?? null,
      zScore: significance?.zScore ?? null,
      pValue: significance?.pValue ?? null,
      isSignificant: significance?.isSignificant ?? false,
      isWinner: false, // Set below
    }
  })

  // Determine winner based on NRPV
  const significantVariants = variantResults.filter(
    (v) =>
      !variants.find((tv) => tv.id === v.variantId)?.isControl &&
      v.isSignificant &&
      v.improvement !== null &&
      v.improvement > 0
  )

  if (significantVariants.length > 0) {
    // Highest NRPV improvement wins
    const winner = significantVariants.reduce((best, v) =>
      (v.improvement ?? 0) > (best.improvement ?? 0) ? v : best
    )
    winner.isWinner = true
  }

  // Get mismatch data
  const totalMismatches = await getMismatchCount(tenantId, testId)
  const mismatchRate = await getMismatchRate(tenantId, testId)

  return {
    testId,
    variants: variantResults,
    totalOrders: variantResults.reduce((sum, v) => sum + v.orders, 0),
    totalMismatches,
    mismatchRate,
  }
}

/**
 * Create empty result for variant with no data
 */
function createEmptyVariantResult(variant: ABVariant): ShippingVariantResults {
  return {
    variantId: variant.id,
    variantName: variant.name,
    suffix: variant.shippingSuffix || '',
    shippingPriceCents: variant.shippingPriceCents || 0,
    visitors: 0,
    orders: 0,
    conversionRate: 0,
    productRevenue: 0,
    shippingRevenue: 0,
    netRevenue: 0,
    avgShippingPerOrder: 0,
    revenuePerVisitor: 0,
    netRevenuePerVisitor: 0,
    improvement: null,
    zScore: null,
    pValue: null,
    isSignificant: false,
    isWinner: false,
  }
}

/**
 * Get results summary for shipping test
 */
export async function getShippingResultsSummary(
  tenantId: string,
  testId: string
): Promise<{
  hasEnoughData: boolean
  hasWinner: boolean
  winnerVariantId: string | null
  mismatchAlertLevel: 'ok' | 'warning' | 'critical'
  recommendedAction: string
} | null> {
  const results = await calculateShippingResults(tenantId, testId)
  if (!results) return null

  const totalVisitors = results.variants.reduce((sum, v) => sum + v.visitors, 0)
  const hasEnoughData = totalVisitors >= 100 && results.totalOrders >= 20
  const winner = results.variants.find((v) => v.isWinner)
  const hasWinner = winner !== undefined

  let mismatchAlertLevel: 'ok' | 'warning' | 'critical' = 'ok'
  if (results.mismatchRate > 0.1) {
    mismatchAlertLevel = 'critical'
  } else if (results.mismatchRate > 0.05) {
    mismatchAlertLevel = 'warning'
  }

  let recommendedAction = 'Continue collecting data'
  if (hasWinner) {
    recommendedAction = `Implement variant ${winner.suffix} (${winner.variantName}) with ${winner.improvement?.toFixed(1)}% improvement`
  } else if (mismatchAlertLevel === 'critical') {
    recommendedAction = 'Investigate high mismatch rate - Shopify Function may not be working correctly'
  } else if (!hasEnoughData) {
    recommendedAction = `Need more data: ${totalVisitors}/100 visitors, ${results.totalOrders}/20 orders`
  }

  return {
    hasEnoughData,
    hasWinner,
    winnerVariantId: winner?.variantId || null,
    mismatchAlertLevel,
    recommendedAction,
  }
}

/**
 * Get NRPV comparison chart data
 */
export async function getNRPVChartData(
  tenantId: string,
  testId: string
): Promise<Array<{
  variantId: string
  variantName: string
  suffix: string
  nrpv: number
  isControl: boolean
  confidenceInterval: { lower: number; upper: number } | null
}> | null> {
  const results = await calculateShippingResults(tenantId, testId)
  if (!results) return null

  // Get test data for control identification
  const testData = await getTestWithVariants(tenantId, testId)
  if (!testData) return null

  return results.variants.map((v) => {
    const variant = testData.variants.find((tv) => tv.id === v.variantId)
    const isControl = variant?.isControl || false

    let confidenceInterval: { lower: number; upper: number } | null = null
    if (v.zScore !== null && v.visitors > 0) {
      // Approximate CI from z-score
      const se = v.netRevenuePerVisitor / Math.abs(v.zScore || 1)
      const margin = 1.96 * se
      confidenceInterval = {
        lower: v.netRevenuePerVisitor - margin,
        upper: v.netRevenuePerVisitor + margin,
      }
    }

    return {
      variantId: v.variantId,
      variantName: v.variantName,
      suffix: v.suffix,
      nrpv: v.netRevenuePerVisitor,
      isControl,
      confidenceInterval,
    }
  })
}
