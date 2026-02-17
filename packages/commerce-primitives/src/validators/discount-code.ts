/**
 * Discount Code Validators
 *
 * Utilities for validating discount codes.
 */

import type { Discount } from '@cgk-platform/commerce'

/**
 * Validation result for discount codes
 */
export interface DiscountValidationResult {
  /** Whether the code is valid format */
  isValidFormat: boolean
  /** Whether the code is currently active */
  isActive: boolean
  /** Whether usage limit has been reached */
  isUsageLimitReached: boolean
  /** Whether the code has expired */
  isExpired: boolean
  /** Error message if validation failed */
  error?: string
  /** The validated discount if valid */
  discount?: Discount
}

/**
 * Discount code format requirements
 */
export const DISCOUNT_CODE_REQUIREMENTS = {
  /** Minimum length */
  minLength: 3,
  /** Maximum length */
  maxLength: 50,
  /** Allowed characters regex */
  pattern: /^[A-Z0-9_-]+$/i,
} as const

/**
 * Validate discount code format
 *
 * @param code - Discount code to validate
 * @returns Validation result
 */
export function validateDiscountCodeFormat(code: string): {
  valid: boolean
  error?: string
} {
  if (!code) {
    return { valid: false, error: 'Discount code is required' }
  }

  const trimmed = code.trim()

  if (trimmed.length < DISCOUNT_CODE_REQUIREMENTS.minLength) {
    return {
      valid: false,
      error: `Code must be at least ${DISCOUNT_CODE_REQUIREMENTS.minLength} characters`,
    }
  }

  if (trimmed.length > DISCOUNT_CODE_REQUIREMENTS.maxLength) {
    return {
      valid: false,
      error: `Code must be no more than ${DISCOUNT_CODE_REQUIREMENTS.maxLength} characters`,
    }
  }

  if (!DISCOUNT_CODE_REQUIREMENTS.pattern.test(trimmed)) {
    return {
      valid: false,
      error: 'Code can only contain letters, numbers, underscores, and hyphens',
    }
  }

  return { valid: true }
}

/**
 * Validate a discount code against its constraints
 *
 * @param discount - Discount object to validate
 * @returns Validation result
 */
export function validateDiscountCode(discount: Discount): DiscountValidationResult {
  const now = new Date()
  const result: DiscountValidationResult = {
    isValidFormat: true,
    isActive: true,
    isUsageLimitReached: false,
    isExpired: false,
    discount,
  }

  // Check format
  const formatResult = validateDiscountCodeFormat(discount.code)
  if (!formatResult.valid) {
    result.isValidFormat = false
    result.error = formatResult.error
    return result
  }

  // Check if discount has started
  if (discount.startsAt) {
    const startsAt = new Date(discount.startsAt)
    if (now < startsAt) {
      result.isActive = false
      result.error = 'This discount is not yet active'
      return result
    }
  }

  // Check if discount has expired
  if (discount.endsAt) {
    const endsAt = new Date(discount.endsAt)
    if (now > endsAt) {
      result.isExpired = true
      result.isActive = false
      result.error = 'This discount has expired'
      return result
    }
  }

  // Check usage limit
  if (discount.usageLimit !== undefined && discount.usageCount >= discount.usageLimit) {
    result.isUsageLimitReached = true
    result.isActive = false
    result.error = 'This discount has reached its usage limit'
    return result
  }

  return result
}

/**
 * Normalize discount code for comparison
 *
 * @param code - Discount code to normalize
 * @returns Normalized code (uppercase, trimmed)
 */
export function normalizeDiscountCode(code: string): string {
  return code.trim().toUpperCase()
}

/**
 * Check if two discount codes are the same (case-insensitive)
 *
 * @param a - First code
 * @param b - Second code
 * @returns True if codes are equivalent
 */
export function areDiscountCodesEqual(a: string, b: string): boolean {
  return normalizeDiscountCode(a) === normalizeDiscountCode(b)
}

/**
 * Format discount value for display
 *
 * @param discount - Discount to format
 * @returns Formatted discount string
 */
export function formatDiscountValue(discount: Discount): string {
  switch (discount.type) {
    case 'percentage':
      return `${discount.value}% off`
    case 'fixed_amount':
      return `$${discount.value.toFixed(2)} off`
    case 'free_shipping':
      return 'Free shipping'
    default:
      return `${discount.value} off`
  }
}

/**
 * Calculate discount amount for a subtotal
 *
 * @param discount - Discount to apply
 * @param subtotal - Subtotal amount
 * @returns Discount amount
 */
export function calculateDiscountAmount(discount: Discount, subtotal: number): number {
  // Check minimum requirement
  if (discount.minimumRequirement) {
    const minAmount = parseFloat(discount.minimumRequirement.amount)
    if (subtotal < minAmount) {
      return 0
    }
  }

  switch (discount.type) {
    case 'percentage':
      return subtotal * (discount.value / 100)
    case 'fixed_amount':
      return Math.min(discount.value, subtotal) // Don't discount more than subtotal
    case 'free_shipping':
      return 0 // Shipping discount handled separately
    default:
      return 0
  }
}

/**
 * Check if order meets minimum requirement for discount
 *
 * @param discount - Discount to check
 * @param subtotal - Order subtotal
 * @returns Whether minimum is met and amount needed
 */
export function checkMinimumRequirement(
  discount: Discount,
  subtotal: number
): { met: boolean; remaining: number } {
  if (!discount.minimumRequirement) {
    return { met: true, remaining: 0 }
  }

  const minAmount = parseFloat(discount.minimumRequirement.amount)
  const remaining = Math.max(0, minAmount - subtotal)

  return {
    met: subtotal >= minAmount,
    remaining,
  }
}
