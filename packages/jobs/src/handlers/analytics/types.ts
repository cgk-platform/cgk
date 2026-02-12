/**
 * Analytics Job Types
 *
 * Type definitions for analytics-related background jobs.
 * All payloads include tenantId for mandatory tenant isolation.
 *
 * @ai-pattern analytics-jobs
 * @ai-critical All payloads MUST include tenantId
 */

// ============================================================
// ATTRIBUTION TYPES
// ============================================================

/**
 * Attribution model types supported by the platform
 */
export type AttributionModel =
  | 'first_touch'
  | 'last_touch'
  | 'linear'
  | 'time_decay'
  | 'position_based'

/**
 * Attribution result for a single model
 */
export interface AttributionResult {
  model: AttributionModel
  touchpointId: string
  credit: number // 0-1 representing percentage
  value: number // Actual attributed revenue in cents
}

/**
 * Touchpoint data for attribution calculation
 */
export interface Touchpoint {
  id: string
  visitorId: string
  source: string
  medium?: string
  campaign?: string
  content?: string
  timestamp: Date
  pageUrl?: string
  referrer?: string
  utmParams?: Record<string, string>
}

/**
 * Conversion data for attribution
 */
export interface Conversion {
  orderId: string
  visitorId: string
  customerId?: string
  revenue: number // cents
  currency: string
  timestamp: Date
  products?: Array<{
    productId: string
    quantity: number
    price: number
  }>
}

// ============================================================
// ATTRIBUTION JOB PAYLOADS
// ============================================================

/**
 * Main attribution processing payload
 */
export interface ProcessAttributionPayload {
  tenantId: string
  orderId: string
  visitorId?: string
  skipGA4?: boolean
  skipMeta?: boolean
}

/**
 * Daily metrics aggregation payload
 */
export interface AttributionDailyMetricsPayload {
  tenantId: string
  date?: string // ISO date, defaults to yesterday
  forceRecalculate?: boolean
}

/**
 * Export scheduler payload
 */
export interface AttributionExportSchedulerPayload {
  tenantId: string
  exportId?: string
  format?: 'csv' | 'json'
}

/**
 * Fairing survey bridge payload
 */
export interface AttributionFairingBridgePayload {
  tenantId: string
  surveyId?: string
  sinceDays?: number
}

/**
 * ML training payload
 */
export interface AttributionMLTrainingPayload {
  tenantId: string
  trainingDays?: number // Default 90
  modelVersion?: string
  checkpoint?: {
    step: number
    epoch: number
    lossHistory: number[]
  }
}

/**
 * Order reconciliation payload
 */
export interface AttributionOrderReconciliationPayload {
  tenantId: string
  orderId?: string
  startDate?: string
  endDate?: string
  batchSize?: number
}

/**
 * Recalculate recent payload
 */
export interface AttributionRecalculateRecentPayload {
  tenantId: string
  days?: number // Default 3
}

/**
 * TikTok spend sync payload
 */
export interface SyncTikTokSpendPayload {
  tenantId: string
  date?: string
  accountId?: string
}

/**
 * VTA (View-Through Attribution) sync payload
 */
export interface AttributionVTASyncPayload {
  tenantId: string
  platform?: 'meta' | 'tiktok' | 'google'
  lookbackDays?: number
}

/**
 * Process unattributed orders payload
 */
export interface AttributionProcessUnattributedPayload {
  tenantId: string
  batchSize?: number // Default 50
  maxAgeHours?: number // Don't retry orders older than this
}

/**
 * Webhook queue processing payload
 */
export interface AttributionWebhookQueuePayload {
  tenantId: string
  batchSize?: number
  queueType?: 'attribution' | 'conversion' | 'touchpoint'
}

// ============================================================
// METRICS AGGREGATION PAYLOADS
// ============================================================

/**
 * Daily metrics aggregation payload
 */
export interface AggregateDailyMetricsPayload {
  tenantId: string
  date?: string // ISO date, defaults to yesterday
  metrics?: Array<'revenue' | 'attribution' | 'customers' | 'all'>
}

/**
 * Hourly metrics rollup payload
 */
export interface HourlyMetricsRollupPayload {
  tenantId: string
  hour?: string // ISO datetime, defaults to previous hour
}

/**
 * Weekly metrics summary payload
 */
export interface WeeklyMetricsSummaryPayload {
  tenantId: string
  weekStart?: string // ISO date, defaults to previous week
  includeTrends?: boolean
}

// ============================================================
// AD PLATFORM PAYLOADS
// ============================================================

/**
 * GA4 purchase event payload
 */
export interface SendGA4PurchasePayload {
  tenantId: string
  orderId: string
  transactionId?: string
  revenue: number // cents
  currency: string
  clientId?: string
  userId?: string
  items?: Array<{
    itemId: string
    itemName: string
    price: number
    quantity: number
    category?: string
  }>
  deduplicationKey?: string
}

/**
 * Meta CAPI purchase event payload
 */
export interface SendMetaPurchasePayload {
  tenantId: string
  orderId: string
  eventId?: string
  revenue: number // cents
  currency: string
  email?: string // Will be hashed
  phone?: string // Will be hashed
  fbclid?: string
  fbp?: string
  fbc?: string
  userAgent?: string
  ipAddress?: string
  items?: Array<{
    id: string
    quantity: number
    price: number
  }>
}

/**
 * TikTok Events API payload
 */
export interface SendTikTokEventPayload {
  tenantId: string
  orderId: string
  eventType: 'CompletePayment' | 'AddToCart' | 'ViewContent' | 'InitiateCheckout'
  revenue: number // cents
  currency: string
  email?: string // Will be hashed
  phone?: string // Will be hashed
  ttclid?: string
  externalId?: string
  items?: Array<{
    contentId: string
    quantity: number
    price: number
  }>
}

/**
 * Google Ads spend sync payload
 */
export interface SyncGoogleAdsSpendPayload {
  tenantId: string
  date?: string
  customerId?: string
  campaignIds?: string[]
}

/**
 * Meta Ads spend sync payload
 */
export interface SyncMetaAdsSpendPayload {
  tenantId: string
  date?: string
  adAccountId?: string
  useAsyncReport?: boolean
}

// ============================================================
// SCHEDULE CONSTANTS
// ============================================================

/**
 * Analytics job schedules
 */
export const ANALYTICS_SCHEDULES = {
  // Attribution schedules
  'attribution.dailyMetrics': { cron: '10 2 * * *', timezone: 'UTC' }, // 2:10 AM
  'attribution.exportScheduler': { cron: '*/15 * * * *', timezone: 'UTC' }, // Every 15 min
  'attribution.fairingBridge': { cron: '15 * * * *', timezone: 'UTC' }, // Every hour :15
  'attribution.mlTraining': { cron: '0 4 * * *', timezone: 'UTC' }, // 4 AM (30 min timeout)
  'attribution.orderReconciliation': { cron: '45 * * * *', timezone: 'UTC' }, // Every hour :45
  'attribution.recalculateRecent': { cron: '0 4 * * *', timezone: 'UTC' }, // 4 AM
  'attribution.tiktokSpend': { cron: '0 3 * * *', timezone: 'UTC' }, // 3 AM
  'attribution.vtaSync': { cron: '30 2 * * *', timezone: 'UTC' }, // 2:30 AM
  'attribution.processUnattributed': { cron: '30 * * * *', timezone: 'UTC' }, // Every hour :30
  'attribution.webhookQueue': { cron: '*/5 * * * *', timezone: 'UTC' }, // Every 5 min

  // Metrics schedules
  'metrics.dailyAggregate': { cron: '0 2 * * *', timezone: 'UTC' }, // 2 AM
  'metrics.hourlyRollup': { cron: '5 * * * *', timezone: 'UTC' }, // Every hour :05
  'metrics.weeklySummary': { cron: '0 8 * * 1', timezone: 'UTC' }, // Monday 8 AM

  // Ad spend sync schedules
  'adSpend.googleSync': { cron: '0 5 * * *', timezone: 'UTC' }, // 5 AM
  'adSpend.metaSync': { cron: '0 5 * * *', timezone: 'UTC' }, // 5 AM
} as const
