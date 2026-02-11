/**
 * Multiple Testing Correction
 *
 * Implements Holm-Bonferroni and other correction methods for
 * controlling family-wise error rate when testing multiple variants.
 */

/**
 * Result of Holm-Bonferroni correction
 */
export interface HolmResult {
  /** Individual comparison results */
  comparisons: HolmComparison[]
  /** Family-wise error rate (alpha) */
  familyWiseErrorRate: number
  /** Number of significant results after correction */
  significantCount: number
  /** Whether any comparison is significant */
  hasSignificantResult: boolean
  /** Summary message */
  message: string
}

/**
 * Individual comparison in Holm procedure
 */
export interface HolmComparison {
  /** First variant in comparison */
  variantA: string
  /** Second variant in comparison */
  variantB: string
  /** Original p-value from the test */
  originalPValue: number
  /** Adjusted alpha threshold for this comparison */
  adjustedAlpha: number
  /** Whether this comparison is significant after correction */
  isSignificant: boolean
  /** Rank in sorted p-values (1 = smallest) */
  rank: number
}

/**
 * Input for multiple comparison correction
 */
export interface ComparisonInput {
  /** Identifier for the comparison (e.g., "control_vs_variant_a") */
  comparison: string
  /** P-value from the statistical test */
  pValue: number
  /** Optional: First variant ID */
  variantA?: string
  /** Optional: Second variant ID */
  variantB?: string
}

/**
 * Holm-Bonferroni step-down procedure for multiple comparisons
 *
 * Controls family-wise error rate more powerfully than Bonferroni.
 * Tests comparisons sequentially from smallest p-value.
 *
 * @param pValues - Array of p-values with comparison identifiers
 * @param alpha - Family-wise error rate (default 0.05)
 * @returns Holm correction result
 */
export function holmBonferroniCorrection(
  pValues: ComparisonInput[],
  alpha: number = 0.05
): HolmResult {
  if (pValues.length === 0) {
    return {
      comparisons: [],
      familyWiseErrorRate: alpha,
      significantCount: 0,
      hasSignificantResult: false,
      message: 'No comparisons provided',
    }
  }

  const m = pValues.length // Number of comparisons

  // Sort by p-value ascending
  const sorted = [...pValues]
    .map((item, originalIndex) => ({ ...item, originalIndex }))
    .sort((a, b) => a.pValue - b.pValue)

  // Apply Holm-Bonferroni procedure
  const results: HolmComparison[] = []
  let foundNonSignificant = false

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i]!
    const rank = i + 1

    // Adjusted alpha = alpha / (m - i)
    const adjustedAlpha = alpha / (m - i)

    // Once we find a non-significant result, all subsequent are non-significant
    let isSignificant = false
    if (!foundNonSignificant) {
      if (item.pValue < adjustedAlpha) {
        isSignificant = true
      } else {
        foundNonSignificant = true
      }
    }

    // Parse comparison string if variants not provided
    let variantA = item.variantA
    let variantB = item.variantB
    if (!variantA || !variantB) {
      const parts = item.comparison.split('_vs_')
      if (parts.length === 2) {
        variantA = parts[0]
        variantB = parts[1]
      } else {
        variantA = item.comparison
        variantB = 'unknown'
      }
    }

    results.push({
      variantA: variantA!,
      variantB: variantB!,
      originalPValue: item.pValue,
      adjustedAlpha,
      isSignificant,
      rank,
    })
  }

  // Re-sort by original order for consistency
  results.sort((a, b) => {
    const aIdx = sorted.findIndex(
      (s) => s.variantA === a.variantA && s.variantB === a.variantB
    )
    const bIdx = sorted.findIndex(
      (s) => s.variantA === b.variantA && s.variantB === b.variantB
    )
    return aIdx - bIdx
  })

  const significantCount = results.filter((r) => r.isSignificant).length

  return {
    comparisons: results,
    familyWiseErrorRate: alpha,
    significantCount,
    hasSignificantResult: significantCount > 0,
    message: generateHolmMessage(results, m, alpha),
  }
}

/**
 * Generate human-readable message for Holm results
 */
function generateHolmMessage(
  results: HolmComparison[],
  totalComparisons: number,
  alpha: number
): string {
  const sigCount = results.filter((r) => r.isSignificant).length

  if (sigCount === 0) {
    return `No significant differences found after Holm-Bonferroni correction (${totalComparisons} comparisons, alpha=${alpha}).`
  }

  if (sigCount === totalComparisons) {
    return `All ${totalComparisons} comparisons are significant after Holm-Bonferroni correction (alpha=${alpha}).`
  }

  const sigComparisons = results
    .filter((r) => r.isSignificant)
    .map((r) => `${r.variantA} vs ${r.variantB}`)
    .join(', ')

  return `${sigCount} of ${totalComparisons} comparisons significant after Holm-Bonferroni correction: ${sigComparisons}.`
}

/**
 * Bonferroni correction (simpler but more conservative)
 *
 * @param pValues - Array of p-values
 * @param alpha - Family-wise error rate
 * @returns Adjusted significance threshold
 */
export function bonferroniCorrection(
  pValues: ComparisonInput[],
  alpha: number = 0.05
): {
  adjustedAlpha: number
  significantComparisons: string[]
} {
  const m = pValues.length
  const adjustedAlpha = alpha / m

  const significantComparisons = pValues
    .filter((p) => p.pValue < adjustedAlpha)
    .map((p) => p.comparison)

  return {
    adjustedAlpha,
    significantComparisons,
  }
}

/**
 * Benjamini-Hochberg procedure (controls FDR instead of FWER)
 *
 * Less conservative than Holm-Bonferroni, controls false discovery rate.
 * Good for exploratory analysis with many variants.
 *
 * @param pValues - Array of p-values
 * @param fdr - False discovery rate (default 0.05)
 * @returns Adjusted results
 */
export function benjaminiHochbergCorrection(
  pValues: ComparisonInput[],
  fdr: number = 0.05
): {
  comparisons: Array<ComparisonInput & { isSignificant: boolean; adjustedThreshold: number }>
  significantCount: number
  falseDiscoveryRate: number
} {
  if (pValues.length === 0) {
    return {
      comparisons: [],
      significantCount: 0,
      falseDiscoveryRate: fdr,
    }
  }

  const m = pValues.length

  // Sort by p-value ascending
  const sorted = [...pValues].sort((a, b) => a.pValue - b.pValue)

  // Find largest k such that p(k) <= (k/m) * FDR
  let k = 0
  for (let i = 0; i < m; i++) {
    const threshold = ((i + 1) / m) * fdr
    if (sorted[i]!.pValue <= threshold) {
      k = i + 1
    }
  }

  // All p-values with rank <= k are significant
  const results = pValues.map((p) => {
    const rank = sorted.findIndex((s) => s.comparison === p.comparison) + 1
    const threshold = (rank / m) * fdr
    return {
      ...p,
      isSignificant: rank <= k,
      adjustedThreshold: threshold,
    }
  })

  return {
    comparisons: results,
    significantCount: k,
    falseDiscoveryRate: fdr,
  }
}

/**
 * Calculate the number of pairwise comparisons for n variants
 *
 * @param numVariants - Number of variants including control
 * @returns Number of pairwise comparisons
 */
export function calculatePairwiseComparisons(numVariants: number): number {
  // C(n, 2) = n * (n-1) / 2
  return (numVariants * (numVariants - 1)) / 2
}

/**
 * Calculate the number of comparisons against control
 *
 * @param numVariants - Number of variants including control
 * @returns Number of comparisons (each variant vs control)
 */
export function calculateControlComparisons(numVariants: number): number {
  return numVariants - 1
}

/**
 * Generate all pairwise comparison identifiers
 *
 * @param variantIds - Array of variant IDs
 * @returns Array of comparison identifiers
 */
export function generatePairwiseComparisons(
  variantIds: string[]
): Array<{ variantA: string; variantB: string; comparison: string }> {
  const comparisons: Array<{
    variantA: string
    variantB: string
    comparison: string
  }> = []

  for (let i = 0; i < variantIds.length; i++) {
    for (let j = i + 1; j < variantIds.length; j++) {
      const variantA = variantIds[i]!
      const variantB = variantIds[j]!
      comparisons.push({
        variantA,
        variantB,
        comparison: `${variantA}_vs_${variantB}`,
      })
    }
  }

  return comparisons
}

/**
 * Generate comparisons against control variant
 *
 * @param controlId - ID of the control variant
 * @param variantIds - IDs of treatment variants
 * @returns Array of comparison identifiers
 */
export function generateControlComparisons(
  controlId: string,
  variantIds: string[]
): Array<{ variantA: string; variantB: string; comparison: string }> {
  return variantIds.map((variantId) => ({
    variantA: controlId,
    variantB: variantId,
    comparison: `${controlId}_vs_${variantId}`,
  }))
}

/**
 * Determine if multiple testing correction is needed
 *
 * @param numVariants - Number of variants in the test
 * @returns Whether correction should be applied
 */
export function requiresMultipleTestingCorrection(numVariants: number): boolean {
  // Correction needed for 3+ variants (2+ treatment variants)
  return numVariants >= 3
}

/**
 * Select appropriate correction method based on analysis type
 *
 * @param analysisType - Type of analysis being performed
 * @param numComparisons - Number of comparisons
 * @returns Recommended correction method
 */
export function recommendCorrectionMethod(
  analysisType: 'confirmatory' | 'exploratory',
  numComparisons: number
): {
  method: 'holm' | 'bonferroni' | 'bh' | 'none'
  reason: string
} {
  if (numComparisons <= 1) {
    return {
      method: 'none',
      reason: 'Single comparison does not require correction.',
    }
  }

  if (analysisType === 'confirmatory') {
    if (numComparisons <= 5) {
      return {
        method: 'holm',
        reason:
          'Holm-Bonferroni provides strong FWER control with better power than Bonferroni.',
      }
    }
    return {
      method: 'holm',
      reason:
        'Holm-Bonferroni recommended for confirmatory analysis with multiple comparisons.',
    }
  }

  // Exploratory analysis
  if (numComparisons > 10) {
    return {
      method: 'bh',
      reason:
        'Benjamini-Hochberg controls FDR and is more powerful for many comparisons in exploratory analysis.',
    }
  }

  return {
    method: 'holm',
    reason:
      'Holm-Bonferroni provides good balance of power and error control.',
  }
}

/**
 * Apply the recommended correction to a set of p-values
 */
export function applyRecommendedCorrection(
  pValues: ComparisonInput[],
  analysisType: 'confirmatory' | 'exploratory' = 'confirmatory',
  alpha: number = 0.05
): {
  method: string
  results: Array<{
    comparison: string
    pValue: number
    isSignificant: boolean
  }>
  significantCount: number
} {
  const { method } = recommendCorrectionMethod(analysisType, pValues.length)

  switch (method) {
    case 'holm': {
      const holm = holmBonferroniCorrection(pValues, alpha)
      return {
        method: 'Holm-Bonferroni',
        results: holm.comparisons.map((c) => ({
          comparison: `${c.variantA}_vs_${c.variantB}`,
          pValue: c.originalPValue,
          isSignificant: c.isSignificant,
        })),
        significantCount: holm.significantCount,
      }
    }
    case 'bh': {
      const bh = benjaminiHochbergCorrection(pValues, alpha)
      return {
        method: 'Benjamini-Hochberg',
        results: bh.comparisons.map((c) => ({
          comparison: c.comparison,
          pValue: c.pValue,
          isSignificant: c.isSignificant,
        })),
        significantCount: bh.significantCount,
      }
    }
    case 'bonferroni': {
      const bonf = bonferroniCorrection(pValues, alpha)
      return {
        method: 'Bonferroni',
        results: pValues.map((p) => ({
          comparison: p.comparison,
          pValue: p.pValue,
          isSignificant: p.pValue < bonf.adjustedAlpha,
        })),
        significantCount: bonf.significantComparisons.length,
      }
    }
    default:
      return {
        method: 'None',
        results: pValues.map((p) => ({
          comparison: p.comparison,
          pValue: p.pValue,
          isSignificant: p.pValue < alpha,
        })),
        significantCount: pValues.filter((p) => p.pValue < alpha).length,
      }
  }
}
