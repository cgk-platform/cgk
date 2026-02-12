/**
 * Gift Card Types
 *
 * Types for gift card products, transactions, emails, and settings
 */

// Gift Card Product Types

export interface GiftCardProduct {
  id: string // Shopify product GID
  variant_id: string // Shopify variant GID
  variant_id_numeric: string // Numeric ID for cart operations
  title: string
  sku: string | null
  amount_cents: number
  min_order_subtotal_cents: number
  status: GiftCardProductStatus
  shopify_status: string | null
  image_url: string | null
  created_at: string
  updated_at: string
  synced_at: string
}

export type GiftCardProductStatus = 'active' | 'archived'

export interface CreateGiftCardProductInput {
  id: string
  variant_id: string
  variant_id_numeric: string
  title: string
  sku?: string
  amount_cents: number
  min_order_subtotal_cents?: number
  status?: GiftCardProductStatus
  shopify_status?: string
  image_url?: string
}

export interface UpdateGiftCardProductInput {
  id: string
  title?: string
  sku?: string
  amount_cents?: number
  min_order_subtotal_cents?: number
  status?: GiftCardProductStatus
  shopify_status?: string
  image_url?: string
}

// Gift Card Transaction Types

export interface GiftCardTransaction {
  id: string
  shopify_order_id: string
  shopify_order_name: string
  shopify_customer_id: string
  customer_email: string
  customer_name: string | null
  gift_card_product_id: string | null
  gift_card_variant_id: string | null
  gift_card_sku: string | null
  amount_cents: number
  source: GiftCardTransactionSource
  source_page_slug: string | null
  source_config: Record<string, unknown> | null
  status: GiftCardTransactionStatus
  shopify_transaction_id: string | null
  credited_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export type GiftCardTransactionStatus = 'pending' | 'credited' | 'failed'
export type GiftCardTransactionSource = 'bundle_builder' | 'manual' | 'promotion'

export interface CreateGiftCardTransactionInput {
  shopify_order_id: string
  shopify_order_name: string
  shopify_customer_id: string
  customer_email: string
  customer_name?: string
  gift_card_product_id?: string
  gift_card_variant_id?: string
  gift_card_sku?: string
  amount_cents: number
  source?: GiftCardTransactionSource
  source_page_slug?: string
  source_config?: Record<string, unknown>
}

export interface GiftCardTransactionFilters {
  status?: GiftCardTransactionStatus
  source?: GiftCardTransactionSource
  search?: string
  date_from?: string
  date_to?: string
  page: number
  limit: number
  offset: number
}

// Gift Card Email Types

export interface GiftCardEmail {
  id: string
  transaction_id: string
  to_email: string
  to_name: string | null
  subject: string
  status: GiftCardEmailStatus
  resend_message_id: string | null
  scheduled_for: string
  sent_at: string | null
  failed_at: string | null
  error_message: string | null
  attempt_count: number
  last_attempt_at: string | null
  created_at: string
  updated_at: string
}

export type GiftCardEmailStatus = 'pending' | 'sent' | 'failed' | 'skipped'

export interface CreateGiftCardEmailInput {
  transaction_id: string
  to_email: string
  to_name?: string
  subject: string
  scheduled_for?: string
}

export interface GiftCardEmailFilters {
  status?: GiftCardEmailStatus
  search?: string
  page: number
  limit: number
  offset: number
}

// Gift Card Settings Types

export interface GiftCardSettings {
  enabled: boolean
  email_enabled: boolean
  default_amount_cents: number
  from_email: string
  admin_notification_enabled: boolean
  admin_notification_email: string
  email_template: GiftCardEmailTemplate
  created_at?: string
  updated_at?: string
}

export interface GiftCardEmailTemplate {
  subject: string
  headline: string
  greeting: string
  body: string
  cta_text: string
  cta_url: string
  how_to_use: string
  footer: string
}

export const DEFAULT_GIFT_CARD_SETTINGS: GiftCardSettings = {
  enabled: true,
  email_enabled: true,
  default_amount_cents: 1000, // $10.00
  from_email: 'support@example.com',
  admin_notification_enabled: false,
  admin_notification_email: '',
  email_template: {
    subject: 'You received store credit!',
    headline: 'Store Credit Received',
    greeting: 'Hi {{customer_name}},',
    body: 'Great news! You have received {{amount}} in store credit as part of your recent order.',
    cta_text: 'Shop Now',
    cta_url: '{{store_url}}',
    how_to_use: 'Your store credit will be automatically applied at checkout.',
    footer: 'Thank you for being a valued customer!',
  },
}

// Stats Types

export interface GiftCardStats {
  total_issued_cents: number
  total_credited_cents: number
  total_pending_cents: number
  total_failed_cents: number
  transaction_count: number
  credited_count: number
  pending_count: number
  failed_count: number
  active_products_count: number
  pending_emails_count: number
}
