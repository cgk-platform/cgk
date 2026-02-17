/**
 * TikTok Pixel tracking module
 *
 * Handles TikTok Pixel e-commerce event tracking for the storefront.
 * Check if Pixel is configured before firing events.
 */

import type { EcommerceItem, PurchaseEventData, ViewItemListData } from './types'

// Debug mode from env
const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_ANALYTICS === 'true'
const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID

/**
 * Check if TikTok Pixel is available
 */
function isTikTokPixelAvailable(): boolean {
  if (typeof window === 'undefined') return false
  if (!TIKTOK_PIXEL_ID) {
    if (DEBUG_MODE) {
      console.log('[TikTok Pixel] Not configured - NEXT_PUBLIC_TIKTOK_PIXEL_ID not set')
    }
    return false
  }
  return typeof window.ttq === 'object' && window.ttq !== null
}

/**
 * Log debug message
 */
function debugLog(message: string, data?: unknown): void {
  if (DEBUG_MODE) {
    console.log(`[TikTok Pixel] ${message}`, data ?? '')
  }
}

/**
 * Send TikTok Pixel event with error handling
 */
function sendTikTokEvent(
  eventName: string,
  params: Record<string, unknown>,
  eventId?: string
): void {
  if (!isTikTokPixelAvailable()) {
    debugLog(`Skipped ${eventName} - TikTok Pixel not available`)
    return
  }

  try {
    const options = eventId ? { event_id: eventId } : undefined
    window.ttq.track(eventName, params, options)
    debugLog(`Sent ${eventName}`, params)
  } catch (error) {
    console.error(`[TikTok Pixel] Error sending ${eventName}:`, error)
  }
}

/**
 * Format items for TikTok Pixel contents
 */
function formatContents(items: EcommerceItem[]): Array<{
  content_id: string
  content_name: string
  content_type: string
  quantity: number
  price: number
}> {
  return items.map((item) => ({
    content_id: item.id,
    content_name: item.name,
    content_type: 'product',
    quantity: item.quantity ?? 1,
    price: item.price,
  }))
}

/**
 * Track ViewContent event (PDP views)
 */
export function trackViewItem(item: EcommerceItem, currency = 'USD'): void {
  sendTikTokEvent('ViewContent', {
    content_id: item.id,
    content_name: item.name,
    content_type: 'product',
    content_category: item.category,
    value: item.price,
    currency,
    quantity: item.quantity ?? 1,
  })
}

/**
 * Track AddToCart event
 */
export function trackAddToCart(item: EcommerceItem, currency = 'USD'): void {
  const quantity = item.quantity ?? 1
  const value = item.price * quantity

  sendTikTokEvent('AddToCart', {
    content_id: item.id,
    content_name: item.name,
    content_type: 'product',
    value,
    currency,
    quantity,
    contents: formatContents([item]),
  })
}

/**
 * Track RemoveFromCart event (custom event)
 */
export function trackRemoveFromCart(item: EcommerceItem, currency = 'USD'): void {
  const quantity = item.quantity ?? 1
  const value = item.price * quantity

  // RemoveFromCart is not standard, but TikTok supports custom events
  sendTikTokEvent('RemoveFromCart', {
    content_id: item.id,
    content_name: item.name,
    content_type: 'product',
    value,
    currency,
    quantity,
    contents: formatContents([item]),
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
  sendTikTokEvent('InitiateCheckout', {
    value,
    currency,
    contents: formatContents(items),
  })
}

/**
 * Track CompletePayment event
 */
export function trackPurchase(data: PurchaseEventData, eventId?: string): void {
  sendTikTokEvent(
    'CompletePayment',
    {
      value: data.value,
      currency: data.currency ?? 'USD',
      contents: formatContents(data.items),
    },
    eventId
  )
}

/**
 * Track ViewCategory event (collection views)
 * TikTok doesn't have a direct equivalent, using custom event
 */
export function trackViewItemList(data: ViewItemListData): void {
  sendTikTokEvent('ViewCategory', {
    content_type: 'product_group',
    content_category: data.listName,
    contents: formatContents(data.items),
  })
}

// Type declarations for TikTok Pixel
declare global {
  interface Window {
    ttq: {
      track: (
        eventName: string,
        params?: Record<string, unknown>,
        options?: { event_id?: string }
      ) => void
      identify: (params: Record<string, unknown>) => void
      page: () => void
    }
  }
}
