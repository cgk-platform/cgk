/**
 * Meta/Facebook Pixel tracking module
 *
 * Handles Meta Pixel e-commerce event tracking for the storefront.
 * Check if Pixel is configured before firing events.
 */

import type { EcommerceItem, PurchaseEventData, ViewItemListData } from './types'

// Debug mode from env
const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_ANALYTICS === 'true'

type CgkAnalyticsWindow = typeof window & { __CGK_ANALYTICS__?: { fbPixelId?: string } }

/**
 * Get Meta pixel ID — prefers per-tenant runtime config over build-time env var.
 * The runtime config is injected by AnalyticsHead from the tenant's site_config table.
 */
function getMetaPixelId(): string | undefined {
  if (typeof window !== 'undefined' && (window as CgkAnalyticsWindow).__CGK_ANALYTICS__?.fbPixelId) {
    return (window as CgkAnalyticsWindow).__CGK_ANALYTICS__!.fbPixelId!
  }
  return process.env.NEXT_PUBLIC_META_PIXEL_ID || undefined
}

/**
 * Check if Meta Pixel is available
 */
function isMetaPixelAvailable(): boolean {
  if (typeof window === 'undefined') return false
  if (!getMetaPixelId()) {
    if (DEBUG_MODE) {
      console.log('[Meta Pixel] Not configured - no Meta pixel ID found')
    }
    return false
  }
  return typeof window.fbq === 'function'
}

/**
 * Log debug message
 */
function debugLog(message: string, data?: unknown): void {
  if (DEBUG_MODE) {
    console.log(`[Meta Pixel] ${message}`, data ?? '')
  }
}

/**
 * Send Meta Pixel event with error handling
 */
function sendMetaEvent(
  eventName: string,
  params: Record<string, unknown>,
  eventId?: string
): void {
  if (!isMetaPixelAvailable()) {
    debugLog(`Skipped ${eventName} - Meta Pixel not available`)
    return
  }

  try {
    // Use trackSingle if event ID provided for deduplication
    if (eventId && getMetaPixelId()) {
      window.fbq('trackSingle', getMetaPixelId()!, eventName, params, { eventID: eventId })
    } else {
      window.fbq('track', eventName, params)
    }
    debugLog(`Sent ${eventName}`, params)
  } catch (error) {
    console.error(`[Meta Pixel] Error sending ${eventName}:`, error)
  }
}

/**
 * Format items for Meta Pixel content_ids
 */
function formatContentIds(items: EcommerceItem[]): string[] {
  return items.map((item) => item.id)
}

/**
 * Format items for Meta Pixel contents
 */
function formatContents(items: EcommerceItem[]): Array<{ id: string; quantity: number }> {
  return items.map((item) => ({
    id: item.id,
    quantity: item.quantity ?? 1,
  }))
}

/**
 * Track ViewContent event (PDP views)
 */
export function trackViewItem(item: EcommerceItem, currency = 'USD'): void {
  sendMetaEvent('ViewContent', {
    content_ids: [item.id],
    content_name: item.name,
    content_type: 'product',
    content_category: item.category,
    value: item.price,
    currency,
  })
}

/**
 * Track AddToCart event
 */
export function trackAddToCart(item: EcommerceItem, currency = 'USD'): void {
  const quantity = item.quantity ?? 1
  const value = item.price * quantity

  sendMetaEvent('AddToCart', {
    content_ids: [item.id],
    content_name: item.name,
    content_type: 'product',
    value,
    currency,
    contents: [{ id: item.id, quantity }],
  })
}

/**
 * Track RemoveFromCart event (custom event - not standard)
 */
export function trackRemoveFromCart(item: EcommerceItem, currency = 'USD'): void {
  const quantity = item.quantity ?? 1
  const value = item.price * quantity

  // RemoveFromCart is not a standard Meta event, use custom event
  sendMetaEvent('RemoveFromCart', {
    content_ids: [item.id],
    content_name: item.name,
    content_type: 'product',
    value,
    currency,
    contents: [{ id: item.id, quantity }],
  })
}

/**
 * Track InitiateCheckout event
 */
export function trackBeginCheckout(
  items: EcommerceItem[],
  value: number,
  currency = 'USD'
): void {
  sendMetaEvent('InitiateCheckout', {
    content_ids: formatContentIds(items),
    content_type: 'product',
    value,
    currency,
    num_items: items.reduce((sum, item) => sum + (item.quantity ?? 1), 0),
    contents: formatContents(items),
  })
}

/**
 * Track Purchase event
 */
export function trackPurchase(data: PurchaseEventData, eventId?: string): void {
  sendMetaEvent(
    'Purchase',
    {
      content_ids: formatContentIds(data.items),
      content_type: 'product',
      value: data.value,
      currency: data.currency ?? 'USD',
      num_items: data.items.reduce((sum, item) => sum + (item.quantity ?? 1), 0),
      contents: formatContents(data.items),
    },
    eventId
  )
}

/**
 * Track ViewCategory event (collection views)
 * Note: ViewCategory is a custom event, not standard Meta
 */
export function trackViewItemList(data: ViewItemListData): void {
  sendMetaEvent('ViewCategory', {
    content_ids: formatContentIds(data.items),
    content_type: 'product_group',
    content_category: data.listName,
    content_name: data.listName,
  })
}

// Type declarations for Meta Pixel
declare global {
  interface Window {
    fbq: (
      type: string,
      eventNameOrPixelId: string,
      paramsOrEventName?: Record<string, unknown> | string,
      optionalParams?: Record<string, unknown>,
      options?: { eventID?: string }
    ) => void
    _fbq: unknown
  }
}
