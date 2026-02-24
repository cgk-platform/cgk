/**
 * Bundle Builder Types
 *
 * Type definitions for the headless bundle builder component.
 * Prices are stored in cents to avoid floating-point precision issues.
 */

export interface BundleProduct {
  id: string
  title: string
  handle: string
  image?: { url: string; altText?: string }
  variants: BundleVariant[]
}

export interface BundleVariant {
  id: string
  title: string
  /** Price in cents */
  price: number
  /** Compare-at price in cents */
  compareAtPrice?: number
  available: boolean
}

export interface BundleTier {
  /** Minimum item count to unlock this tier */
  count: number
  /** Discount value: percentage (0-100) or fixed amount in dollars */
  discount: number
  /** Display label for this tier (e.g. "Starter Bundle") */
  label?: string
  /** Variant ID of a free gift auto-added at this tier */
  freeGiftVariantId?: string
  /** Optional icon URL for tier unlock notifications */
  icon?: string
}

export interface BundleConfig {
  /** Unique identifier for this bundle configuration */
  bundleId: string
  /** Display name written to cart line properties */
  bundleName: string
  /** How discounts are calculated */
  discountType: 'percentage' | 'fixed'
  /** Tier definitions, sorted ascending by count */
  tiers: BundleTier[]
  /** Minimum items required before the CTA is enabled */
  minItems: number
  /** Maximum items allowed in the bundle */
  maxItems: number
  /** Variant IDs that are treated as free gifts across all tiers */
  freeGiftVariantIds?: string[]
  /** Whether to redirect to /cart after adding the bundle */
  cartRedirect?: boolean
}

export interface BundleCartItem {
  variantId: string
  quantity: number
  properties: Record<string, string>
}

export interface SelectedProduct {
  productId: string
  variantId: string
  title: string
  /** Price in cents */
  price: number
  quantity: number
}

export interface BundleTheme {
  /** Background color for the bundle section */
  bgColor?: string
  /** Primary text color */
  textColor?: string
  /** Accent color (buttons, progress, selections) */
  accentColor?: string
  /** Button text color */
  btnTextColor?: string
  /** Card border radius in pixels */
  cardRadius?: number
}
