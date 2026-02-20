/**
 * Google Analytics 4 tracking module
 *
 * Handles GA4 e-commerce event tracking for the storefront.
 * Check if GA4 is configured before firing events.
 */

import type { EcommerceItem, PurchaseEventData, ViewItemListData } from './types'

// Debug mode from env
const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_ANALYTICS === 'true'

/**
 * Get GA4 measurement ID — prefers per-tenant runtime config over build-time env var.
 * The runtime config is injected by AnalyticsHead from the tenant's site_config table.
 */
function getGA4Id(): string | undefined {
  if (typeof window !== 'undefined' && (window as typeof window & { __CGK_ANALYTICS__?: { ga4MeasurementId?: string } }).__CGK_ANALYTICS__?.ga4MeasurementId) {
    return (window as typeof window & { __CGK_ANALYTICS__?: { ga4MeasurementId?: string } }).__CGK_ANALYTICS__!.ga4MeasurementId!
  }
  return process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || undefined
}

/**
 * Check if GA4 is available
 */
function isGA4Available(): boolean {
  if (typeof window === 'undefined') return false
  if (!getGA4Id()) {
    if (DEBUG_MODE) {
      console.log('[GA4] Not configured - no GA4 measurement ID found')
    }
    return false
  }
  return typeof window.gtag === 'function'
}

/**
 * Log debug message
 */
function debugLog(message: string, data?: unknown): void {
  if (DEBUG_MODE) {
    console.log(`[GA4] ${message}`, data ?? '')
  }
}

/**
 * Send GA4 event with error handling
 */
function sendGA4Event(eventName: string, params: Record<string, unknown>): void {
  if (!isGA4Available()) {
    debugLog(`Skipped ${eventName} - GA4 not available`)
    return
  }

  try {
    window.gtag('event', eventName, params)
    debugLog(`Sent ${eventName}`, params)
  } catch (error) {
    console.error(`[GA4] Error sending ${eventName}:`, error)
  }
}

/**
 * Format item for GA4 e-commerce
 */
function formatItem(item: EcommerceItem, index?: number): Record<string, unknown> {
  return {
    item_id: item.id,
    item_name: item.name,
    item_brand: item.brand,
    item_category: item.category,
    item_variant: item.variant,
    price: item.price,
    quantity: item.quantity ?? 1,
    ...(index !== undefined && { index }),
  }
}

/**
 * Track view_item event (PDP views)
 */
export function trackViewItem(item: EcommerceItem, currency = 'USD'): void {
  sendGA4Event('view_item', {
    currency,
    value: item.price,
    items: [formatItem(item)],
  })
}

/**
 * Track add_to_cart event
 */
export function trackAddToCart(item: EcommerceItem, currency = 'USD'): void {
  const quantity = item.quantity ?? 1
  const value = item.price * quantity

  sendGA4Event('add_to_cart', {
    currency,
    value,
    items: [formatItem(item)],
  })
}

/**
 * Track remove_from_cart event
 */
export function trackRemoveFromCart(item: EcommerceItem, currency = 'USD'): void {
  const quantity = item.quantity ?? 1
  const value = item.price * quantity

  sendGA4Event('remove_from_cart', {
    currency,
    value,
    items: [formatItem(item)],
  })
}

/**
 * Track begin_checkout event
 */
export function trackBeginCheckout(
  items: EcommerceItem[],
  value: number,
  currency = 'USD',
  coupon?: string
): void {
  sendGA4Event('begin_checkout', {
    currency,
    value,
    coupon,
    items: items.map((item, index) => formatItem(item, index)),
  })
}

/**
 * Track purchase event
 */
export function trackPurchase(data: PurchaseEventData): void {
  sendGA4Event('purchase', {
    transaction_id: data.transactionId,
    value: data.value,
    currency: data.currency ?? 'USD',
    tax: data.tax,
    shipping: data.shipping,
    coupon: data.coupon,
    items: data.items.map((item, index) => formatItem(item, index)),
  })
}

/**
 * Track view_item_list event (collection views)
 */
export function trackViewItemList(data: ViewItemListData): void {
  sendGA4Event('view_item_list', {
    item_list_id: data.listId,
    item_list_name: data.listName,
    items: data.items.map((item, index) => formatItem(item, index)),
  })
}

// Type declarations for gtag
declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}
