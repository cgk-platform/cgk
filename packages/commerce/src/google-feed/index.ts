/**
 * Google Merchant Center Feed Module
 *
 * Exports types and utilities for Google Shopping feed generation.
 */

// Types
export type {
  // Settings
  GoogleFeedSettings,
  GoogleApiCredentials,
  ExclusionRule,
  CustomLabelRules,
  CustomLabelRule,
  CustomLabelCondition,
  TaxSettings,
  ShippingOverride,
  // Product
  GoogleFeedProduct,
  MerchantIssue,
  // Sync History
  GoogleFeedSyncHistory,
  SyncError,
  // Image
  GoogleFeedImage,
  ImageIssue,
  // Google Shopping Schema
  GoogleShoppingProduct,
  GoogleShippingInfo,
  GoogleTaxInfo,
  // Enums
  GoogleAvailability,
  GoogleCondition,
  GoogleAgeGroup,
  GoogleGender,
  GoogleFeedSyncStatus,
  GoogleProductSyncStatus,
  GoogleMerchantStatus,
  // API Types
  GoogleFeedStatusResponse,
  GoogleFeedPreviewResponse,
  GoogleFeedProductListParams,
  GoogleFeedProductListResponse,
  GoogleFeedSettingsUpdateRequest,
  GoogleFeedProductUpdateRequest,
  BulkActionRequest,
} from './types'

// Feed Generator
export { generateGoogleFeed, type FeedGeneratorInput, type ShopifyProductData } from './generator'
