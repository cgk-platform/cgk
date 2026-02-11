/**
 * Google Merchant Center Feed Types
 *
 * Types for Google Shopping feed generation and management.
 * Follows Google Merchant Center specification.
 */

// ---------------------------------------------------------------------------
// Feed Settings
// ---------------------------------------------------------------------------

export interface GoogleFeedSettings {
  id: string
  merchantId: string | null
  apiCredentials: GoogleApiCredentials | null
  feedName: string
  feedToken: string
  targetCountry: string
  language: string
  currency: string
  updateFrequency: 'hourly' | 'daily' | 'weekly'
  feedFormat: 'xml' | 'json' | 'tsv'
  defaultBrand: string | null
  defaultAvailability: GoogleAvailability
  defaultCondition: GoogleCondition
  defaultShippingLabel: string | null
  exclusionRules: ExclusionRule[]
  categoryMapping: Record<string, string>
  customLabelRules: CustomLabelRules
  includeVariants: boolean
  includeOutOfStock: boolean
  minimumPriceCents: number
  taxSettings: TaxSettings | null
  shippingOverrides: ShippingOverride[] | null
  lastSyncAt: string | null
  lastSyncStatus: GoogleFeedSyncStatus | null
  lastSyncError: string | null
  nextSyncAt: string | null
  isConnected: boolean
  connectionVerifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface GoogleApiCredentials {
  clientId?: string
  clientSecret?: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: string
}

export interface ExclusionRule {
  type: 'tag' | 'vendor' | 'collection' | 'product_type' | 'price_below' | 'out_of_stock'
  value: string
  enabled: boolean
}

export interface CustomLabelRules {
  label0?: CustomLabelRule
  label1?: CustomLabelRule
  label2?: CustomLabelRule
  label3?: CustomLabelRule
  label4?: CustomLabelRule
}

export interface CustomLabelRule {
  type: 'tag' | 'price_range' | 'margin' | 'bestseller' | 'new_arrival' | 'custom'
  conditions?: CustomLabelCondition[]
  defaultValue?: string
}

export interface CustomLabelCondition {
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between'
  value: string | number
  value2?: number // for 'between' operator
  label: string
}

export interface TaxSettings {
  country: string
  rate?: number
  taxShipping?: boolean
  region?: string
}

export interface ShippingOverride {
  country: string
  service?: string
  price: string
  minHandlingTime?: number
  maxHandlingTime?: number
  minTransitTime?: number
  maxTransitTime?: number
}

// ---------------------------------------------------------------------------
// Feed Product
// ---------------------------------------------------------------------------

export interface GoogleFeedProduct {
  id: string
  shopifyProductId: string
  shopifyVariantId: string | null
  isExcluded: boolean
  excludeReason: string | null
  titleOverride: string | null
  descriptionOverride: string | null
  gtin: string | null
  mpn: string | null
  brandOverride: string | null
  googleCategoryId: string | null
  productType: string | null
  conditionOverride: GoogleCondition | null
  adult: boolean
  ageGroup: GoogleAgeGroup | null
  gender: GoogleGender | null
  color: string | null
  material: string | null
  pattern: string | null
  size: string | null
  customLabel0: string | null
  customLabel1: string | null
  customLabel2: string | null
  customLabel3: string | null
  customLabel4: string | null
  shippingWeightGrams: number | null
  shippingLengthCm: number | null
  shippingWidthCm: number | null
  shippingHeightCm: number | null
  shippingLabel: string | null
  salePriceCents: number | null
  salePriceEffectiveStart: string | null
  salePriceEffectiveEnd: string | null
  additionalImageUrls: string[]
  syncStatus: GoogleProductSyncStatus
  lastSyncAt: string | null
  merchantStatus: GoogleMerchantStatus | null
  merchantIssues: MerchantIssue[]
  merchantLastCheckedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface MerchantIssue {
  severity: 'critical' | 'error' | 'warning' | 'info'
  attribute?: string
  description: string
  detail?: string
  documentation?: string
}

// ---------------------------------------------------------------------------
// Feed Sync History
// ---------------------------------------------------------------------------

export interface GoogleFeedSyncHistory {
  id: string
  startedAt: string
  completedAt: string | null
  status: GoogleFeedSyncStatus
  totalProducts: number
  productsSynced: number
  productsAdded: number
  productsUpdated: number
  productsRemoved: number
  productsExcluded: number
  productsWithErrors: number
  errors: SyncError[]
  feedUrl: string | null
  feedSizeBytes: number | null
  feedProductCount: number | null
  durationMs: number | null
  createdAt: string
}

export interface SyncError {
  productId: string
  productTitle?: string
  error: string
  field?: string
  severity: 'critical' | 'error' | 'warning'
}

// ---------------------------------------------------------------------------
// Feed Image
// ---------------------------------------------------------------------------

export interface GoogleFeedImage {
  id: string
  shopifyProductId: string
  shopifyVariantId: string | null
  originalUrl: string
  optimizedUrl: string | null
  originalWidth: number | null
  originalHeight: number | null
  optimizedWidth: number | null
  optimizedHeight: number | null
  status: 'pending' | 'processing' | 'optimized' | 'failed' | 'approved' | 'disapproved'
  errorMessage: string | null
  googleStatus: string | null
  googleIssues: ImageIssue[]
  compressionApplied: boolean
  backgroundRemoved: boolean
  formatConverted: string | null
  originalSizeBytes: number | null
  optimizedSizeBytes: number | null
  optimizedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ImageIssue {
  type: 'size' | 'format' | 'quality' | 'background' | 'watermark' | 'text_overlay'
  description: string
  suggestion?: string
}

// ---------------------------------------------------------------------------
// Google Shopping Feed Schema (Output Format)
// ---------------------------------------------------------------------------

export interface GoogleShoppingProduct {
  // Required fields
  id: string
  title: string
  description: string
  link: string
  image_link: string
  availability: GoogleAvailability
  price: string // Format: "9.99 USD"

  // Strongly recommended
  gtin?: string
  mpn?: string
  brand: string
  google_product_category?: string | number
  product_type?: string

  // Optional - Product identifiers
  identifier_exists?: 'yes' | 'no'
  item_group_id?: string

  // Optional - Images
  additional_image_link?: string[]

  // Optional - Pricing
  sale_price?: string
  sale_price_effective_date?: string
  unit_pricing_measure?: string
  unit_pricing_base_measure?: string

  // Optional - Condition
  condition?: GoogleCondition

  // Optional - Adult content
  adult?: boolean

  // Optional - Apparel attributes
  age_group?: GoogleAgeGroup
  color?: string
  gender?: GoogleGender
  material?: string
  pattern?: string
  size?: string
  size_type?: 'regular' | 'petite' | 'plus' | 'big' | 'tall' | 'maternity'
  size_system?: string

  // Optional - Shipping
  shipping?: GoogleShippingInfo[]
  shipping_weight?: string
  shipping_length?: string
  shipping_width?: string
  shipping_height?: string
  shipping_label?: string

  // Optional - Tax
  tax?: GoogleTaxInfo[]
  tax_category?: string

  // Optional - Custom labels (for campaign management)
  custom_label_0?: string
  custom_label_1?: string
  custom_label_2?: string
  custom_label_3?: string
  custom_label_4?: string

  // Optional - Promotions
  promotion_id?: string

  // Optional - Destinations
  excluded_destination?: string[]
  included_destination?: string[]
}

export interface GoogleShippingInfo {
  country: string
  region?: string
  service?: string
  price: string
  min_handling_time?: number
  max_handling_time?: number
  min_transit_time?: number
  max_transit_time?: number
}

export interface GoogleTaxInfo {
  country: string
  region?: string
  rate: number
  tax_ship?: boolean
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type GoogleAvailability = 'in_stock' | 'out_of_stock' | 'preorder' | 'backorder'
export type GoogleCondition = 'new' | 'refurbished' | 'used'
export type GoogleAgeGroup = 'newborn' | 'infant' | 'toddler' | 'kids' | 'adult'
export type GoogleGender = 'male' | 'female' | 'unisex'
export type GoogleFeedSyncStatus = 'running' | 'completed' | 'failed' | 'cancelled'
export type GoogleProductSyncStatus = 'pending' | 'synced' | 'error' | 'excluded'
export type GoogleMerchantStatus = 'pending' | 'approved' | 'disapproved' | 'warning'

// ---------------------------------------------------------------------------
// API Request/Response Types
// ---------------------------------------------------------------------------

export interface GoogleFeedStatusResponse {
  settings: GoogleFeedSettings | null
  lastSync: GoogleFeedSyncHistory | null
  coverage: {
    totalProducts: number
    productsInFeed: number
    productsExcluded: number
    productsWithWarnings: number
  }
  health: {
    approvalRate: number
    disapprovedCount: number
    pendingCount: number
    warningsCount: number
  }
  errorSummary: Array<{
    error: string
    count: number
    severity: string
  }>
  feedUrl: string | null
  performance?: {
    impressions: number
    clicks: number
    ctr: number
  } | null
}

export interface GoogleFeedPreviewResponse {
  format: 'xml' | 'json' | 'table'
  products: GoogleShoppingProduct[]
  totalCount: number
  sampleSize: number
  lastPublished: string | null
  changes?: {
    added: number
    updated: number
    removed: number
  }
}

export interface GoogleFeedProductListParams {
  page?: number
  limit?: number
  status?: 'all' | 'included' | 'excluded' | 'errors'
  productType?: string
  availability?: string
  search?: string
  sort?: string
  direction?: 'asc' | 'desc'
}

export interface GoogleFeedProductListResponse {
  products: Array<GoogleFeedProduct & {
    shopifyTitle: string
    shopifyHandle: string
    shopifySku: string | null
    shopifyPrice: number
    shopifyAvailability: string
    shopifyImageUrl: string | null
    effectiveTitle: string
    effectiveDescription: string
    effectiveStatus: 'included' | 'excluded' | 'error'
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface GoogleFeedSettingsUpdateRequest {
  merchantId?: string
  apiCredentials?: GoogleApiCredentials
  feedName?: string
  targetCountry?: string
  language?: string
  currency?: string
  updateFrequency?: 'hourly' | 'daily' | 'weekly'
  feedFormat?: 'xml' | 'json' | 'tsv'
  defaultBrand?: string
  defaultAvailability?: GoogleAvailability
  defaultCondition?: GoogleCondition
  defaultShippingLabel?: string
  exclusionRules?: ExclusionRule[]
  categoryMapping?: Record<string, string>
  customLabelRules?: CustomLabelRules
  includeVariants?: boolean
  includeOutOfStock?: boolean
  minimumPriceCents?: number
  taxSettings?: TaxSettings
  shippingOverrides?: ShippingOverride[]
}

export interface GoogleFeedProductUpdateRequest {
  isExcluded?: boolean
  excludeReason?: string
  titleOverride?: string
  descriptionOverride?: string
  gtin?: string
  mpn?: string
  brandOverride?: string
  googleCategoryId?: string
  productType?: string
  conditionOverride?: GoogleCondition
  adult?: boolean
  ageGroup?: GoogleAgeGroup
  gender?: GoogleGender
  color?: string
  material?: string
  pattern?: string
  size?: string
  customLabel0?: string
  customLabel1?: string
  customLabel2?: string
  customLabel3?: string
  customLabel4?: string
  shippingWeightGrams?: number
  shippingLengthCm?: number
  shippingWidthCm?: number
  shippingHeightCm?: number
  shippingLabel?: string
  salePriceCents?: number
  salePriceEffectiveStart?: string
  salePriceEffectiveEnd?: string
  additionalImageUrls?: string[]
}

export interface BulkActionRequest {
  action: 'include' | 'exclude' | 'refresh' | 'set_category'
  productIds: string[]
  categoryId?: string
}
