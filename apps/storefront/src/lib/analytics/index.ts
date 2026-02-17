/**
 * Analytics Orchestrator
 *
 * Main entry point for storefront analytics.
 * Orchestrates tracking across all configured providers:
 * - Google Analytics 4 (GA4)
 * - Meta/Facebook Pixel
 * - TikTok Pixel
 *
 * Each provider checks its own configuration before firing events,
 * so you can safely call these functions regardless of which
 * providers are configured.
 *
 * @example
 * ```tsx
 * import { trackViewItem, trackAddToCart, trackPurchase } from '@/lib/analytics'
 *
 * // Track PDP view
 * trackViewItem({
 *   id: 'SKU-123',
 *   name: 'Product Name',
 *   price: 29.99,
 *   category: 'Category',
 * })
 *
 * // Track add to cart
 * trackAddToCart({
 *   id: 'SKU-123',
 *   name: 'Product Name',
 *   price: 29.99,
 *   quantity: 2,
 * })
 *
 * // Track purchase
 * trackPurchase({
 *   transactionId: 'order-123',
 *   value: 59.98,
 *   items: [{ id: 'SKU-123', name: 'Product Name', price: 29.99, quantity: 2 }],
 * })
 * ```
 */

import * as ga4 from './ga4'
import * as meta from './meta'
import * as tiktok from './tiktok'
import type { EcommerceItem, PurchaseEventData, ViewItemListData } from './types'

// Re-export types
export type { EcommerceItem, PurchaseEventData, ViewItemListData, AnalyticsProvider } from './types'

// Debug mode from env
const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_ANALYTICS === 'true'

/**
 * Generate a unique event ID for deduplication across providers
 */
function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Log debug message
 */
function debugLog(message: string, data?: unknown): void {
  if (DEBUG_MODE) {
    console.log(`[Analytics] ${message}`, data ?? '')
  }
}

/**
 * Track product detail page (PDP) view
 *
 * Fires:
 * - GA4: view_item
 * - Meta: ViewContent
 * - TikTok: ViewContent
 */
export function trackViewItem(item: EcommerceItem, currency = 'USD'): void {
  debugLog('trackViewItem', { item, currency })

  ga4.trackViewItem(item, currency)
  meta.trackViewItem(item, currency)
  tiktok.trackViewItem(item, currency)
}

/**
 * Track add to cart event
 *
 * Fires:
 * - GA4: add_to_cart
 * - Meta: AddToCart
 * - TikTok: AddToCart
 */
export function trackAddToCart(item: EcommerceItem, currency = 'USD'): void {
  debugLog('trackAddToCart', { item, currency })

  ga4.trackAddToCart(item, currency)
  meta.trackAddToCart(item, currency)
  tiktok.trackAddToCart(item, currency)
}

/**
 * Track remove from cart event
 *
 * Fires:
 * - GA4: remove_from_cart
 * - Meta: RemoveFromCart (custom)
 * - TikTok: RemoveFromCart (custom)
 */
export function trackRemoveFromCart(item: EcommerceItem, currency = 'USD'): void {
  debugLog('trackRemoveFromCart', { item, currency })

  ga4.trackRemoveFromCart(item, currency)
  meta.trackRemoveFromCart(item, currency)
  tiktok.trackRemoveFromCart(item, currency)
}

/**
 * Track begin checkout event
 *
 * Fires:
 * - GA4: begin_checkout
 * - Meta: InitiateCheckout
 * - TikTok: InitiateCheckout
 */
export function trackBeginCheckout(
  items: EcommerceItem[],
  value: number,
  currency = 'USD',
  coupon?: string
): void {
  debugLog('trackBeginCheckout', { items, value, currency, coupon })

  ga4.trackBeginCheckout(items, value, currency, coupon)
  meta.trackBeginCheckout(items, value, currency)
  tiktok.trackBeginCheckout(items, value, currency)
}

/**
 * Track purchase event
 *
 * Generates a unique event ID for deduplication across providers.
 *
 * Fires:
 * - GA4: purchase
 * - Meta: Purchase
 * - TikTok: CompletePayment
 */
export function trackPurchase(data: PurchaseEventData): void {
  const eventId = generateEventId()
  debugLog('trackPurchase', { data, eventId })

  ga4.trackPurchase(data)
  meta.trackPurchase(data, eventId)
  tiktok.trackPurchase(data, eventId)
}

/**
 * Track collection/category page view
 *
 * Fires:
 * - GA4: view_item_list
 * - Meta: ViewCategory (custom)
 * - TikTok: ViewCategory (custom)
 */
export function trackViewItemList(data: ViewItemListData): void {
  debugLog('trackViewItemList', data)

  ga4.trackViewItemList(data)
  meta.trackViewItemList(data)
  tiktok.trackViewItemList(data)
}

/**
 * Individual provider access for advanced use cases
 */
export const providers = {
  ga4,
  meta,
  tiktok,
}
