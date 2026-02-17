/**
 * Product Formatters
 *
 * Utilities for formatting product data for display.
 */

import type { Product, ProductVariant, PriceRange, Money, SelectedOption } from '@cgk-platform/commerce'
import { formatMoney, type FormatMoneyOptions } from './money'

/**
 * Format product for display with computed properties
 *
 * @param product - Product to format
 * @returns Formatted product with display helpers
 */
export interface FormattedProduct {
  /** Original product data */
  product: Product
  /** Formatted price range string */
  priceDisplay: string
  /** Whether there's a sale (compare at price exists) */
  onSale: boolean
  /** Sale percentage (if on sale) */
  salePercentage: number | null
  /** Primary image URL */
  primaryImageUrl: string | null
  /** Whether product has multiple variants */
  hasVariants: boolean
  /** Number of variants */
  variantCount: number
  /** Available option names */
  optionNames: string[]
  /** Whether all variants are sold out */
  soldOut: boolean
}

/**
 * Format a product for display
 *
 * @param product - Product to format
 * @param options - Formatting options for money
 * @returns Formatted product with display helpers
 */
export function formatProduct(product: Product, options?: FormatMoneyOptions): FormattedProduct {
  const { priceRange, variants, images } = product

  // Check for sale across variants
  const onSale = variants.some((v) => v.compareAtPrice !== undefined && v.compareAtPrice !== null)

  // Calculate sale percentage from first variant with sale
  const saleVariant = variants.find((v) => v.compareAtPrice)
  const salePercentage = saleVariant?.compareAtPrice
    ? calculateSalePercentage(saleVariant.price, saleVariant.compareAtPrice)
    : null

  // Check if all variants are sold out
  const soldOut = !product.availableForSale || variants.every((v) => !v.availableForSale)

  // Collect unique option names
  const optionNames = getUniqueOptionNames(variants)

  return {
    product,
    priceDisplay: formatPriceRange(priceRange, options),
    onSale,
    salePercentage,
    primaryImageUrl: images[0]?.url ?? null,
    hasVariants: variants.length > 1,
    variantCount: variants.length,
    optionNames,
    soldOut,
  }
}

/**
 * Format price range for display
 *
 * @param priceRange - Price range to format
 * @param options - Formatting options
 * @returns Formatted price string (e.g., "$29.99" or "$29.99 - $49.99")
 */
export function formatPriceRange(priceRange: PriceRange, options?: FormatMoneyOptions): string {
  const { minVariantPrice, maxVariantPrice } = priceRange

  const minFormatted = formatMoney(minVariantPrice, options)
  const maxFormatted = formatMoney(maxVariantPrice, options)

  // If same price, show single price
  if (minVariantPrice.amount === maxVariantPrice.amount) {
    return minFormatted
  }

  return `${minFormatted} - ${maxFormatted}`
}

/**
 * Get price range from variants
 *
 * @param variants - Array of product variants
 * @returns Price range with min and max prices
 */
export function getPriceRange(variants: ProductVariant[]): PriceRange {
  if (variants.length === 0) {
    return {
      minVariantPrice: { amount: '0.00', currencyCode: 'USD' },
      maxVariantPrice: { amount: '0.00', currencyCode: 'USD' },
    }
  }

  const prices = variants.map((v) => parseFloat(v.price.amount))
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const firstVariant = variants[0]
  const currencyCode = firstVariant?.price.currencyCode ?? 'USD'

  return {
    minVariantPrice: { amount: minPrice.toFixed(2), currencyCode },
    maxVariantPrice: { amount: maxPrice.toFixed(2), currencyCode },
  }
}

/**
 * Calculate sale percentage
 *
 * @param currentPrice - Current/sale price
 * @param compareAtPrice - Original price
 * @returns Percentage off (0-100)
 */
export function calculateSalePercentage(currentPrice: Money, compareAtPrice: Money): number {
  const current = parseFloat(currentPrice.amount)
  const original = parseFloat(compareAtPrice.amount)

  if (original <= 0 || current >= original) {
    return 0
  }

  return Math.round(((original - current) / original) * 100)
}

/**
 * Format variant title for display
 *
 * @param variant - Variant to format
 * @returns Formatted variant title
 */
export function formatVariantTitle(variant: ProductVariant): string {
  if (variant.selectedOptions.length === 0) {
    return variant.title
  }

  return variant.selectedOptions.map((o) => o.value).join(' / ')
}

/**
 * Format selected options as a string
 *
 * @param options - Selected options array
 * @returns Formatted options string
 */
export function formatSelectedOptions(options: SelectedOption[]): string {
  return options.map((o) => `${o.name}: ${o.value}`).join(', ')
}

/**
 * Get unique option names from variants
 *
 * @param variants - Array of variants
 * @returns Unique option names
 */
export function getUniqueOptionNames(variants: ProductVariant[]): string[] {
  const names = new Set<string>()
  for (const variant of variants) {
    for (const option of variant.selectedOptions) {
      names.add(option.name)
    }
  }
  return Array.from(names)
}

/**
 * Get all values for a specific option across variants
 *
 * @param variants - Array of variants
 * @param optionName - Option name to get values for
 * @returns Array of unique option values
 */
export function getOptionValues(variants: ProductVariant[], optionName: string): string[] {
  const values = new Set<string>()
  for (const variant of variants) {
    const option = variant.selectedOptions.find((o) => o.name === optionName)
    if (option) {
      values.add(option.value)
    }
  }
  return Array.from(values)
}

/**
 * Get the cheapest available variant
 *
 * @param variants - Array of variants
 * @returns Cheapest available variant or null
 */
export function getCheapestVariant(variants: ProductVariant[]): ProductVariant | null {
  const available = variants.filter((v) => v.availableForSale)
  if (available.length === 0) return null

  return available.reduce((min, v) =>
    parseFloat(v.price.amount) < parseFloat(min.price.amount) ? v : min
  )
}

/**
 * Check if product has any available variants
 *
 * @param product - Product to check
 * @returns True if at least one variant is available
 */
export function isProductAvailable(product: Product): boolean {
  return product.availableForSale && product.variants.some((v) => v.availableForSale)
}
