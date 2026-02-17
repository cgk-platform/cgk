/**
 * Analytics types for storefront tracking
 */

/**
 * E-commerce item for tracking events
 */
export interface EcommerceItem {
  /** Product ID (SKU, variant ID, etc.) */
  id: string
  /** Product name */
  name: string
  /** Product brand */
  brand?: string
  /** Product category */
  category?: string
  /** Product variant (size, color, etc.) */
  variant?: string
  /** Unit price */
  price: number
  /** Quantity (defaults to 1) */
  quantity?: number
  /** Discount amount */
  discount?: number
}

/**
 * Purchase event data
 */
export interface PurchaseEventData {
  /** Transaction/order ID */
  transactionId: string
  /** Total order value */
  value: number
  /** Currency code (defaults to USD) */
  currency?: string
  /** Tax amount */
  tax?: number
  /** Shipping amount */
  shipping?: number
  /** Coupon code used */
  coupon?: string
  /** Items purchased */
  items: EcommerceItem[]
}

/**
 * View item list (collection) event data
 */
export interface ViewItemListData {
  /** List/collection ID */
  listId?: string
  /** List/collection name */
  listName?: string
  /** Items in the list */
  items: EcommerceItem[]
}

/**
 * Analytics provider interface
 * All providers should implement these methods
 */
export interface AnalyticsProvider {
  /** Track product detail page view */
  trackViewItem: (item: EcommerceItem, currency?: string) => void
  /** Track add to cart */
  trackAddToCart: (item: EcommerceItem, currency?: string) => void
  /** Track remove from cart */
  trackRemoveFromCart: (item: EcommerceItem, currency?: string) => void
  /** Track checkout initiation */
  trackBeginCheckout: (items: EcommerceItem[], value: number, currency?: string) => void
  /** Track purchase completion */
  trackPurchase: (data: PurchaseEventData, eventId?: string) => void
  /** Track collection/list view */
  trackViewItemList: (data: ViewItemListData) => void
}
