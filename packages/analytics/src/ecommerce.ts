/**
 * E-commerce event tracking
 */

import { trackEvent } from './ga4'

export interface EcommerceItem {
  item_id: string
  item_name: string
  item_brand?: string
  item_category?: string
  item_category2?: string
  item_category3?: string
  item_variant?: string
  price?: number
  quantity?: number
  discount?: number
}

export interface PurchaseEvent {
  transaction_id: string
  value: number
  currency: string
  tax?: number
  shipping?: number
  coupon?: string
  items: EcommerceItem[]
}

/**
 * Track view_item event
 */
export function trackViewItem(item: EcommerceItem, value?: number, currency?: string): void {
  trackEvent('view_item', {
    currency: currency ?? 'USD',
    value: value ?? item.price ?? 0,
    items: [item] as unknown as string, // GA4 expects array
  })
}

/**
 * Track add_to_cart event
 */
export function trackAddToCart(item: EcommerceItem, value?: number, currency?: string): void {
  trackEvent('add_to_cart', {
    currency: currency ?? 'USD',
    value: value ?? (item.price ?? 0) * (item.quantity ?? 1),
    items: [item] as unknown as string,
  })
}

/**
 * Track remove_from_cart event
 */
export function trackRemoveFromCart(item: EcommerceItem, value?: number, currency?: string): void {
  trackEvent('remove_from_cart', {
    currency: currency ?? 'USD',
    value: value ?? (item.price ?? 0) * (item.quantity ?? 1),
    items: [item] as unknown as string,
  })
}

/**
 * Track begin_checkout event
 */
export function trackBeginCheckout(
  items: EcommerceItem[],
  value: number,
  currency?: string,
  coupon?: string
): void {
  trackEvent('begin_checkout', {
    currency: currency ?? 'USD',
    value,
    coupon,
    items: items as unknown as string,
  })
}

/**
 * Track purchase event
 */
export function trackPurchase(purchase: PurchaseEvent): void {
  trackEvent('purchase', {
    transaction_id: purchase.transaction_id,
    value: purchase.value,
    currency: purchase.currency,
    tax: purchase.tax,
    shipping: purchase.shipping,
    coupon: purchase.coupon,
    items: purchase.items as unknown as string,
  })
}

/**
 * Track view_item_list event
 */
export function trackViewItemList(
  items: EcommerceItem[],
  listId?: string,
  listName?: string
): void {
  trackEvent('view_item_list', {
    item_list_id: listId,
    item_list_name: listName,
    items: items as unknown as string,
  })
}
