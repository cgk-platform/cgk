/**
 * Variant Selection Utilities
 *
 * Utilities for working with product variant selection.
 */

import type { ProductVariant, SelectedOption } from '@cgk-platform/commerce'

/**
 * Build a unique key for a variant based on its options
 *
 * @param options - Selected options
 * @returns Unique variant key
 *
 * @example
 * buildVariantKey([{ name: 'Size', value: 'M' }, { name: 'Color', value: 'Blue' }])
 * // => 'Color:Blue|Size:M'
 */
export function buildVariantKey(options: SelectedOption[]): string {
  // Sort by option name for consistent keys
  const sorted = [...options].sort((a, b) => a.name.localeCompare(b.name))
  return sorted.map((o) => `${o.name}:${o.value}`).join('|')
}

/**
 * Parse a variant key back to selected options
 *
 * @param key - Variant key string
 * @returns Array of selected options
 */
export function parseVariantKey(key: string): SelectedOption[] {
  if (!key) return []

  return key.split('|').map((part) => {
    const [name, ...valueParts] = part.split(':')
    return {
      name: name ?? '',
      value: valueParts.join(':'), // Handle values with colons
    }
  })
}

/**
 * Compare two variants by their selected options
 *
 * @param a - First variant
 * @param b - Second variant
 * @returns True if variants have the same options
 */
export function compareVariants(a: ProductVariant, b: ProductVariant): boolean {
  return buildVariantKey(a.selectedOptions) === buildVariantKey(b.selectedOptions)
}

/**
 * Find a variant by its selected options
 *
 * @param variants - Array of variants to search
 * @param options - Selected options to match
 * @returns Matching variant or undefined
 */
export function findVariantByOptions(
  variants: ProductVariant[],
  options: SelectedOption[]
): ProductVariant | undefined {
  const targetKey = buildVariantKey(options)
  return variants.find((v) => buildVariantKey(v.selectedOptions) === targetKey)
}

/**
 * Find a variant by a partial set of options
 * Returns the first variant that matches all provided options
 *
 * @param variants - Array of variants to search
 * @param options - Partial options to match
 * @returns Matching variant or undefined
 */
export function findVariantByPartialOptions(
  variants: ProductVariant[],
  options: SelectedOption[]
): ProductVariant | undefined {
  return variants.find((variant) => {
    return options.every((option) =>
      variant.selectedOptions.some(
        (vo) => vo.name === option.name && vo.value === option.value
      )
    )
  })
}

/**
 * Get available options for a specific option name given current selections
 * Used to show which options are available based on current selection
 *
 * @param variants - All variants
 * @param optionName - Option name to get available values for
 * @param currentSelections - Current selected options (excluding the option we're querying)
 * @returns Available option values with availability info
 */
export function getAvailableOptionValues(
  variants: ProductVariant[],
  optionName: string,
  currentSelections: SelectedOption[] = []
): Array<{ value: string; available: boolean; inStock: boolean }> {
  const values = new Map<string, { available: boolean; inStock: boolean }>()

  for (const variant of variants) {
    // Check if variant matches current selections (excluding the option we're querying)
    const matchesSelections = currentSelections.every((selection) =>
      variant.selectedOptions.some(
        (vo) => vo.name === selection.name && vo.value === selection.value
      )
    )

    if (!matchesSelections) continue

    // Get the value for the option we're querying
    const option = variant.selectedOptions.find((o) => o.name === optionName)
    if (!option) continue

    const existing = values.get(option.value)
    if (!existing) {
      values.set(option.value, {
        available: true,
        inStock: variant.availableForSale,
      })
    } else if (variant.availableForSale) {
      // If any matching variant is in stock, mark as in stock
      existing.inStock = true
    }
  }

  return Array.from(values.entries()).map(([value, info]) => ({
    value,
    ...info,
  }))
}

/**
 * Build a selection matrix for a product
 * Returns all combinations of options with their availability
 *
 * @param variants - All variants
 * @returns Selection matrix
 */
export interface SelectionMatrix {
  options: Array<{
    name: string
    values: Array<{
      value: string
      available: boolean
      inStock: boolean
    }>
  }>
  variantMap: Map<string, ProductVariant>
}

export function buildSelectionMatrix(variants: ProductVariant[]): SelectionMatrix {
  // Collect unique option names
  const optionNames = new Set<string>()
  for (const variant of variants) {
    for (const option of variant.selectedOptions) {
      optionNames.add(option.name)
    }
  }

  // Build options with all values
  const options: SelectionMatrix['options'] = []
  for (const name of optionNames) {
    const valuesMap = new Map<string, { available: boolean; inStock: boolean }>()

    for (const variant of variants) {
      const option = variant.selectedOptions.find((o) => o.name === name)
      if (!option) continue

      const existing = valuesMap.get(option.value)
      if (!existing) {
        valuesMap.set(option.value, {
          available: true,
          inStock: variant.availableForSale,
        })
      } else if (variant.availableForSale && !existing.inStock) {
        existing.inStock = true
      }
    }

    options.push({
      name,
      values: Array.from(valuesMap.entries()).map(([value, info]) => ({
        value,
        ...info,
      })),
    })
  }

  // Build variant map for quick lookup
  const variantMap = new Map<string, ProductVariant>()
  for (const variant of variants) {
    variantMap.set(buildVariantKey(variant.selectedOptions), variant)
  }

  return { options, variantMap }
}

/**
 * Find the nearest available variant when selected variant is unavailable
 *
 * @param variants - All variants
 * @param currentOptions - Currently selected options
 * @returns Nearest available variant or undefined
 */
export function findNearestAvailableVariant(
  variants: ProductVariant[],
  currentOptions: SelectedOption[]
): ProductVariant | undefined {
  // First, try to find exact match that's available
  const exact = findVariantByOptions(variants, currentOptions)
  if (exact?.availableForSale) return exact

  // Try removing options one at a time to find closest match
  const availableVariants = variants.filter((v) => v.availableForSale)
  if (availableVariants.length === 0) return undefined

  // Score each available variant by how many options match
  let bestMatch: ProductVariant | undefined
  let bestScore = -1

  for (const variant of availableVariants) {
    let score = 0
    for (const option of currentOptions) {
      if (
        variant.selectedOptions.some(
          (vo) => vo.name === option.name && vo.value === option.value
        )
      ) {
        score++
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = variant
    }
  }

  return bestMatch
}

/**
 * Get the default variant for a product
 * Returns first available variant, or first variant if none available
 *
 * @param variants - All variants
 * @returns Default variant
 */
export function getDefaultVariant(variants: ProductVariant[]): ProductVariant | undefined {
  if (variants.length === 0) return undefined

  // Prefer first available variant
  const available = variants.find((v) => v.availableForSale)
  if (available) return available

  // Fall back to first variant
  return variants[0]
}

/**
 * Check if a specific option value is available given current selections
 *
 * @param variants - All variants
 * @param optionName - Option name to check
 * @param optionValue - Option value to check
 * @param currentSelections - Current selections (excluding the option being checked)
 * @returns Whether the option value is available
 */
export function isOptionValueAvailable(
  variants: ProductVariant[],
  optionName: string,
  optionValue: string,
  currentSelections: SelectedOption[] = []
): boolean {
  return variants.some((variant) => {
    // Must have the option value we're checking
    const hasOption = variant.selectedOptions.some(
      (o) => o.name === optionName && o.value === optionValue
    )
    if (!hasOption) return false

    // Must match current selections
    return currentSelections.every((selection) =>
      variant.selectedOptions.some(
        (vo) => vo.name === selection.name && vo.value === selection.value
      )
    )
  })
}
