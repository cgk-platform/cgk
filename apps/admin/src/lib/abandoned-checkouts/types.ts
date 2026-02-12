/**
 * Types for abandoned checkout recovery system
 * Phase 3E: E-Commerce Recovery
 */

export interface AbandonedCheckoutLineItem {
  id: string
  title: string
  variantTitle?: string
  quantity: number
  price: number
  currency: string
  imageUrl?: string
  sku?: string
  productId?: string
  variantId?: string
}

export interface AbandonedCheckoutAddress {
  firstName?: string
  lastName?: string
  address1?: string
  address2?: string
  city?: string
  province?: string
  provinceCode?: string
  country?: string
  countryCode?: string
  zip?: string
  phone?: string
}

export type AbandonedCheckoutStatus = 'abandoned' | 'processing' | 'recovered' | 'expired'

export interface AbandonedCheckout {
  id: string
  shopifyCheckoutId: string
  shopifyCheckoutToken: string | null
  customerEmail: string | null
  customerPhone: string | null
  customerId: string | null
  customerName: string | null
  cartTotalCents: number
  currencyCode: string
  lineItems: AbandonedCheckoutLineItem[]
  billingAddress: AbandonedCheckoutAddress | null
  shippingAddress: AbandonedCheckoutAddress | null
  recoveryUrl: string | null
  status: AbandonedCheckoutStatus
  recoveryEmailCount: number
  maxRecoveryEmails: number
  recoveryRunId: string | null
  lastEmailSentAt: string | null
  abandonedAt: string
  recoveredAt: string | null
  recoveredOrderId: string | null
  createdAt: string
  updatedAt: string
}

export type RecoveryEmailStatus = 'scheduled' | 'processing' | 'sent' | 'failed' | 'skipped' | 'cancelled'

export interface RecoveryEmailQueueItem {
  id: string
  abandonedCheckoutId: string
  sequenceNumber: number
  status: RecoveryEmailStatus
  incentiveCode: string | null
  scheduledAt: string
  sentAt: string | null
  openedAt: string | null
  clickedAt: string | null
  triggerRunId: string | null
  attempts: number
  lastError: string | null
  createdAt: string
}

export interface TenantRecoverySettings {
  id: string
  enabled: boolean
  abandonmentTimeoutHours: number
  maxRecoveryEmails: number
  sequence1DelayHours: number
  sequence2DelayHours: number
  sequence3DelayHours: number
  sequence1IncentiveCode: string | null
  sequence2IncentiveCode: string | null
  sequence3IncentiveCode: string | null
  sequence1Enabled: boolean
  sequence2Enabled: boolean
  sequence3Enabled: boolean
  checkoutExpiryDays: number
  highValueThresholdCents: number
  createdAt: string
  updatedAt: string
}

export type DraftOrderStatus = 'open' | 'invoice_sent' | 'completed' | 'cancelled'

export interface DraftOrder {
  id: string
  abandonedCheckoutId: string | null
  shopifyDraftOrderId: string
  shopifyDraftOrderName: string | null
  customerEmail: string | null
  customerId: string | null
  subtotalCents: number
  totalCents: number
  currencyCode: string
  lineItems: AbandonedCheckoutLineItem[]
  discountCode: string | null
  discountAmountCents: number
  status: DraftOrderStatus
  invoiceSentAt: string | null
  completedAt: string | null
  completedOrderId: string | null
  expiresAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface RecoveryAnalyticsDaily {
  id: string
  date: string
  totalAbandoned: number
  totalAbandonedValueCents: number
  totalRecovered: number
  totalRecoveredValueCents: number
  totalExpired: number
  emailsSent: number
  emailsOpened: number
  emailsClicked: number
  draftOrdersCreated: number
  draftOrdersCompleted: number
  sequence1Sent: number
  sequence1Recovered: number
  sequence2Sent: number
  sequence2Recovered: number
  sequence3Sent: number
  sequence3Recovered: number
  createdAt: string
  updatedAt: string
}

// API request/response types
export interface AbandonedCheckoutFilters {
  status?: AbandonedCheckoutStatus | ''
  dateFrom?: string
  dateTo?: string
  minValue?: number
  maxValue?: number
  search?: string
  page?: number
  limit?: number
  sort?: string
  dir?: 'asc' | 'desc'
}

export interface AbandonedCheckoutsListResponse {
  checkouts: AbandonedCheckout[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface RecoveryStatsResponse {
  totalAbandoned: number
  totalAbandonedValue: number
  totalRecovered: number
  totalRecoveredValue: number
  recoveryRate: number
  valueAtRisk: number
  averageCartValue: number
  todayAbandoned: number
  todayRecovered: number
}

export interface SendRecoveryEmailRequest {
  checkoutId: string
  sequenceNumber?: number
  incentiveCode?: string
}

export interface CreateDraftOrderRequest {
  checkoutId: string
  discountCode?: string
  sendInvoice?: boolean
  notes?: string
}

export interface UpdateRecoverySettingsRequest {
  enabled?: boolean
  abandonmentTimeoutHours?: number
  maxRecoveryEmails?: number
  sequence1DelayHours?: number
  sequence2DelayHours?: number
  sequence3DelayHours?: number
  sequence1IncentiveCode?: string | null
  sequence2IncentiveCode?: string | null
  sequence3IncentiveCode?: string | null
  sequence1Enabled?: boolean
  sequence2Enabled?: boolean
  sequence3Enabled?: boolean
  checkoutExpiryDays?: number
  highValueThresholdCents?: number
}

// Shopify webhook payloads
export interface ShopifyCheckoutWebhookPayload {
  id: number
  token: string
  cart_token?: string
  email?: string
  phone?: string
  customer?: {
    id: number
    email: string
    first_name?: string
    last_name?: string
  }
  total_price: string
  currency: string
  line_items: Array<{
    id: number
    title: string
    variant_title?: string
    quantity: number
    price: string
    sku?: string
    product_id?: number
    variant_id?: number
    image_url?: string
  }>
  billing_address?: {
    first_name?: string
    last_name?: string
    address1?: string
    address2?: string
    city?: string
    province?: string
    province_code?: string
    country?: string
    country_code?: string
    zip?: string
    phone?: string
  }
  shipping_address?: {
    first_name?: string
    last_name?: string
    address1?: string
    address2?: string
    city?: string
    province?: string
    province_code?: string
    country?: string
    country_code?: string
    zip?: string
    phone?: string
  }
  abandoned_checkout_url?: string
  created_at: string
  updated_at?: string
  completed_at?: string
}
