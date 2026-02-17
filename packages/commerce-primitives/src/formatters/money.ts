/**
 * Money Formatters
 *
 * Utilities for formatting and parsing money values.
 */

import type { Money } from '@cgk-platform/commerce'

/**
 * Options for formatting money
 */
export interface FormatMoneyOptions {
  /** Locale for formatting (default: 'en-US') */
  locale?: string
  /** Show currency symbol (default: true) */
  showCurrency?: boolean
  /** Number of decimal places (default: 2) */
  decimals?: number
  /** Show cents/minor units (default: true) */
  showCents?: boolean
  /** Use narrow symbol if available (e.g., "$" instead of "US$") */
  useNarrowSymbol?: boolean
}

/**
 * Format a Money object for display
 *
 * @param money - Money object with amount and currencyCode
 * @param options - Formatting options
 * @returns Formatted money string
 *
 * @example
 * formatMoney({ amount: '29.99', currencyCode: 'USD' })
 * // => "$29.99"
 *
 * formatMoney({ amount: '1500.00', currencyCode: 'EUR' }, { locale: 'de-DE' })
 * // => "1.500,00 €"
 */
export function formatMoney(money: Money, options: FormatMoneyOptions = {}): string {
  const {
    locale = 'en-US',
    showCurrency = true,
    decimals = 2,
    showCents = true,
    useNarrowSymbol = true,
  } = options

  const amount = parseFloat(money.amount)

  if (isNaN(amount)) {
    return formatMoney({ amount: '0', currencyCode: money.currencyCode }, options)
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: showCurrency ? 'currency' : 'decimal',
    currency: money.currencyCode,
    currencyDisplay: useNarrowSymbol ? 'narrowSymbol' : 'symbol',
    minimumFractionDigits: showCents ? decimals : 0,
    maximumFractionDigits: showCents ? decimals : 0,
  })

  return formatter.format(amount)
}

/**
 * Format money as a compact string (e.g., "$1.5K", "$2M")
 *
 * @param money - Money object
 * @param locale - Locale for formatting
 * @returns Compact formatted string
 *
 * @example
 * formatMoneyCompact({ amount: '1500.00', currencyCode: 'USD' })
 * // => "$1.5K"
 */
export function formatMoneyCompact(money: Money, locale = 'en-US'): string {
  const amount = parseFloat(money.amount)

  if (isNaN(amount)) {
    return '$0'
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currencyCode,
    notation: 'compact',
    compactDisplay: 'short',
    maximumSignificantDigits: 3,
  })

  return formatter.format(amount)
}

/**
 * Parse a money string into a Money object
 *
 * @param value - String value to parse (e.g., "29.99", "$29.99")
 * @param currencyCode - Currency code (default: 'USD')
 * @returns Money object
 *
 * @example
 * parseMoney('29.99', 'USD')
 * // => { amount: '29.99', currencyCode: 'USD' }
 *
 * parseMoney('$1,299.99')
 * // => { amount: '1299.99', currencyCode: 'USD' }
 */
export function parseMoney(value: string, currencyCode = 'USD'): Money {
  // Remove currency symbols, commas, and whitespace
  const cleaned = value.replace(/[^0-9.-]/g, '')
  const amount = parseFloat(cleaned)

  if (isNaN(amount)) {
    return { amount: '0.00', currencyCode }
  }

  return {
    amount: amount.toFixed(2),
    currencyCode,
  }
}

/**
 * Create a Money object from a numeric value
 *
 * @param amount - Numeric amount
 * @param currencyCode - Currency code (default: 'USD')
 * @returns Money object
 */
export function createMoney(amount: number, currencyCode = 'USD'): Money {
  return {
    amount: amount.toFixed(2),
    currencyCode,
  }
}

/**
 * Add two Money objects (must have same currency)
 *
 * @param a - First money value
 * @param b - Second money value
 * @returns Sum as Money object
 * @throws Error if currencies don't match
 */
export function addMoney(a: Money, b: Money): Money {
  if (a.currencyCode !== b.currencyCode) {
    throw new Error(`Cannot add different currencies: ${a.currencyCode} and ${b.currencyCode}`)
  }

  const sum = parseFloat(a.amount) + parseFloat(b.amount)
  return {
    amount: sum.toFixed(2),
    currencyCode: a.currencyCode,
  }
}

/**
 * Subtract money (a - b), must have same currency
 *
 * @param a - Money to subtract from
 * @param b - Money to subtract
 * @returns Difference as Money object
 * @throws Error if currencies don't match
 */
export function subtractMoney(a: Money, b: Money): Money {
  if (a.currencyCode !== b.currencyCode) {
    throw new Error(`Cannot subtract different currencies: ${a.currencyCode} and ${b.currencyCode}`)
  }

  const difference = parseFloat(a.amount) - parseFloat(b.amount)
  return {
    amount: difference.toFixed(2),
    currencyCode: a.currencyCode,
  }
}

/**
 * Multiply money by a factor
 *
 * @param money - Money to multiply
 * @param factor - Multiplication factor
 * @returns Product as Money object
 */
export function multiplyMoney(money: Money, factor: number): Money {
  const product = parseFloat(money.amount) * factor
  return {
    amount: product.toFixed(2),
    currencyCode: money.currencyCode,
  }
}

/**
 * Check if money is zero
 *
 * @param money - Money object to check
 * @returns True if amount is zero
 */
export function isZeroMoney(money: Money): boolean {
  return parseFloat(money.amount) === 0
}

/**
 * Check if money is negative
 *
 * @param money - Money object to check
 * @returns True if amount is negative
 */
export function isNegativeMoney(money: Money): boolean {
  return parseFloat(money.amount) < 0
}

/**
 * Compare two money values (must have same currency)
 *
 * @param a - First money value
 * @param b - Second money value
 * @returns -1 if a < b, 0 if a == b, 1 if a > b
 * @throws Error if currencies don't match
 */
export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  if (a.currencyCode !== b.currencyCode) {
    throw new Error(`Cannot compare different currencies: ${a.currencyCode} and ${b.currencyCode}`)
  }

  const amountA = parseFloat(a.amount)
  const amountB = parseFloat(b.amount)

  if (amountA < amountB) return -1
  if (amountA > amountB) return 1
  return 0
}

/**
 * Get the numeric value of money
 *
 * @param money - Money object
 * @returns Numeric amount
 */
export function getMoneyAmount(money: Money): number {
  return parseFloat(money.amount)
}

/**
 * Zero money value
 */
export function zeroMoney(currencyCode = 'USD'): Money {
  return { amount: '0.00', currencyCode }
}
