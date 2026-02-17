/**
 * Cart Validators
 *
 * Utilities for validating cart operations.
 */

import type { Cart, CartLine, ProductVariant } from '@cgk-platform/commerce'
import type { CartValidationResult, CartValidationError } from '../types/cart'
import { MAX_LINE_QUANTITY, MIN_LINE_QUANTITY, MAX_CART_LINES } from '../constants/cart'

/**
 * Validate quantity for cart operations
 *
 * @param quantity - Quantity to validate
 * @returns Validation result
 */
export function validateQuantity(quantity: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(quantity)) {
    return { valid: false, error: 'Quantity must be a whole number' }
  }

  if (quantity < MIN_LINE_QUANTITY) {
    return { valid: false, error: `Quantity must be at least ${MIN_LINE_QUANTITY}` }
  }

  if (quantity > MAX_LINE_QUANTITY) {
    return { valid: false, error: `Quantity cannot exceed ${MAX_LINE_QUANTITY}` }
  }

  return { valid: true }
}

/**
 * Validate variant for adding to cart
 *
 * @param variant - Variant to validate
 * @returns Validation result
 */
export function validateVariant(variant: ProductVariant): { valid: boolean; error?: string } {
  if (!variant) {
    return { valid: false, error: 'Variant is required' }
  }

  if (!variant.id) {
    return { valid: false, error: 'Variant ID is required' }
  }

  if (!variant.availableForSale) {
    return { valid: false, error: 'This item is currently out of stock' }
  }

  return { valid: true }
}

/**
 * Validate an add to cart operation
 *
 * @param variant - Variant to add
 * @param quantity - Quantity to add
 * @param cart - Current cart (optional)
 * @returns Validation result
 */
export function validateAddToCart(
  variant: ProductVariant,
  quantity: number,
  cart?: Cart | null
): { valid: boolean; error?: string } {
  // Validate variant
  const variantResult = validateVariant(variant)
  if (!variantResult.valid) {
    return variantResult
  }

  // Validate quantity
  const quantityResult = validateQuantity(quantity)
  if (!quantityResult.valid) {
    return quantityResult
  }

  // Check if adding would exceed max lines
  if (cart) {
    const existingLine = cart.lines.find((line) => line.merchandise.id === variant.id)
    if (!existingLine && cart.lines.length >= MAX_CART_LINES) {
      return { valid: false, error: `Cart cannot have more than ${MAX_CART_LINES} items` }
    }

    // Check if total quantity would exceed max
    if (existingLine) {
      const newQuantity = existingLine.quantity + quantity
      const totalResult = validateQuantity(newQuantity)
      if (!totalResult.valid) {
        return totalResult
      }
    }
  }

  return { valid: true }
}

/**
 * Validate an update quantity operation
 *
 * @param line - Cart line to update
 * @param newQuantity - New quantity
 * @returns Validation result
 */
export function validateUpdateQuantity(
  line: CartLine,
  newQuantity: number
): { valid: boolean; error?: string } {
  // Validate new quantity
  const quantityResult = validateQuantity(newQuantity)
  if (!quantityResult.valid) {
    return quantityResult
  }

  // Check if variant is still available
  if (!line.merchandise.availableForSale) {
    return { valid: false, error: 'This item is no longer available' }
  }

  return { valid: true }
}

/**
 * Validate entire cart state
 *
 * @param cart - Cart to validate
 * @returns Validation result with all errors
 */
export function validateCart(cart: Cart): CartValidationResult {
  const errors: CartValidationError[] = []
  const warnings: string[] = []

  // Check each line
  for (const line of cart.lines) {
    // Check if item is available
    if (!line.merchandise.availableForSale) {
      errors.push({
        code: 'OUT_OF_STOCK',
        message: `${line.merchandise.title} is out of stock`,
        lineId: line.id,
      })
    }

    // Check quantity
    const quantityResult = validateQuantity(line.quantity)
    if (!quantityResult.valid) {
      errors.push({
        code: 'QUANTITY_EXCEEDED',
        message: quantityResult.error || 'Invalid quantity',
        lineId: line.id,
        context: { quantity: line.quantity },
      })
    }
  }

  // Check for too many lines
  if (cart.lines.length > MAX_CART_LINES) {
    warnings.push(`Cart has more than ${MAX_CART_LINES} items`)
  }

  // Check for invalid discount codes
  for (const discountCode of cart.discountCodes) {
    if (!discountCode.applicable) {
      warnings.push(`Discount code "${discountCode.code}" is not applicable`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate cart attributes
 *
 * @param attributes - Attributes to validate
 * @returns Validation result
 */
export function validateCartAttributes(
  attributes: Array<{ key: string; value: string }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const attr of attributes) {
    // Key validation
    if (!attr.key || attr.key.trim().length === 0) {
      errors.push('Attribute key cannot be empty')
    } else if (attr.key.length > 100) {
      errors.push(`Attribute key "${attr.key}" is too long (max 100 characters)`)
    }

    // Value validation
    if (attr.value && attr.value.length > 1000) {
      errors.push(`Attribute value for "${attr.key}" is too long (max 1000 characters)`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Check if cart is ready for checkout
 *
 * @param cart - Cart to check
 * @returns Whether cart can proceed to checkout
 */
export function isCartCheckoutReady(cart: Cart): {
  ready: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Must have items
  if (cart.lines.length === 0) {
    issues.push('Cart is empty')
  }

  // All items must be available
  const unavailableLines = cart.lines.filter((line) => !line.merchandise.availableForSale)
  if (unavailableLines.length > 0) {
    issues.push(`${unavailableLines.length} item(s) are out of stock`)
  }

  // Quantities must be valid
  for (const line of cart.lines) {
    if (line.quantity < MIN_LINE_QUANTITY || line.quantity > MAX_LINE_QUANTITY) {
      issues.push(`Invalid quantity for ${line.merchandise.title}`)
    }
  }

  return {
    ready: issues.length === 0,
    issues,
  }
}

/**
 * Get items that need attention before checkout
 *
 * @param cart - Cart to check
 * @returns Lines that have issues
 */
export function getCartIssueLines(cart: Cart): {
  outOfStock: CartLine[]
  quantityIssues: CartLine[]
} {
  const outOfStock: CartLine[] = []
  const quantityIssues: CartLine[] = []

  for (const line of cart.lines) {
    if (!line.merchandise.availableForSale) {
      outOfStock.push(line)
    }

    const quantityResult = validateQuantity(line.quantity)
    if (!quantityResult.valid) {
      quantityIssues.push(line)
    }
  }

  return { outOfStock, quantityIssues }
}
