/**
 * @cgk-platform/analytics - GA4 and attribution tracking
 *
 * @ai-pattern analytics-tracking
 * @ai-note Client and server-side analytics helpers
 */

// GA4 integration
export { initGA4, trackEvent, trackPageView, type GA4Config } from './ga4'

// Attribution tracking
export {
  trackAttribution,
  parseAttributionParams,
  getAttributionFromCookie,
  type AttributionData,
  type AttributionSource,
} from './attribution'

// Server-side tracking
export { trackServerEvent, type ServerEvent } from './server'

// E-commerce events
export {
  trackViewItem,
  trackAddToCart,
  trackRemoveFromCart,
  trackBeginCheckout,
  trackPurchase,
  type EcommerceItem,
  type PurchaseEvent,
} from './ecommerce'

// Types
export type { AnalyticsEvent, EventParams, UserProperties } from './types'
