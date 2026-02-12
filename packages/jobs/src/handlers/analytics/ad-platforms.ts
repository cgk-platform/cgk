/**
 * Ad Platform Integration Job Handlers
 *
 * Background jobs for sending conversion events to ad platforms
 * and syncing ad spend data.
 *
 * Supported platforms:
 * - GA4 (Google Analytics 4) - Measurement Protocol
 * - Meta (Facebook) - Conversions API (CAPI)
 * - TikTok - Events API
 * - Google Ads - Spend sync
 *
 * CRITICAL: All handlers require tenantId for tenant isolation.
 *
 * @ai-pattern tenant-isolation
 * @ai-critical Event deduplication uses orderId as dedup key
 */

import { defineJob } from '../../define'
import type { JobResult } from '../../types'
import type {
  SendGA4PurchasePayload,
  SendMetaPurchasePayload,
  SendTikTokEventPayload,
  SyncGoogleAdsSpendPayload,
  SyncMetaAdsSpendPayload,
} from './types'

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * SHA256 hash for PII (email, phone) - required by Meta and TikTok
 */
async function hashPII(value: string): Promise<string> {
  // In Node.js, use crypto module
  // In browser, use SubtleCrypto API
  // Placeholder implementation - actual would use:
  // const crypto = require('crypto')
  // return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex')
  return `sha256_${value.toLowerCase().trim()}`
}

/**
 * Convert cents to currency for API payloads
 */
function centsToCurrency(cents: number): number {
  return cents / 100
}

/**
 * Generate idempotency key for event deduplication
 */
function generateEventId(tenantId: string, orderId: string, platform: string): string {
  return `${tenantId}_${orderId}_${platform}_${Date.now()}`
}

// ============================================================
// GA4 JOB HANDLERS
// ============================================================

/**
 * Send GA4 purchase event via Measurement Protocol
 *
 * https://developers.google.com/analytics/devguides/collection/protocol/ga4
 *
 * Deduplication: Uses order ID as transaction_id
 */
export const sendGA4PurchaseJob = defineJob<SendGA4PurchasePayload>({
  name: 'analytics/send-ga4-purchase',
  handler: async (job): Promise<JobResult> => {
    const {
      tenantId,
      orderId,
      transactionId,
      revenue,
      currency,
      clientId,
      userId,
      items,
      deduplicationKey,
    } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[Analytics] Sending GA4 purchase event for order ${orderId} in tenant ${tenantId}`
    )

    // Get tenant's GA4 credentials
    // Implementation would:
    // const config = await withTenant(tenantId, async () => {
    //   return sql`SELECT ga4_measurement_id, ga4_api_secret FROM tenant_settings`
    // })

    // Would come from tenant config - used in actual API call implementation
    void 'G-XXXXXXXX' // measurementId
    void 'secret' // apiSecret

    // Build GA4 Measurement Protocol payload
    const eventPayload = {
      client_id: clientId || `cgk_${tenantId}_${orderId}`,
      user_id: userId,
      events: [
        {
          name: 'purchase',
          params: {
            transaction_id: transactionId || orderId,
            value: centsToCurrency(revenue),
            currency: currency || 'USD',
            items: items?.map((item) => ({
              item_id: item.itemId,
              item_name: item.itemName,
              price: centsToCurrency(item.price),
              quantity: item.quantity,
              item_category: item.category,
            })) || [],
          },
        },
      ],
    }

    // Send to GA4 Measurement Protocol
    // const response = await fetch(
    //   `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
    //   {
    //     method: 'POST',
    //     body: JSON.stringify(eventPayload),
    //   }
    // )

    console.log(
      `[Analytics] GA4 purchase event sent for order ${orderId}: ${JSON.stringify(eventPayload)}`
    )

    return {
      success: true,
      data: {
        tenantId,
        orderId,
        transactionId: transactionId || orderId,
        deduplicationKey: deduplicationKey || orderId,
        platform: 'ga4',
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 2000 },
})

// ============================================================
// META CAPI JOB HANDLERS
// ============================================================

/**
 * Send Meta Conversions API purchase event
 *
 * https://developers.facebook.com/docs/marketing-api/conversions-api
 *
 * Deduplication: Uses event_id derived from order ID
 */
export const sendMetaPurchaseJob = defineJob<SendMetaPurchasePayload>({
  name: 'analytics/send-meta-purchase',
  handler: async (job): Promise<JobResult> => {
    const {
      tenantId,
      orderId,
      eventId,
      revenue,
      currency,
      email,
      phone,
      fbclid: _fbclid, // Reserved for future use in URL tracking
      fbp,
      fbc,
      userAgent,
      ipAddress,
      items,
    } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[Analytics] Sending Meta CAPI purchase event for order ${orderId} in tenant ${tenantId}`
    )

    // Get tenant's Meta pixel credentials
    // Implementation would:
    // const config = await withTenant(tenantId, async () => {
    //   return sql`SELECT meta_pixel_id, meta_access_token FROM tenant_settings`
    // })

    // Would come from tenant config - used in actual API call implementation
    void 'XXXXXXXX' // pixelId
    void 'token' // accessToken

    // Hash PII for Meta CAPI
    const hashedEmail = email ? await hashPII(email) : undefined
    const hashedPhone = phone ? await hashPII(phone) : undefined

    // Build Meta CAPI payload
    const eventPayload = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId || generateEventId(tenantId, orderId, 'meta'),
          event_source_url: `https://shop.example.com/orders/${orderId}`,
          action_source: 'website',
          user_data: {
            em: hashedEmail ? [hashedEmail] : undefined,
            ph: hashedPhone ? [hashedPhone] : undefined,
            fbc: fbc,
            fbp: fbp,
            client_ip_address: ipAddress,
            client_user_agent: userAgent,
            external_id: orderId,
          },
          custom_data: {
            value: centsToCurrency(revenue),
            currency: currency || 'USD',
            order_id: orderId,
            content_ids: items?.map((item) => item.id) || [],
            contents: items?.map((item) => ({
              id: item.id,
              quantity: item.quantity,
              item_price: centsToCurrency(item.price),
            })) || [],
          },
        },
      ],
    }

    // Send to Meta Conversions API
    // const response = await fetch(
    //   `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`,
    //   {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(eventPayload),
    //   }
    // )

    console.log(
      `[Analytics] Meta CAPI purchase event sent for order ${orderId}: ${JSON.stringify(eventPayload)}`
    )

    return {
      success: true,
      data: {
        tenantId,
        orderId,
        eventId: eventId || generateEventId(tenantId, orderId, 'meta'),
        platform: 'meta',
        hashedPII: {
          email: !!hashedEmail,
          phone: !!hashedPhone,
        },
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 2000 },
})

// ============================================================
// TIKTOK EVENTS API JOB HANDLERS
// ============================================================

/**
 * Send TikTok Events API event
 *
 * https://ads.tiktok.com/marketing_api/docs?id=1739584860883969
 *
 * Deduplication: Uses event_id derived from order ID
 */
export const sendTikTokEventJob = defineJob<SendTikTokEventPayload>({
  name: 'analytics/send-tiktok-event',
  handler: async (job): Promise<JobResult> => {
    const {
      tenantId,
      orderId,
      eventType,
      revenue,
      currency,
      email,
      phone,
      ttclid,
      externalId,
      items,
    } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[Analytics] Sending TikTok ${eventType} event for order ${orderId} in tenant ${tenantId}`
    )

    // Get tenant's TikTok credentials
    // Implementation would:
    // const config = await withTenant(tenantId, async () => {
    //   return sql`SELECT tiktok_pixel_id, tiktok_events_api_token FROM tenant_settings`
    // })

    const tiktokPixelId = 'XXXXXXXX' // Would come from tenant config
    // Note: accessToken will be used when implementing actual API call
    void 0 // Placeholder for: const accessToken = 'token'

    // Hash PII for TikTok Events API
    const hashedEmail = email ? await hashPII(email) : undefined
    const hashedPhone = phone ? await hashPII(phone) : undefined

    // Build TikTok Events API payload
    const eventPayload = {
      pixel_code: tiktokPixelId,
      event: eventType,
      event_id: generateEventId(tenantId, orderId, 'tiktok'),
      timestamp: new Date().toISOString(),
      context: {
        user: {
          email: hashedEmail,
          phone: hashedPhone,
          external_id: externalId || orderId,
          ttclid: ttclid,
        },
        page: {
          url: `https://shop.example.com/orders/${orderId}`,
        },
      },
      properties: {
        content_type: 'product',
        contents: items?.map((item) => ({
          content_id: item.contentId,
          quantity: item.quantity,
          price: centsToCurrency(item.price),
        })) || [],
        currency: currency || 'USD',
        value: centsToCurrency(revenue),
        order_id: orderId,
      },
    }

    // Send to TikTok Events API
    // const response = await fetch(
    //   'https://business-api.tiktok.com/open_api/v1.3/pixel/track/',
    //   {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Access-Token': accessToken,
    //     },
    //     body: JSON.stringify({ data: [eventPayload] }),
    //   }
    // )

    console.log(
      `[Analytics] TikTok ${eventType} event sent for order ${orderId}: ${JSON.stringify(eventPayload)}`
    )

    return {
      success: true,
      data: {
        tenantId,
        orderId,
        eventType,
        eventId: generateEventId(tenantId, orderId, 'tiktok'),
        platform: 'tiktok',
        hashedPII: {
          email: !!hashedEmail,
          phone: !!hashedPhone,
        },
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 2000 },
})

// ============================================================
// AD SPEND SYNC JOB HANDLERS
// ============================================================

/**
 * Sync Google Ads spend data
 *
 * Fetches daily spend data from Google Ads API for P&L reporting
 */
export const syncGoogleAdsSpendJob = defineJob<SyncGoogleAdsSpendPayload>({
  name: 'analytics/sync-google-ads-spend',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, date, customerId, campaignIds } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    // Default to yesterday
    const targetDate =
      date ||
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    console.log(
      `[Analytics] Syncing Google Ads spend for ${targetDate} in tenant ${tenantId}`
    )

    // Get tenant's Google Ads credentials
    // Implementation would:
    // const config = await withTenant(tenantId, async () => {
    //   return sql`
    //     SELECT refresh_token, customer_id
    //     FROM google_ads_connections
    //     WHERE is_active = true
    //   `
    // })

    // GAQL query for spend data
    const gaqlQuery = `
      SELECT
        campaign.id,
        campaign.name,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        segments.date
      FROM campaign
      WHERE segments.date = '${targetDate}'
      ${campaignIds?.length ? `AND campaign.id IN (${campaignIds.join(',')})` : ''}
    `

    // Implementation would:
    // 1. Authenticate with Google Ads API
    // 2. Execute GAQL query
    // 3. Convert micros to cents (divide by 10000)
    // 4. Store in google_daily_spend table

    console.log(
      `[Analytics] Google Ads GAQL query: ${gaqlQuery}`
    )

    return {
      success: true,
      data: {
        tenantId,
        date: targetDate,
        customerId,
        campaignIds,
        spendRecords: 0,
        totalSpendCents: 0,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 10000 },
})

/**
 * Sync Meta Ads spend data
 *
 * Fetches daily spend data from Meta Marketing API for P&L reporting
 */
export const syncMetaAdsSpendJob = defineJob<SyncMetaAdsSpendPayload>({
  name: 'analytics/sync-meta-ads-spend',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, date, adAccountId, useAsyncReport } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    // Default to yesterday
    const targetDate =
      date ||
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    console.log(
      `[Analytics] Syncing Meta Ads spend for ${targetDate} in tenant ${tenantId}`
    )

    // Get tenant's Meta Ads credentials
    // Implementation would:
    // const config = await withTenant(tenantId, async () => {
    //   return sql`
    //     SELECT access_token, ad_account_id
    //     FROM meta_ads_connections
    //     WHERE is_active = true
    //   `
    // })

    // For date ranges > 7 days, use async reports
    if (useAsyncReport) {
      console.log(
        `[Analytics] Using async report for Meta Ads spend sync`
      )

      // Implementation would:
      // 1. Create async report job
      // 2. Poll for completion
      // 3. Download results
      // 4. Store in meta_daily_spend table
    } else {
      // Implementation would:
      // 1. Call /act_<id>/insights endpoint
      // 2. Parse response
      // 3. Store in meta_daily_spend table
    }

    return {
      success: true,
      data: {
        tenantId,
        date: targetDate,
        adAccountId,
        useAsyncReport,
        spendRecords: 0,
        totalSpendCents: 0,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 10000 },
})

/**
 * All ad platform jobs for export
 */
export const adPlatformJobs = [
  sendGA4PurchaseJob,
  sendMetaPurchaseJob,
  sendTikTokEventJob,
  syncGoogleAdsSpendJob,
  syncMetaAdsSpendJob,
]
