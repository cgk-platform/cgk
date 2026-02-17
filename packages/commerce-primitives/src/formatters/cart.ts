/**
 * Cart Formatters
 *
 * Utilities for formatting cart data for display.
 */

import type { Cart, CartLine, Money } from '@cgk-platform/commerce'
import type { CartTotals } from '../types/cart'
import { formatMoney, addMoney, zeroMoney, type FormatMoneyOptions } from './money'

/**
 * Formatted cart with display helpers
 */
export interface FormattedCart {
  /** Original cart data */
  cart: Cart
  /** Formatted totals */
  totals: FormattedCartTotals
  /** Whether cart is empty */
  isEmpty: boolean
  /** Total number of items */
  itemCount: number
  /** Number of unique line items */
  lineCount: number
  /** Whether cart has discounts applied */
  hasDiscounts: boolean
  /** Total savings from discounts */
  savingsDisplay: string | null
}

/**
 * Formatted cart totals
 */
export interface FormattedCartTotals {
  /** Formatted subtotal */
  subtotal: string
  /** Formatted discount amount */
  discount: string | null
  /** Formatted tax */
  tax: string | null
  /** Formatted total */
  total: string
}

/**
 * Format a cart for display
 *
 * @param cart - Cart to format
 * @param options - Formatting options
 * @returns Formatted cart with display helpers
 */
export function formatCart(cart: Cart, options?: FormatMoneyOptions): FormattedCart {
  const totals = getCartTotals(cart)
  const hasDiscounts = cart.discountAllocations.length > 0

  // Calculate total savings from discounts
  const savings = cart.discountAllocations.reduce(
    (sum, allocation) => addMoney(sum, allocation.discountedAmount),
    zeroMoney(cart.cost.totalAmount.currencyCode)
  )

  return {
    cart,
    totals: {
      subtotal: formatMoney(totals.subtotal, options),
      discount: hasDiscounts ? formatMoney(totals.discount, options) : null,
      tax: totals.tax ? formatMoney(totals.tax, options) : null,
      total: formatMoney(totals.total, options),
    },
    isEmpty: cart.lines.length === 0,
    itemCount: cart.totalQuantity,
    lineCount: cart.lines.length,
    hasDiscounts,
    savingsDisplay: hasDiscounts ? formatMoney(savings, options) : null,
  }
}

/**
 * Get cart totals as Money objects
 *
 * @param cart - Cart to calculate totals for
 * @returns Cart totals
 */
export function getCartTotals(cart: Cart): CartTotals {
  const currencyCode = cart.cost.totalAmount.currencyCode

  // Calculate discount total from allocations
  const discountTotal = cart.discountAllocations.reduce(
    (sum, allocation) => addMoney(sum, allocation.discountedAmount),
    zeroMoney(currencyCode)
  )

  return {
    subtotal: cart.cost.subtotalAmount,
    discount: discountTotal,
    tax: cart.cost.totalTaxAmount ?? null,
    shipping: null, // Shipping not available until checkout
    total: cart.cost.totalAmount,
    itemCount: cart.totalQuantity,
    lineCount: cart.lines.length,
  }
}

/**
 * Format a single cart line for display
 *
 * @param line - Cart line to format
 * @param options - Formatting options
 * @returns Formatted line data
 */
export interface FormattedCartLine {
  /** Line ID */
  id: string
  /** Quantity */
  quantity: number
  /** Product title */
  title: string
  /** Variant title */
  variantTitle: string
  /** Formatted unit price */
  unitPrice: string
  /** Formatted line total */
  lineTotal: string
  /** Product image URL */
  imageUrl: string | null
  /** Whether variant is available */
  available: boolean
}

export function formatCartLine(line: CartLine, options?: FormatMoneyOptions): FormattedCartLine {
  const { merchandise } = line

  return {
    id: line.id,
    quantity: line.quantity,
    title: merchandise.title,
    variantTitle: merchandise.title,
    unitPrice: formatMoney(line.cost.amountPerQuantity, options),
    lineTotal: formatMoney(line.cost.totalAmount, options),
    imageUrl: merchandise.image?.url ?? null,
    available: merchandise.availableForSale,
  }
}

/**
 * Calculate total items in cart
 *
 * @param cart - Cart or null
 * @returns Total quantity of items
 */
export function getCartItemCount(cart: Cart | null): number {
  if (!cart) return 0
  return cart.totalQuantity
}

/**
 * Check if cart is empty
 *
 * @param cart - Cart or null
 * @returns True if cart is empty or null
 */
export function isCartEmpty(cart: Cart | null): boolean {
  return !cart || cart.lines.length === 0
}

/**
 * Get applied discount codes
 *
 * @param cart - Cart to check
 * @returns Array of applied discount codes
 */
export function getAppliedDiscountCodes(cart: Cart): string[] {
  return cart.discountCodes.filter((d) => d.applicable).map((d) => d.code)
}

/**
 * Check if a specific discount code is applied
 *
 * @param cart - Cart to check
 * @param code - Discount code to look for
 * @returns True if code is applied
 */
export function hasDiscountCode(cart: Cart, code: string): boolean {
  const normalizedCode = code.toUpperCase().trim()
  return cart.discountCodes.some((d) => d.code.toUpperCase() === normalizedCode && d.applicable)
}

/**
 * Get lines that are out of stock or unavailable
 *
 * @param cart - Cart to check
 * @returns Array of unavailable lines
 */
export function getUnavailableLines(cart: Cart): CartLine[] {
  return cart.lines.filter((line) => !line.merchandise.availableForSale)
}

/**
 * Get total savings from compare at prices
 *
 * @param cart - Cart to calculate savings for
 * @returns Savings amount or null if no savings
 */
export function getCartSavings(cart: Cart): Money | null {
  const currencyCode = cart.cost.totalAmount.currencyCode
  let totalSavings = 0

  for (const line of cart.lines) {
    const { merchandise, quantity } = line
    if (merchandise.compareAtPrice) {
      const compareAt = parseFloat(merchandise.compareAtPrice.amount)
      const current = parseFloat(merchandise.price.amount)
      if (compareAt > current) {
        totalSavings += (compareAt - current) * quantity
      }
    }
  }

  // Add discount allocations
  for (const allocation of cart.discountAllocations) {
    totalSavings += parseFloat(allocation.discountedAmount.amount)
  }

  if (totalSavings <= 0) return null

  return {
    amount: totalSavings.toFixed(2),
    currencyCode,
  }
}
