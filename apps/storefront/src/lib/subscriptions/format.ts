/**
 * Formatting utilities for subscription display
 */

import type { SubscriptionFrequency, SubscriptionStatus } from './types'

/**
 * Format cents to currency display
 */
export function formatPrice(cents: number, currencyCode = 'USD'): string {
  const amount = cents / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount)
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format date for relative display (e.g., "in 5 days")
 */
export function formatRelativeDate(date: Date | string | null): string {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return `${Math.abs(diffDays)} days ago`
  }
  if (diffDays === 0) {
    return 'Today'
  }
  if (diffDays === 1) {
    return 'Tomorrow'
  }
  if (diffDays <= 7) {
    return `in ${diffDays} days`
  }
  if (diffDays <= 30) {
    const weeks = Math.floor(diffDays / 7)
    return `in ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`
  }
  return formatDate(d)
}

/**
 * Format subscription frequency for display
 */
export function formatFrequency(frequency: SubscriptionFrequency): string {
  if (frequency.label) {
    return frequency.label
  }

  const { intervalCount, interval } = frequency
  const intervalName = interval.charAt(0).toUpperCase() + interval.slice(1)

  if (intervalCount === 1) {
    return `Every ${intervalName}`
  }
  return `Every ${intervalCount} ${intervalName}s`
}

/**
 * Get status display configuration
 */
export function getStatusDisplay(status: SubscriptionStatus): {
  label: string
  variant: 'default' | 'success' | 'warning' | 'error'
  description: string
} {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        variant: 'success',
        description: 'Your subscription is active and will process on schedule.',
      }
    case 'paused':
      return {
        label: 'Paused',
        variant: 'warning',
        description: 'Your subscription is paused. No orders will be processed until you resume.',
      }
    case 'cancelled':
      return {
        label: 'Cancelled',
        variant: 'error',
        description: 'This subscription has been cancelled.',
      }
    case 'expired':
      return {
        label: 'Expired',
        variant: 'error',
        description: 'This subscription has expired.',
      }
    case 'failed':
      return {
        label: 'Payment Failed',
        variant: 'error',
        description: 'The last payment attempt failed. Please update your payment method.',
      }
    default:
      return {
        label: status,
        variant: 'default',
        description: '',
      }
  }
}

/**
 * Format card brand for display
 */
export function formatCardBrand(brand: string): string {
  const brands: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    diners: 'Diners Club',
    jcb: 'JCB',
    unionpay: 'UnionPay',
  }
  return brands[brand.toLowerCase()] || brand
}

/**
 * Format card expiry for display
 */
export function formatCardExpiry(month: number, year: number): string {
  const monthStr = month.toString().padStart(2, '0')
  const yearStr = year.toString().slice(-2)
  return `${monthStr}/${yearStr}`
}
