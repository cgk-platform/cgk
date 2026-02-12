/**
 * Types for promo code management
 * Shopify is source of truth for discount details
 * Platform stores metadata, attribution, and OG settings
 */

export type PromoRedirectTarget = 'HOME' | 'PRODUCT' | 'COLLECTION'

export type PromoCodeStatus = 'active' | 'expired' | 'scheduled' | 'disabled'

export type ShopifyDiscountType = 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y'

/** Platform metadata stored in our database */
export interface PromoCodeMetadata {
  id: string
  code: string
  shopify_discount_id: string | null
  creator_id: string | null
  commission_percent: number | null
  og_title: string | null
  og_description: string | null
  og_image: string | null
  redirect_target: PromoRedirectTarget
  redirect_handle: string | null
  uses_count: number
  revenue_generated_cents: number
  created_at: string
  updated_at: string
}

/** Shopify discount data (fetched from Shopify API) */
export interface ShopifyDiscount {
  id: string
  code: string
  title: string
  summary: string
  status: 'ACTIVE' | 'EXPIRED' | 'SCHEDULED'
  startsAt: string | null
  endsAt: string | null
  usageLimit: number | null
  usageCount: number
  appliesOncePerCustomer: boolean
  discountType: ShopifyDiscountType
  discountValue: number
  minimumRequirement: {
    type: 'QUANTITY' | 'SUBTOTAL' | 'NONE'
    value: number | null
  } | null
}

/** Combined promo code with Shopify data and platform metadata */
export interface PromoCode {
  // From metadata
  id: string
  code: string
  shopify_discount_id: string | null
  creator_id: string | null
  creator_name: string | null
  commission_percent: number | null
  og_title: string | null
  og_description: string | null
  og_image: string | null
  redirect_target: PromoRedirectTarget
  redirect_handle: string | null
  uses_count: number
  revenue_generated_cents: number
  created_at: string
  updated_at: string

  // From Shopify (may be null if not synced)
  shopify?: ShopifyDiscount | null
  status: PromoCodeStatus
}

/** Input for creating promo code metadata */
export interface CreatePromoCodeInput {
  code: string
  shopify_discount_id?: string
  creator_id?: string
  commission_percent?: number
  og_title?: string
  og_description?: string
  og_image?: string
  redirect_target?: PromoRedirectTarget
  redirect_handle?: string
}

/** Input for updating promo code metadata */
export interface UpdatePromoCodeInput {
  creator_id?: string | null
  commission_percent?: number | null
  og_title?: string | null
  og_description?: string | null
  og_image?: string | null
  redirect_target?: PromoRedirectTarget
  redirect_handle?: string | null
}

/** Input for bulk code generation */
export interface BulkGenerateInput {
  prefix: string
  quantity: number
  discount_type: ShopifyDiscountType
  discount_value: number
  expiration_date?: string
  creator_id?: string
  commission_percent?: number
}

/** Promo code usage record */
export interface PromoCodeUsage {
  id: string
  promo_code_id: string
  order_id: string
  customer_email: string | null
  discount_amount_cents: number
  order_total_cents: number
  used_at: string
}

/** Promo code analytics */
export interface PromoCodeAnalytics {
  total_uses: number
  total_revenue_cents: number
  average_order_value_cents: number
  unique_customers: number
  usage_by_day: Array<{
    date: string
    uses: number
    revenue_cents: number
  }>
}
