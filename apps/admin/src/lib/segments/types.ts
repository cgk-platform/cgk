/**
 * Customer Segmentation Types
 * Types for Shopify segments, RFM segmentation, and Klaviyo sync
 */

// ============================================================================
// RFM Segment Types
// ============================================================================

export type RfmSegmentType =
  | 'champions'
  | 'loyal'
  | 'new_customers'
  | 'at_risk'
  | 'hibernating'
  | 'potential'
  | 'uncategorized'

export interface RfmSegmentInfo {
  type: RfmSegmentType
  label: string
  description: string
  color: string
  badgeColor: string
}

export const RFM_SEGMENT_INFO: Record<RfmSegmentType, RfmSegmentInfo> = {
  champions: {
    type: 'champions',
    label: 'Champions',
    description: 'Best customers, buy often, spend most',
    color: '#FFD700',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
  },
  loyal: {
    type: 'loyal',
    label: 'Loyal',
    description: 'Consistent buyers, responsive to promos',
    color: '#22C55E',
    badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  },
  new_customers: {
    type: 'new_customers',
    label: 'New Customers',
    description: 'Recent first-time buyers',
    color: '#3B82F6',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  },
  at_risk: {
    type: 'at_risk',
    label: 'At Risk',
    description: 'Used to buy often, haven\'t recently',
    color: '#EF4444',
    badgeColor: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  },
  hibernating: {
    type: 'hibernating',
    label: 'Hibernating',
    description: 'Last purchase long ago, low frequency',
    color: '#6B7280',
    badgeColor: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100',
  },
  potential: {
    type: 'potential',
    label: 'Potential',
    description: 'Average scores, could be developed',
    color: '#8B5CF6',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  },
  uncategorized: {
    type: 'uncategorized',
    label: 'Uncategorized',
    description: 'Doesn\'t fit other categories',
    color: '#9CA3AF',
    badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100',
  },
}

// ============================================================================
// Database Row Types
// ============================================================================

export interface CachedSegmentRow {
  id: string
  shopify_segment_id: string
  name: string
  query: string | null
  member_count: number
  synced_at: string
  created_at: string
  updated_at: string
}

export interface CustomerRfmSegmentRow {
  id: string
  customer_id: string
  customer_email: string | null
  customer_name: string | null
  r_score: number
  f_score: number
  m_score: number
  rfm_score: number
  segment: RfmSegmentType
  recency_days: number | null
  frequency_count: number | null
  monetary_total_cents: number | null
  currency: string
  first_order_at: string | null
  last_order_at: string | null
  calculated_at: string
  created_at: string
  updated_at: string
}

export interface SegmentMembershipRow {
  id: string
  segment_id: string
  customer_id: string
  customer_email: string | null
  cached_at: string
}

// ============================================================================
// API Types
// ============================================================================

export interface ShopifySegment {
  id: string
  shopifySegmentId: string
  name: string
  query: string | null
  memberCount: number
  syncedAt: string
}

export interface RfmCustomer {
  id: string
  customerId: string
  email: string | null
  name: string | null
  rScore: number
  fScore: number
  mScore: number
  rfmScore: number
  segment: RfmSegmentType
  recencyDays: number | null
  frequencyCount: number | null
  monetaryTotal: number | null
  currency: string
  firstOrderAt: string | null
  lastOrderAt: string | null
  calculatedAt: string
}

export interface RfmSegmentStats {
  segment: RfmSegmentType
  count: number
  percentage: number
  avgMonetaryValue: number
  avgFrequency: number
  avgRecency: number
}

export interface SegmentDistribution {
  total: number
  segments: RfmSegmentStats[]
  calculatedAt: string | null
}

// ============================================================================
// Klaviyo Types
// ============================================================================

export type KlaviyoSyncDirection = 'push' | 'pull' | 'bidirectional'

export interface KlaviyoSyncConfigRow {
  id: string
  api_key_encrypted: string | null
  api_key_set: boolean
  segment_type: 'shopify' | 'rfm'
  segment_id: string
  klaviyo_list_id: string
  klaviyo_list_name: string | null
  sync_direction: KlaviyoSyncDirection
  last_synced_at: string | null
  last_sync_count: number | null
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface KlaviyoSyncConfig {
  id: string
  segmentType: 'shopify' | 'rfm'
  segmentId: string
  klaviyoListId: string
  klaviyoListName: string | null
  syncDirection: KlaviyoSyncDirection
  lastSyncedAt: string | null
  lastSyncCount: number | null
  enabled: boolean
}

export interface KlaviyoList {
  id: string
  name: string
  memberCount: number
  createdAt: string
}

// ============================================================================
// Filter Types
// ============================================================================

export interface SegmentFilters {
  page: number
  limit: number
  offset: number
  search: string
  type: 'shopify' | 'rfm' | 'all'
}

export interface RfmCustomerFilters {
  page: number
  limit: number
  offset: number
  search: string
  segment: RfmSegmentType | ''
  minRfmScore: number | null
  maxRfmScore: number | null
  sort: string
  dir: 'asc' | 'desc'
}

// ============================================================================
// Sync Types
// ============================================================================

export interface SyncResult {
  success: boolean
  segmentsCount: number
  syncedAt: string
  error?: string
}

export interface RfmCalculationResult {
  success: boolean
  customersProcessed: number
  calculatedAt: string
  error?: string
}
