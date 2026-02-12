/**
 * Samples Tracking Types
 * Types for UGC and TikTok sample orders
 */

// ============================================================================
// Sample Types
// ============================================================================

export type SampleType = 'ugc' | 'tiktok' | 'unknown'

export interface SampleTypeInfo {
  type: SampleType
  label: string
  description: string
  badgeColor: string
}

export const SAMPLE_TYPE_INFO: Record<SampleType, SampleTypeInfo> = {
  ugc: {
    type: 'ugc',
    label: 'UGC',
    description: 'User-generated content creator sample',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  },
  tiktok: {
    type: 'tiktok',
    label: 'TikTok',
    description: 'TikTok Shop or TikTok creator sample',
    badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-100',
  },
  unknown: {
    type: 'unknown',
    label: 'Unknown',
    description: 'Unclassified sample type',
    badgeColor: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100',
  },
}

export type FulfillmentStatus = 'unfulfilled' | 'partial' | 'fulfilled' | 'restocked'

export interface FulfillmentStatusInfo {
  status: FulfillmentStatus
  label: string
  badgeColor: string
}

export const FULFILLMENT_STATUS_INFO: Record<FulfillmentStatus, FulfillmentStatusInfo> = {
  unfulfilled: {
    status: 'unfulfilled',
    label: 'Unfulfilled',
    badgeColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  },
  partial: {
    status: 'partial',
    label: 'Partial',
    badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
  },
  fulfilled: {
    status: 'fulfilled',
    label: 'Fulfilled',
    badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  },
  restocked: {
    status: 'restocked',
    label: 'Restocked',
    badgeColor: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100',
  },
}

// ============================================================================
// Database Row Types
// ============================================================================

export interface SamplesConfigRow {
  id: string
  ugc_tags: string[]
  tiktok_tags: string[]
  channel_patterns: string[]
  zero_price_only: boolean
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface SampleOrderRow {
  order_id: string
  order_number: string
  customer_email: string | null
  customer_name: string | null
  total_price_cents: number
  currency: string
  fulfillment_status: string | null
  tags: string[] | null
  channel: string | null
  order_placed_at: string
  created_at: string
  sample_type: SampleType
}

// ============================================================================
// API Types
// ============================================================================

export interface SamplesConfig {
  id: string
  ugcTags: string[]
  tiktokTags: string[]
  channelPatterns: string[]
  zeroPriceOnly: boolean
  enabled: boolean
  updatedAt: string
}

export interface SampleOrder {
  orderId: string
  orderNumber: string
  customerEmail: string | null
  customerName: string | null
  totalPrice: number
  currency: string
  fulfillmentStatus: FulfillmentStatus
  tags: string[]
  channel: string | null
  orderPlacedAt: string
  sampleType: SampleType
}

export interface SamplesStats {
  total: number
  ugc: number
  tiktok: number
  unknown: number
  unfulfilled: number
  partial: number
  fulfilled: number
}

// ============================================================================
// Filter Types
// ============================================================================

export interface SamplesFilters {
  page: number
  limit: number
  offset: number
  search: string
  type: SampleType | ''
  fulfillmentStatus: FulfillmentStatus | ''
  dateFrom: string
  dateTo: string
  sort: string
  dir: 'asc' | 'desc'
}

// ============================================================================
// Settings Types
// ============================================================================

export interface UpdateSamplesConfigInput {
  ugcTags?: string[]
  tiktokTags?: string[]
  channelPatterns?: string[]
  zeroPriceOnly?: boolean
  enabled?: boolean
}
