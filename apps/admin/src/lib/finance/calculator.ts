/**
 * P&L Formula Calculator
 *
 * Provides real-time preview of contribution margin calculations
 * based on tenant's variable cost configuration.
 */

import type {
  FormulaPreviewInput,
  FormulaPreviewResult,
  VariableCostConfig,
  DEFAULT_VARIABLE_COST_CONFIG,
} from './types'

/**
 * Calculate contribution margin and variable costs for a sample order
 * Used for live preview in the settings UI
 */
export function calculateFormulaPreview(
  input: FormulaPreviewInput,
  config: Partial<VariableCostConfig> | null,
): FormulaPreviewResult {
  const orderTotal = input.orderTotal
  const itemCount = input.itemCount
  const cogsCents = input.cogsCents

  // Use defaults if no config provided
  const pp = config?.paymentProcessing ?? {
    primaryProcessor: 'shopify_payments' as const,
    percentageRate: 0.029,
    fixedFeeCents: 30,
    additionalProcessors: [],
  }
  const ff = config?.fulfillment ?? {
    costModel: 'per_order' as const,
    pickPackFeeCents: 200,
    pickPackPerItemCents: 0,
    packagingCostCents: 75,
    handlingFeeCents: 0,
    weightTiers: [],
  }
  const sh = config?.shipping ?? {
    trackingMethod: 'actual_expense' as const,
  }
  const otherCosts = config?.otherVariableCosts ?? []

  // Calculate payment processing fee
  // If there are additional processors, calculate weighted average
  let paymentProcessingFee = 0
  if (pp.additionalProcessors.length > 0) {
    // Weighted average across all processors
    const primaryVolumePercent = 100 - pp.additionalProcessors.reduce((sum, p) => sum + p.volumePercent, 0)
    paymentProcessingFee += (orderTotal * pp.percentageRate + pp.fixedFeeCents / 100) * (primaryVolumePercent / 100)

    for (const processor of pp.additionalProcessors) {
      paymentProcessingFee += (orderTotal * processor.percentageRate + processor.fixedFeeCents / 100) * (processor.volumePercent / 100)
    }
  } else {
    paymentProcessingFee = orderTotal * pp.percentageRate + pp.fixedFeeCents / 100
  }

  // Calculate fulfillment cost based on cost model
  let fulfillmentCost = 0
  switch (ff.costModel) {
    case 'per_order':
      fulfillmentCost = (ff.pickPackFeeCents + ff.handlingFeeCents) / 100
      break
    case 'per_item':
      fulfillmentCost = (ff.pickPackFeeCents + ff.handlingFeeCents + (ff.pickPackPerItemCents * itemCount)) / 100
      break
    case 'weight_based':
      // For preview, assume average weight of 12oz per item
      const estimatedOunces = itemCount * 12
      const tier = ff.weightTiers.find(t => estimatedOunces >= t.minOunces && estimatedOunces <= t.maxOunces)
      fulfillmentCost = tier ? tier.feeCents / 100 : (ff.pickPackFeeCents / 100)
      break
    case 'manual':
      // Manual entry - use pick/pack as base estimate
      fulfillmentCost = ff.pickPackFeeCents / 100
      break
  }

  // Calculate packaging cost
  const packagingCost = ff.packagingCostCents / 100

  // Calculate shipping cost
  let shippingCost = 0
  switch (sh.trackingMethod) {
    case 'estimated_percentage':
      shippingCost = orderTotal * (sh.estimatedPercent ?? 0)
      break
    case 'flat_rate':
      shippingCost = (sh.flatRateCents ?? 0) / 100
      break
    case 'actual_expense':
      // Not included in variable costs, tracked separately
      shippingCost = 0
      break
  }

  // Calculate other variable costs
  let otherVariableCosts = 0
  for (const cost of otherCosts) {
    if (!cost.isActive) continue

    switch (cost.calculationType) {
      case 'per_order':
        otherVariableCosts += cost.amountCents / 100
        break
      case 'per_item':
        otherVariableCosts += (cost.amountCents / 100) * itemCount
        break
      case 'percentage_of_revenue':
        otherVariableCosts += orderTotal * (cost.percentageRate ?? 0)
        break
    }
  }

  // Calculate totals
  const cogs = cogsCents / 100
  const cogsPercent = orderTotal > 0 ? (cogs / orderTotal) * 100 : 0

  const totalVariableCosts = paymentProcessingFee + fulfillmentCost + packagingCost + shippingCost + otherVariableCosts

  const contributionMargin = orderTotal - cogs - totalVariableCosts
  const contributionMarginPercent = orderTotal > 0 ? (contributionMargin / orderTotal) * 100 : 0

  const effectiveVariableCostPerOrder = totalVariableCosts

  return {
    grossRevenue: orderTotal,
    cogs,
    cogsPercent,
    paymentProcessingFee,
    fulfillmentCost,
    packagingCost,
    shippingCost,
    otherVariableCosts,
    totalVariableCosts,
    contributionMargin,
    contributionMarginPercent,
    effectiveVariableCostPerOrder,
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Convert cents to dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100
}

/**
 * Convert dollars to cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

/**
 * Parse a percentage string to decimal (e.g., "2.9" -> 0.029)
 */
export function percentToDecimal(percent: number): number {
  return percent / 100
}

/**
 * Convert decimal to percentage (e.g., 0.029 -> 2.9)
 */
export function decimalToPercent(decimal: number): number {
  return decimal * 100
}

/**
 * Calculate margin percentage from revenue and cost
 */
export function calculateMarginPercent(revenue: number, cost: number): number {
  if (revenue === 0) return 0
  return ((revenue - cost) / revenue) * 100
}

/**
 * Calculate the required price to achieve a target margin
 */
export function calculatePriceForMargin(cost: number, targetMarginPercent: number): number {
  if (targetMarginPercent >= 100) return Infinity
  return cost / (1 - targetMarginPercent / 100)
}

/**
 * Calculate COGS from price and target margin
 */
export function calculateCOGSForMargin(price: number, targetMarginPercent: number): number {
  return price * (1 - targetMarginPercent / 100)
}
