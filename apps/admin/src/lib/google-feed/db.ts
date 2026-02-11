/**
 * Google Feed Database Operations
 *
 * Database queries for Google Feed management.
 * All queries must be called within a withTenant() context.
 */

import { sql } from '@cgk/db'
import type {
  GoogleFeedSettings,
  GoogleFeedProduct,
  GoogleFeedSyncHistory,
  GoogleFeedImage,
  GoogleFeedSettingsUpdateRequest,
  GoogleFeedProductUpdateRequest,
} from './types'

// ---------------------------------------------------------------------------
// Settings Operations
// ---------------------------------------------------------------------------

export async function getGoogleFeedSettings(): Promise<GoogleFeedSettings | null> {
  const result = await sql`
    SELECT
      id,
      merchant_id as "merchantId",
      api_credentials as "apiCredentials",
      feed_name as "feedName",
      feed_token as "feedToken",
      target_country as "targetCountry",
      language,
      currency,
      update_frequency as "updateFrequency",
      feed_format as "feedFormat",
      default_brand as "defaultBrand",
      default_availability as "defaultAvailability",
      default_condition as "defaultCondition",
      default_shipping_label as "defaultShippingLabel",
      exclusion_rules as "exclusionRules",
      category_mapping as "categoryMapping",
      custom_label_rules as "customLabelRules",
      include_variants as "includeVariants",
      include_out_of_stock as "includeOutOfStock",
      minimum_price_cents as "minimumPriceCents",
      tax_settings as "taxSettings",
      shipping_overrides as "shippingOverrides",
      last_sync_at as "lastSyncAt",
      last_sync_status as "lastSyncStatus",
      last_sync_error as "lastSyncError",
      next_sync_at as "nextSyncAt",
      is_connected as "isConnected",
      connection_verified_at as "connectionVerifiedAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM google_feed_settings
    LIMIT 1
  `

  return result.rows[0] as GoogleFeedSettings | undefined ?? null
}

export async function createGoogleFeedSettings(
  data: Partial<GoogleFeedSettingsUpdateRequest>
): Promise<GoogleFeedSettings> {
  const result = await sql`
    INSERT INTO google_feed_settings (
      merchant_id,
      feed_name,
      target_country,
      language,
      currency,
      update_frequency,
      feed_format,
      default_brand,
      default_availability,
      default_condition,
      default_shipping_label,
      exclusion_rules,
      category_mapping,
      custom_label_rules,
      include_variants,
      include_out_of_stock,
      minimum_price_cents,
      tax_settings,
      shipping_overrides
    ) VALUES (
      ${data.merchantId || null},
      ${data.feedName || 'Product Feed'},
      ${data.targetCountry || 'US'},
      ${data.language || 'en'},
      ${data.currency || 'USD'},
      ${data.updateFrequency || 'daily'},
      ${data.feedFormat || 'xml'},
      ${data.defaultBrand || null},
      ${data.defaultAvailability || 'in_stock'},
      ${data.defaultCondition || 'new'},
      ${data.defaultShippingLabel || null},
      ${JSON.stringify(data.exclusionRules || [])},
      ${JSON.stringify(data.categoryMapping || {})},
      ${JSON.stringify(data.customLabelRules || {})},
      ${data.includeVariants ?? true},
      ${data.includeOutOfStock ?? false},
      ${data.minimumPriceCents ?? 0},
      ${data.taxSettings ? JSON.stringify(data.taxSettings) : null},
      ${data.shippingOverrides ? JSON.stringify(data.shippingOverrides) : null}
    )
    RETURNING
      id,
      merchant_id as "merchantId",
      api_credentials as "apiCredentials",
      feed_name as "feedName",
      feed_token as "feedToken",
      target_country as "targetCountry",
      language,
      currency,
      update_frequency as "updateFrequency",
      feed_format as "feedFormat",
      default_brand as "defaultBrand",
      default_availability as "defaultAvailability",
      default_condition as "defaultCondition",
      default_shipping_label as "defaultShippingLabel",
      exclusion_rules as "exclusionRules",
      category_mapping as "categoryMapping",
      custom_label_rules as "customLabelRules",
      include_variants as "includeVariants",
      include_out_of_stock as "includeOutOfStock",
      minimum_price_cents as "minimumPriceCents",
      tax_settings as "taxSettings",
      shipping_overrides as "shippingOverrides",
      last_sync_at as "lastSyncAt",
      last_sync_status as "lastSyncStatus",
      last_sync_error as "lastSyncError",
      next_sync_at as "nextSyncAt",
      is_connected as "isConnected",
      connection_verified_at as "connectionVerifiedAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  return result.rows[0] as GoogleFeedSettings
}

export async function updateGoogleFeedSettings(
  settingsId: string,
  data: GoogleFeedSettingsUpdateRequest
): Promise<GoogleFeedSettings> {
  const result = await sql`
    UPDATE google_feed_settings SET
      merchant_id = COALESCE(${data.merchantId}, merchant_id),
      api_credentials = COALESCE(${data.apiCredentials ? JSON.stringify(data.apiCredentials) : null}::jsonb, api_credentials),
      feed_name = COALESCE(${data.feedName}, feed_name),
      target_country = COALESCE(${data.targetCountry}, target_country),
      language = COALESCE(${data.language}, language),
      currency = COALESCE(${data.currency}, currency),
      update_frequency = COALESCE(${data.updateFrequency}, update_frequency),
      feed_format = COALESCE(${data.feedFormat}, feed_format),
      default_brand = COALESCE(${data.defaultBrand}, default_brand),
      default_availability = COALESCE(${data.defaultAvailability}, default_availability),
      default_condition = COALESCE(${data.defaultCondition}, default_condition),
      default_shipping_label = COALESCE(${data.defaultShippingLabel}, default_shipping_label),
      exclusion_rules = COALESCE(${data.exclusionRules ? JSON.stringify(data.exclusionRules) : null}::jsonb, exclusion_rules),
      category_mapping = COALESCE(${data.categoryMapping ? JSON.stringify(data.categoryMapping) : null}::jsonb, category_mapping),
      custom_label_rules = COALESCE(${data.customLabelRules ? JSON.stringify(data.customLabelRules) : null}::jsonb, custom_label_rules),
      include_variants = COALESCE(${data.includeVariants}, include_variants),
      include_out_of_stock = COALESCE(${data.includeOutOfStock}, include_out_of_stock),
      minimum_price_cents = COALESCE(${data.minimumPriceCents}, minimum_price_cents),
      tax_settings = COALESCE(${data.taxSettings ? JSON.stringify(data.taxSettings) : null}::jsonb, tax_settings),
      shipping_overrides = COALESCE(${data.shippingOverrides ? JSON.stringify(data.shippingOverrides) : null}::jsonb, shipping_overrides),
      updated_at = NOW()
    WHERE id = ${settingsId}
    RETURNING
      id,
      merchant_id as "merchantId",
      api_credentials as "apiCredentials",
      feed_name as "feedName",
      feed_token as "feedToken",
      target_country as "targetCountry",
      language,
      currency,
      update_frequency as "updateFrequency",
      feed_format as "feedFormat",
      default_brand as "defaultBrand",
      default_availability as "defaultAvailability",
      default_condition as "defaultCondition",
      default_shipping_label as "defaultShippingLabel",
      exclusion_rules as "exclusionRules",
      category_mapping as "categoryMapping",
      custom_label_rules as "customLabelRules",
      include_variants as "includeVariants",
      include_out_of_stock as "includeOutOfStock",
      minimum_price_cents as "minimumPriceCents",
      tax_settings as "taxSettings",
      shipping_overrides as "shippingOverrides",
      last_sync_at as "lastSyncAt",
      last_sync_status as "lastSyncStatus",
      last_sync_error as "lastSyncError",
      next_sync_at as "nextSyncAt",
      is_connected as "isConnected",
      connection_verified_at as "connectionVerifiedAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  return result.rows[0] as GoogleFeedSettings
}

// ---------------------------------------------------------------------------
// Product Operations
// ---------------------------------------------------------------------------

export async function getGoogleFeedProduct(
  shopifyProductId: string,
  shopifyVariantId?: string
): Promise<GoogleFeedProduct | null> {
  const result = await sql`
    SELECT
      id,
      shopify_product_id as "shopifyProductId",
      shopify_variant_id as "shopifyVariantId",
      is_excluded as "isExcluded",
      exclude_reason as "excludeReason",
      title_override as "titleOverride",
      description_override as "descriptionOverride",
      gtin,
      mpn,
      brand_override as "brandOverride",
      google_category_id as "googleCategoryId",
      product_type as "productType",
      condition_override as "conditionOverride",
      adult,
      age_group as "ageGroup",
      gender,
      color,
      material,
      pattern,
      size,
      custom_label_0 as "customLabel0",
      custom_label_1 as "customLabel1",
      custom_label_2 as "customLabel2",
      custom_label_3 as "customLabel3",
      custom_label_4 as "customLabel4",
      shipping_weight_grams as "shippingWeightGrams",
      shipping_length_cm as "shippingLengthCm",
      shipping_width_cm as "shippingWidthCm",
      shipping_height_cm as "shippingHeightCm",
      shipping_label as "shippingLabel",
      sale_price_cents as "salePriceCents",
      sale_price_effective_start as "salePriceEffectiveStart",
      sale_price_effective_end as "salePriceEffectiveEnd",
      additional_image_urls as "additionalImageUrls",
      sync_status as "syncStatus",
      last_sync_at as "lastSyncAt",
      merchant_status as "merchantStatus",
      merchant_issues as "merchantIssues",
      merchant_last_checked_at as "merchantLastCheckedAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM google_feed_products
    WHERE shopify_product_id = ${shopifyProductId}
      AND (shopify_variant_id = ${shopifyVariantId || null} OR ${!shopifyVariantId})
    LIMIT 1
  `

  return result.rows[0] as GoogleFeedProduct | undefined ?? null
}

export async function upsertGoogleFeedProduct(
  shopifyProductId: string,
  shopifyVariantId: string | null,
  data: GoogleFeedProductUpdateRequest
): Promise<GoogleFeedProduct> {
  const result = await sql`
    INSERT INTO google_feed_products (
      shopify_product_id,
      shopify_variant_id,
      is_excluded,
      exclude_reason,
      title_override,
      description_override,
      gtin,
      mpn,
      brand_override,
      google_category_id,
      product_type,
      condition_override,
      adult,
      age_group,
      gender,
      color,
      material,
      pattern,
      size,
      custom_label_0,
      custom_label_1,
      custom_label_2,
      custom_label_3,
      custom_label_4,
      shipping_weight_grams,
      shipping_length_cm,
      shipping_width_cm,
      shipping_height_cm,
      shipping_label,
      sale_price_cents,
      sale_price_effective_start,
      sale_price_effective_end,
      additional_image_urls
    ) VALUES (
      ${shopifyProductId},
      ${shopifyVariantId},
      ${data.isExcluded ?? false},
      ${data.excludeReason || null},
      ${data.titleOverride || null},
      ${data.descriptionOverride || null},
      ${data.gtin || null},
      ${data.mpn || null},
      ${data.brandOverride || null},
      ${data.googleCategoryId || null},
      ${data.productType || null},
      ${data.conditionOverride || null},
      ${data.adult ?? false},
      ${data.ageGroup || null},
      ${data.gender || null},
      ${data.color || null},
      ${data.material || null},
      ${data.pattern || null},
      ${data.size || null},
      ${data.customLabel0 || null},
      ${data.customLabel1 || null},
      ${data.customLabel2 || null},
      ${data.customLabel3 || null},
      ${data.customLabel4 || null},
      ${data.shippingWeightGrams || null},
      ${data.shippingLengthCm || null},
      ${data.shippingWidthCm || null},
      ${data.shippingHeightCm || null},
      ${data.shippingLabel || null},
      ${data.salePriceCents || null},
      ${data.salePriceEffectiveStart || null},
      ${data.salePriceEffectiveEnd || null},
      ${data.additionalImageUrls ? JSON.stringify(data.additionalImageUrls) : '[]'}
    )
    ON CONFLICT (shopify_product_id, shopify_variant_id)
    DO UPDATE SET
      is_excluded = COALESCE(${data.isExcluded}, google_feed_products.is_excluded),
      exclude_reason = COALESCE(${data.excludeReason}, google_feed_products.exclude_reason),
      title_override = COALESCE(${data.titleOverride}, google_feed_products.title_override),
      description_override = COALESCE(${data.descriptionOverride}, google_feed_products.description_override),
      gtin = COALESCE(${data.gtin}, google_feed_products.gtin),
      mpn = COALESCE(${data.mpn}, google_feed_products.mpn),
      brand_override = COALESCE(${data.brandOverride}, google_feed_products.brand_override),
      google_category_id = COALESCE(${data.googleCategoryId}, google_feed_products.google_category_id),
      product_type = COALESCE(${data.productType}, google_feed_products.product_type),
      condition_override = COALESCE(${data.conditionOverride}, google_feed_products.condition_override),
      adult = COALESCE(${data.adult}, google_feed_products.adult),
      age_group = COALESCE(${data.ageGroup}, google_feed_products.age_group),
      gender = COALESCE(${data.gender}, google_feed_products.gender),
      color = COALESCE(${data.color}, google_feed_products.color),
      material = COALESCE(${data.material}, google_feed_products.material),
      pattern = COALESCE(${data.pattern}, google_feed_products.pattern),
      size = COALESCE(${data.size}, google_feed_products.size),
      custom_label_0 = COALESCE(${data.customLabel0}, google_feed_products.custom_label_0),
      custom_label_1 = COALESCE(${data.customLabel1}, google_feed_products.custom_label_1),
      custom_label_2 = COALESCE(${data.customLabel2}, google_feed_products.custom_label_2),
      custom_label_3 = COALESCE(${data.customLabel3}, google_feed_products.custom_label_3),
      custom_label_4 = COALESCE(${data.customLabel4}, google_feed_products.custom_label_4),
      shipping_weight_grams = COALESCE(${data.shippingWeightGrams}, google_feed_products.shipping_weight_grams),
      shipping_length_cm = COALESCE(${data.shippingLengthCm}, google_feed_products.shipping_length_cm),
      shipping_width_cm = COALESCE(${data.shippingWidthCm}, google_feed_products.shipping_width_cm),
      shipping_height_cm = COALESCE(${data.shippingHeightCm}, google_feed_products.shipping_height_cm),
      shipping_label = COALESCE(${data.shippingLabel}, google_feed_products.shipping_label),
      sale_price_cents = COALESCE(${data.salePriceCents}, google_feed_products.sale_price_cents),
      sale_price_effective_start = COALESCE(${data.salePriceEffectiveStart}, google_feed_products.sale_price_effective_start),
      sale_price_effective_end = COALESCE(${data.salePriceEffectiveEnd}, google_feed_products.sale_price_effective_end),
      additional_image_urls = COALESCE(${data.additionalImageUrls ? JSON.stringify(data.additionalImageUrls) : null}::jsonb, google_feed_products.additional_image_urls),
      updated_at = NOW()
    RETURNING
      id,
      shopify_product_id as "shopifyProductId",
      shopify_variant_id as "shopifyVariantId",
      is_excluded as "isExcluded",
      exclude_reason as "excludeReason",
      title_override as "titleOverride",
      description_override as "descriptionOverride",
      gtin,
      mpn,
      brand_override as "brandOverride",
      google_category_id as "googleCategoryId",
      product_type as "productType",
      condition_override as "conditionOverride",
      adult,
      age_group as "ageGroup",
      gender,
      color,
      material,
      pattern,
      size,
      custom_label_0 as "customLabel0",
      custom_label_1 as "customLabel1",
      custom_label_2 as "customLabel2",
      custom_label_3 as "customLabel3",
      custom_label_4 as "customLabel4",
      shipping_weight_grams as "shippingWeightGrams",
      shipping_length_cm as "shippingLengthCm",
      shipping_width_cm as "shippingWidthCm",
      shipping_height_cm as "shippingHeightCm",
      shipping_label as "shippingLabel",
      sale_price_cents as "salePriceCents",
      sale_price_effective_start as "salePriceEffectiveStart",
      sale_price_effective_end as "salePriceEffectiveEnd",
      additional_image_urls as "additionalImageUrls",
      sync_status as "syncStatus",
      last_sync_at as "lastSyncAt",
      merchant_status as "merchantStatus",
      merchant_issues as "merchantIssues",
      merchant_last_checked_at as "merchantLastCheckedAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `

  return result.rows[0] as GoogleFeedProduct
}

export async function setProductExcluded(
  shopifyProductId: string,
  shopifyVariantId: string | null,
  isExcluded: boolean,
  reason?: string
): Promise<void> {
  await upsertGoogleFeedProduct(shopifyProductId, shopifyVariantId, {
    isExcluded,
    excludeReason: isExcluded ? reason : undefined,
  })
}

// ---------------------------------------------------------------------------
// Sync History Operations
// ---------------------------------------------------------------------------

export async function createSyncHistory(): Promise<GoogleFeedSyncHistory> {
  const result = await sql`
    INSERT INTO google_feed_sync_history (status)
    VALUES ('running')
    RETURNING
      id,
      started_at as "startedAt",
      completed_at as "completedAt",
      status,
      total_products as "totalProducts",
      products_synced as "productsSynced",
      products_added as "productsAdded",
      products_updated as "productsUpdated",
      products_removed as "productsRemoved",
      products_excluded as "productsExcluded",
      products_with_errors as "productsWithErrors",
      errors,
      feed_url as "feedUrl",
      feed_size_bytes as "feedSizeBytes",
      feed_product_count as "feedProductCount",
      duration_ms as "durationMs",
      created_at as "createdAt"
  `

  return result.rows[0] as GoogleFeedSyncHistory
}

export async function completeSyncHistory(
  syncId: string,
  data: {
    status: 'completed' | 'failed' | 'cancelled'
    totalProducts?: number
    productsSynced?: number
    productsAdded?: number
    productsUpdated?: number
    productsRemoved?: number
    productsExcluded?: number
    productsWithErrors?: number
    errors?: Array<{ productId: string; error: string }>
    feedUrl?: string
    feedSizeBytes?: number
    feedProductCount?: number
  }
): Promise<void> {
  const startedAt = await sql`SELECT started_at FROM google_feed_sync_history WHERE id = ${syncId}`
  const durationMs = startedAt.rows[0]
    ? Date.now() - new Date(startedAt.rows[0].started_at).getTime()
    : null

  await sql`
    UPDATE google_feed_sync_history SET
      completed_at = NOW(),
      status = ${data.status}::google_feed_sync_status,
      total_products = COALESCE(${data.totalProducts ?? null}, total_products),
      products_synced = COALESCE(${data.productsSynced ?? null}, products_synced),
      products_added = COALESCE(${data.productsAdded ?? null}, products_added),
      products_updated = COALESCE(${data.productsUpdated ?? null}, products_updated),
      products_removed = COALESCE(${data.productsRemoved ?? null}, products_removed),
      products_excluded = COALESCE(${data.productsExcluded ?? null}, products_excluded),
      products_with_errors = COALESCE(${data.productsWithErrors ?? null}, products_with_errors),
      errors = COALESCE(${data.errors ? JSON.stringify(data.errors) : null}::jsonb, errors),
      feed_url = COALESCE(${data.feedUrl ?? null}, feed_url),
      feed_size_bytes = COALESCE(${data.feedSizeBytes ?? null}, feed_size_bytes),
      feed_product_count = COALESCE(${data.feedProductCount ?? null}, feed_product_count),
      duration_ms = ${durationMs}
    WHERE id = ${syncId}
  `
}

export async function getLatestSyncHistory(): Promise<GoogleFeedSyncHistory | null> {
  const result = await sql`
    SELECT
      id,
      started_at as "startedAt",
      completed_at as "completedAt",
      status,
      total_products as "totalProducts",
      products_synced as "productsSynced",
      products_added as "productsAdded",
      products_updated as "productsUpdated",
      products_removed as "productsRemoved",
      products_excluded as "productsExcluded",
      products_with_errors as "productsWithErrors",
      errors,
      feed_url as "feedUrl",
      feed_size_bytes as "feedSizeBytes",
      feed_product_count as "feedProductCount",
      duration_ms as "durationMs",
      created_at as "createdAt"
    FROM google_feed_sync_history
    ORDER BY started_at DESC
    LIMIT 1
  `

  return result.rows[0] as GoogleFeedSyncHistory | undefined ?? null
}

export async function getSyncHistoryList(
  limit: number = 20,
  offset: number = 0
): Promise<GoogleFeedSyncHistory[]> {
  const result = await sql`
    SELECT
      id,
      started_at as "startedAt",
      completed_at as "completedAt",
      status,
      total_products as "totalProducts",
      products_synced as "productsSynced",
      products_added as "productsAdded",
      products_updated as "productsUpdated",
      products_removed as "productsRemoved",
      products_excluded as "productsExcluded",
      products_with_errors as "productsWithErrors",
      errors,
      feed_url as "feedUrl",
      feed_size_bytes as "feedSizeBytes",
      feed_product_count as "feedProductCount",
      duration_ms as "durationMs",
      created_at as "createdAt"
    FROM google_feed_sync_history
    ORDER BY started_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  return result.rows as GoogleFeedSyncHistory[]
}

// ---------------------------------------------------------------------------
// Coverage and Stats
// ---------------------------------------------------------------------------

export async function getProductCoverage(): Promise<{
  totalProducts: number
  productsInFeed: number
  productsExcluded: number
  productsWithWarnings: number
}> {
  const totalResult = await sql`SELECT COUNT(*) as count FROM products WHERE status = 'active'`
  const total = Number(totalResult.rows[0]?.count || 0)

  const excludedResult = await sql`
    SELECT COUNT(*) as count FROM google_feed_products WHERE is_excluded = true
  `
  const excluded = Number(excludedResult.rows[0]?.count || 0)

  const warningsResult = await sql`
    SELECT COUNT(*) as count FROM google_feed_products
    WHERE merchant_status = 'warning' OR jsonb_array_length(merchant_issues) > 0
  `
  const warnings = Number(warningsResult.rows[0]?.count || 0)

  return {
    totalProducts: total,
    productsInFeed: total - excluded,
    productsExcluded: excluded,
    productsWithWarnings: warnings,
  }
}

export async function getFeedHealth(): Promise<{
  approvalRate: number
  disapprovedCount: number
  pendingCount: number
  warningsCount: number
}> {
  const statsResult = await sql`
    SELECT
      COUNT(*) FILTER (WHERE merchant_status = 'approved') as approved,
      COUNT(*) FILTER (WHERE merchant_status = 'disapproved') as disapproved,
      COUNT(*) FILTER (WHERE merchant_status = 'pending') as pending,
      COUNT(*) FILTER (WHERE merchant_status = 'warning') as warnings,
      COUNT(*) as total
    FROM google_feed_products
    WHERE is_excluded = false
  `

  const stats = statsResult.rows[0] || {
    approved: 0,
    disapproved: 0,
    pending: 0,
    warnings: 0,
    total: 0,
  }

  const total = Number(stats.total)
  const approved = Number(stats.approved)

  return {
    approvalRate: total > 0 ? (approved / total) * 100 : 0,
    disapprovedCount: Number(stats.disapproved),
    pendingCount: Number(stats.pending),
    warningsCount: Number(stats.warnings),
  }
}
