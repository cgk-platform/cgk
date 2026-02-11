/**
 * Traffic Allocation Algorithm
 *
 * Assigns visitors to variants based on traffic allocation percentages.
 * Supports both fixed allocation and dynamic MAB-based allocation.
 */

import type { ABVariant } from '../types.js'
import { getNormalizedHash } from './hash.js'

/**
 * Assign a visitor to a variant based on traffic allocation
 *
 * Uses deterministic hashing to ensure:
 * - Same visitor always gets same variant for same test
 * - Distribution matches allocation percentages
 *
 * @param visitorId - Unique visitor identifier
 * @param testId - Test identifier
 * @param variants - Array of variants with allocation percentages
 * @returns Selected variant
 */
export function assignVariant(
  visitorId: string,
  testId: string,
  variants: ABVariant[]
): ABVariant {
  if (variants.length === 0) {
    throw new Error('Cannot assign variant: no variants available')
  }

  if (variants.length === 1) {
    return variants[0]!
  }

  // Validate allocations sum to ~100%
  const totalAllocation = variants.reduce((sum, v) => sum + v.trafficAllocation, 0)
  if (totalAllocation < 99 || totalAllocation > 101) {
    console.warn(
      `Traffic allocations sum to ${totalAllocation}%, expected ~100%. ` +
        'Assignment may not match intended distribution.'
    )
  }

  // Get normalized hash (0-1)
  const normalizedHash = getNormalizedHash(visitorId, testId)
  const targetBucket = normalizedHash * 100

  // Walk through variants by allocation
  let cumulativeAllocation = 0
  for (const variant of variants) {
    cumulativeAllocation += variant.trafficAllocation
    if (targetBucket < cumulativeAllocation) {
      return variant
    }
  }

  // Fallback to control variant (shouldn't happen with valid allocations)
  const controlVariant = variants.find((v) => v.isControl)
  if (controlVariant) {
    return controlVariant
  }

  // Last resort: return first variant
  return variants[0]!
}

/**
 * Calculate new allocations based on variant performance
 * Used by MAB algorithms to redistribute traffic
 *
 * @param allocations - Map of variant ID to new allocation percentage
 * @param variants - Current variants
 * @param minAllocation - Minimum allocation per variant (prevents starvation)
 * @returns Updated variants with new allocations
 */
export function applyAllocations(
  allocations: Map<string, number>,
  variants: ABVariant[],
  minAllocation: number = 5
): ABVariant[] {
  // Calculate total allocation
  let total = 0
  for (const [, allocation] of allocations) {
    total += Math.max(allocation, minAllocation)
  }

  // Normalize to 100%
  const normalizedAllocations = new Map<string, number>()
  for (const [variantId, allocation] of allocations) {
    const adjustedAllocation = Math.max(allocation, minAllocation)
    normalizedAllocations.set(variantId, Math.round((adjustedAllocation / total) * 100))
  }

  // Ensure allocations sum to exactly 100
  let allocatedSum = 0
  for (const [, allocation] of normalizedAllocations) {
    allocatedSum += allocation
  }

  // Adjust first variant to make sum exactly 100
  if (allocatedSum !== 100 && variants.length > 0) {
    const firstVariantId = variants[0]!.id
    const currentAllocation = normalizedAllocations.get(firstVariantId) || 0
    normalizedAllocations.set(firstVariantId, currentAllocation + (100 - allocatedSum))
  }

  // Apply to variants
  return variants.map((v) => ({
    ...v,
    trafficAllocation: normalizedAllocations.get(v.id) || v.trafficAllocation,
  }))
}

/**
 * Validate variant allocations
 *
 * @param variants - Variants to validate
 * @returns Validation result with any issues
 */
export function validateAllocations(
  variants: ABVariant[]
): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  if (variants.length === 0) {
    issues.push('At least one variant is required')
    return { valid: false, issues }
  }

  const totalAllocation = variants.reduce((sum, v) => sum + v.trafficAllocation, 0)

  if (totalAllocation < 99) {
    issues.push(`Total allocation is ${totalAllocation}%, should be ~100%`)
  }

  if (totalAllocation > 101) {
    issues.push(`Total allocation is ${totalAllocation}%, exceeds 100%`)
  }

  const controlVariants = variants.filter((v) => v.isControl)
  if (controlVariants.length === 0) {
    issues.push('No control variant specified')
  }

  if (controlVariants.length > 1) {
    issues.push('Multiple control variants specified')
  }

  for (const variant of variants) {
    if (variant.trafficAllocation < 0) {
      issues.push(`Variant "${variant.name}" has negative allocation`)
    }
    if (variant.trafficAllocation > 100) {
      issues.push(`Variant "${variant.name}" has allocation > 100%`)
    }
  }

  return { valid: issues.length === 0, issues }
}
