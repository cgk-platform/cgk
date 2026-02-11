/**
 * Google Feed Admin Types
 *
 * Types specific to the admin interface for Google Feed management.
 */

// Re-export core types
export type {
  GoogleFeedSettings,
  GoogleFeedProduct,
  GoogleFeedSyncHistory,
  GoogleFeedImage,
  GoogleShoppingProduct,
  GoogleFeedStatusResponse,
  GoogleFeedPreviewResponse,
  GoogleFeedProductListParams,
  GoogleFeedProductListResponse,
  GoogleFeedSettingsUpdateRequest,
  GoogleFeedProductUpdateRequest,
  BulkActionRequest,
  GoogleAvailability,
  GoogleCondition,
  GoogleAgeGroup,
  GoogleGender,
  GoogleFeedSyncStatus,
  GoogleProductSyncStatus,
  GoogleMerchantStatus,
  ExclusionRule,
  CustomLabelRules,
  MerchantIssue,
  SyncError,
} from '@cgk/commerce'

// ---------------------------------------------------------------------------
// Admin-Specific Types
// ---------------------------------------------------------------------------

export interface FeedOverviewStats {
  feedStatus: 'connected' | 'disconnected' | 'error'
  lastSyncAt: string | null
  nextSyncAt: string | null
  lastSyncStatus: 'completed' | 'failed' | 'running' | null
  feedUrl: string | null
}

export interface ProductCoverage {
  totalProducts: number
  productsInFeed: number
  productsExcluded: number
  productsWithWarnings: number
  exclusionReasons: Array<{
    reason: string
    count: number
  }>
}

export interface FeedHealth {
  approvalRate: number
  disapprovedCount: number
  pendingCount: number
  warningsCount: number
  topIssues: Array<{
    issue: string
    count: number
    severity: 'critical' | 'error' | 'warning'
  }>
}

export interface FeedPerformance {
  impressions: number
  clicks: number
  ctr: number
  topProducts: Array<{
    productId: string
    title: string
    impressions: number
    clicks: number
  }>
}

export interface ImageStatus {
  productId: string
  productTitle: string
  imageUrl: string
  thumbnailUrl?: string
  width: number | null
  height: number | null
  status: 'approved' | 'warning' | 'disapproved' | 'pending'
  issues: string[]
  isOptimized: boolean
}

export interface FeedPreviewOptions {
  format: 'xml' | 'json' | 'table'
  limit: number
  productId?: string
  showDiff?: boolean
}

export interface ProductFeedRow {
  id: string
  shopifyProductId: string
  shopifyVariantId: string | null
  thumbnail: string | null
  title: string
  effectiveTitle: string
  sku: string | null
  priceCents: number
  currency: string
  availability: string
  feedStatus: 'included' | 'excluded' | 'error'
  syncStatus: string
  merchantStatus: string | null
  lastUpdated: string
  hasOverrides: boolean
  issueCount: number
}

export interface CategoryMappingItem {
  shopifyType: string
  googleCategoryId: string
  googleCategoryName: string
  productCount: number
}

export interface GoogleProductCategory {
  id: string
  name: string
  fullPath: string
  parentId: string | null
}
