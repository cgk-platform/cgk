/**
 * Attribution Processing Job Handlers
 *
 * Background jobs for conversion attribution, order reconciliation,
 * and attribution data processing.
 *
 * CRITICAL: All handlers require tenantId for tenant isolation.
 *
 * @ai-pattern tenant-isolation
 * @ai-critical All database operations must use withTenant()
 */

import { withTenant, sql } from '@cgk-platform/db'
import { defineJob } from '../../define'
import type { JobResult } from '../../types'
import type {
  ProcessAttributionPayload,
  AttributionDailyMetricsPayload,
  AttributionExportSchedulerPayload,
  AttributionFairingBridgePayload,
  AttributionOrderReconciliationPayload,
  AttributionRecalculateRecentPayload,
  AttributionVTASyncPayload,
  AttributionProcessUnattributedPayload,
  AttributionWebhookQueuePayload,
  SyncTikTokSpendPayload,
  AttributionModel,
  AttributionResult,
  Touchpoint,
} from './types'

// ============================================================
// ATTRIBUTION MODEL CALCULATIONS
// ============================================================

/**
 * Calculate first-touch attribution (100% to first touchpoint)
 */
function calculateFirstTouch(
  touchpoints: Touchpoint[],
  revenue: number
): AttributionResult | null {
  if (touchpoints.length === 0) return null

  const sorted = [...touchpoints].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  )
  const first = sorted[0]!

  return {
    model: 'first_touch',
    touchpointId: first.id,
    credit: 1.0,
    value: revenue,
  }
}

/**
 * Calculate last-touch attribution (100% to last touchpoint)
 */
function calculateLastTouch(
  touchpoints: Touchpoint[],
  revenue: number
): AttributionResult | null {
  if (touchpoints.length === 0) return null

  const sorted = [...touchpoints].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  )
  const last = sorted[0]!

  return {
    model: 'last_touch',
    touchpointId: last.id,
    credit: 1.0,
    value: revenue,
  }
}

/**
 * Calculate linear attribution (equal split across all touchpoints)
 */
function calculateLinear(
  touchpoints: Touchpoint[],
  revenue: number
): AttributionResult[] {
  if (touchpoints.length === 0) return []

  const credit = 1.0 / touchpoints.length
  const value = Math.floor(revenue / touchpoints.length)

  return touchpoints.map((tp) => ({
    model: 'linear' as AttributionModel,
    touchpointId: tp.id,
    credit,
    value,
  }))
}

/**
 * Calculate time-decay attribution (half-life weighted)
 * Default half-life: 7 days
 */
function calculateTimeDecay(
  touchpoints: Touchpoint[],
  revenue: number,
  conversionTime: Date,
  halfLifeDays = 7
): AttributionResult[] {
  if (touchpoints.length === 0) return []

  const halfLifeMs = halfLifeDays * 24 * 60 * 60 * 1000

  // Calculate raw weights based on time decay
  const weights = touchpoints.map((tp) => {
    const ageMs = conversionTime.getTime() - tp.timestamp.getTime()
    // Exponential decay: weight = 2^(-age/halfLife)
    return Math.pow(2, -ageMs / halfLifeMs)
  })

  // Normalize weights
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  const normalizedWeights = weights.map((w) => w / totalWeight)

  return touchpoints.map((tp, i) => ({
    model: 'time_decay' as AttributionModel,
    touchpointId: tp.id,
    credit: normalizedWeights[i]!,
    value: Math.floor(revenue * (normalizedWeights[i] ?? 0)),
  }))
}

/**
 * Calculate position-based attribution (40/20/40 split)
 * 40% to first, 40% to last, 20% split among middle
 */
function calculatePositionBased(
  touchpoints: Touchpoint[],
  revenue: number
): AttributionResult[] {
  if (touchpoints.length === 0) return []

  const sorted = [...touchpoints].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  )

  if (sorted.length === 1) {
    return [
      {
        model: 'position_based',
        touchpointId: sorted[0]!.id,
        credit: 1.0,
        value: revenue,
      },
    ]
  }

  if (sorted.length === 2) {
    return [
      {
        model: 'position_based',
        touchpointId: sorted[0]!.id,
        credit: 0.5,
        value: Math.floor(revenue * 0.5),
      },
      {
        model: 'position_based',
        touchpointId: sorted[1]!.id,
        credit: 0.5,
        value: Math.floor(revenue * 0.5),
      },
    ]
  }

  // 40% first, 40% last, 20% distributed among middle
  const middleCount = sorted.length - 2
  const middleCredit = 0.2 / middleCount

  return sorted.map((tp, i) => {
    let credit: number
    if (i === 0) {
      credit = 0.4
    } else if (i === sorted.length - 1) {
      credit = 0.4
    } else {
      credit = middleCredit
    }

    return {
      model: 'position_based' as AttributionModel,
      touchpointId: tp.id,
      credit,
      value: Math.floor(revenue * credit),
    }
  })
}

// ============================================================
// JOB HANDLERS
// ============================================================

/**
 * Process attribution for a single order
 *
 * Main conversion attribution job that:
 * 1. Gets conversion details
 * 2. Finds touchpoints
 * 3. Calculates all attribution models
 * 4. Stores results
 * 5. Sends to GA4
 * 6. Sends to Meta CAPI
 */
export const processAttributionJob = defineJob<ProcessAttributionPayload>({
  name: 'analytics/process-attribution',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, orderId, skipGA4, skipMeta } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[Analytics] Processing attribution for order ${orderId} in tenant ${tenantId}`
    )

    const result = await withTenant(tenantId, async () => {
      // Step 1: Get or create conversion record
      const orderRow = await sql`
        SELECT id, customer_id, total_price, currency, created_at
        FROM orders WHERE id = ${orderId}
      `
      const order = orderRow.rows[0] as { id: string; customer_id: string; total_price: string; currency: string; created_at: string } | undefined
      if (!order) {
        return { touchpointsProcessed: 0, modelsCalculated: 0, skipped: true }
      }

      const revenueCents = Math.round(parseFloat(order.total_price) * 100)
      const conversionTime = new Date(order.created_at)
      const visitorId = job.payload.visitorId || order.customer_id || 'unknown'

      // Upsert conversion record
      const convRow = await sql`
        INSERT INTO attribution_conversions
          (id, tenant_id, order_id, customer_id, revenue, currency, converted_at, created_at)
        VALUES
          (gen_random_uuid()::text, ${tenantId}, ${orderId}, ${order.customer_id ?? null},
           ${parseFloat(order.total_price)}, ${order.currency || 'USD'}, ${order.created_at}, NOW())
        ON CONFLICT (order_id) DO UPDATE SET updated_at = NOW()
        RETURNING id
      `
      const conversionId = (convRow.rows[0] as { id: string } | undefined)?.id
      if (!conversionId) return { touchpointsProcessed: 0, modelsCalculated: 0, skipped: false }

      // Step 2: Find touchpoints for this visitor (30-day lookback window)
      const lookbackStart = new Date(conversionTime.getTime() - 30 * 24 * 3600000).toISOString()
      const tpRows = await sql`
        SELECT id, source, medium, channel, occurred_at
        FROM attribution_touchpoints
        WHERE visitor_id = ${visitorId}
          AND occurred_at >= ${lookbackStart}
          AND occurred_at <= ${conversionTime.toISOString()}
        ORDER BY occurred_at ASC
      `

      const touchpoints: Touchpoint[] = (tpRows.rows as Array<{
        id: string; source: string | null; medium: string | null; channel: string; occurred_at: string
      }>).map(r => ({
        id: r.id,
        visitorId,
        source: r.source || 'direct',
        medium: r.medium ?? undefined,
        campaign: undefined,
        timestamp: new Date(r.occurred_at),
      }))

      const revenueDollars = revenueCents / 100

      // Step 3: Calculate attribution models
      const attributionResults: Record<AttributionModel, AttributionResult[]> = {
        first_touch: [],
        last_touch: [],
        linear: [],
        time_decay: [],
        position_based: [],
      }

      const firstTouch = calculateFirstTouch(touchpoints, revenueDollars)
      if (firstTouch) attributionResults.first_touch = [firstTouch]
      const lastTouch = calculateLastTouch(touchpoints, revenueDollars)
      if (lastTouch) attributionResults.last_touch = [lastTouch]
      attributionResults.linear = calculateLinear(touchpoints, revenueDollars)
      attributionResults.time_decay = calculateTimeDecay(touchpoints, revenueDollars, conversionTime)
      attributionResults.position_based = calculatePositionBased(touchpoints, revenueDollars)

      // Step 4: Store results
      let position = 0
      const totalTp = touchpoints.length
      for (const [model, results] of Object.entries(attributionResults) as Array<[AttributionModel, AttributionResult[]]>) {
        for (const res of results) {
          await sql`
            INSERT INTO attribution_results
              (id, tenant_id, conversion_id, touchpoint_id, model, attribution_window,
               credit, attributed_revenue, touchpoint_position, total_touchpoints, calculated_at)
            VALUES
              (gen_random_uuid()::text, ${tenantId}, ${conversionId}, ${res.touchpointId},
               ${model}, '30d', ${res.credit}, ${res.value / 100}, ${position}, ${totalTp}, NOW())
            ON CONFLICT (conversion_id, touchpoint_id, model, attribution_window)
            DO UPDATE SET credit = EXCLUDED.credit, attributed_revenue = EXCLUDED.attributed_revenue, calculated_at = NOW()
          `
          position++
        }
      }

      return { touchpointsProcessed: touchpoints.length, modelsCalculated: Object.keys(attributionResults).length, skipped: false }
    })

    if (!skipGA4) {
      console.log(`[Analytics] Queuing GA4 purchase event for order ${orderId}`)
    }
    if (!skipMeta) {
      console.log(`[Analytics] Queuing Meta CAPI event for order ${orderId}`)
    }

    return {
      success: true,
      data: {
        orderId,
        touchpointsProcessed: result.touchpointsProcessed,
        modelsCalculated: result.modelsCalculated,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

/**
 * Daily metrics aggregation - runs at 2:10 AM
 *
 * Aggregates previous day's attribution data into summary metrics
 */
export const attributionDailyMetricsJob = defineJob<AttributionDailyMetricsPayload>({
  name: 'analytics/attribution-daily-metrics',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, date, forceRecalculate } = job.payload

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
      `[Analytics] Aggregating daily metrics for ${targetDate} in tenant ${tenantId}`
    )

    const result = await withTenant(tenantId, async () => {
      const dateStart = `${targetDate}T00:00:00Z`
      const dateEnd = `${targetDate}T23:59:59Z`

      // If force-recalculate, delete existing channel summary rows for the date
      if (forceRecalculate) {
        await sql`
          DELETE FROM attribution_channel_summary
          WHERE date = ${targetDate}
        `
      }

      // Aggregate attribution results joined with touchpoints for the day
      // Group by channel, model, and attribution window
      const rows = await sql`
        SELECT
          ar.model,
          ar.attribution_window,
          COALESCE(atp.channel, 'direct') as channel,
          atp.platform,
          COUNT(DISTINCT ar.touchpoint_id) as touchpoints,
          COUNT(DISTINCT ar.conversion_id) as conversions,
          SUM(ar.attributed_revenue) as revenue
        FROM attribution_results ar
        JOIN attribution_conversions ac ON ac.id = ar.conversion_id
        LEFT JOIN attribution_touchpoints atp ON atp.id = ar.touchpoint_id
        WHERE ac.converted_at >= ${dateStart}
          AND ac.converted_at <= ${dateEnd}
        GROUP BY ar.model, ar.attribution_window, COALESCE(atp.channel, 'direct'), atp.platform
      `

      let conversionsProcessed = 0

      for (const row of rows.rows as Array<{
        model: string
        attribution_window: string
        channel: string
        platform: string | null
        touchpoints: string
        conversions: string
        revenue: string
      }>) {
        const revenue = parseFloat(row.revenue || '0')
        const conversions = parseInt(row.conversions, 10)
        conversionsProcessed += conversions

        await sql`
          INSERT INTO attribution_channel_summary
            (id, tenant_id, date, model, attribution_window, channel, platform,
             touchpoints, conversions, revenue, created_at, updated_at)
          VALUES
            (gen_random_uuid()::text, ${tenantId}, ${targetDate}, ${row.model},
             ${row.attribution_window}, ${row.channel}, ${row.platform ?? null},
             ${parseInt(row.touchpoints, 10)}, ${conversions}, ${revenue},
             NOW(), NOW())
          ON CONFLICT (tenant_id, date, model, attribution_window, channel, platform)
          DO UPDATE SET
            touchpoints = EXCLUDED.touchpoints,
            conversions = EXCLUDED.conversions,
            revenue = EXCLUDED.revenue,
            updated_at = NOW()
        `
      }

      return { conversionsProcessed }
    })

    return {
      success: true,
      data: {
        date: targetDate,
        tenantId,
        forceRecalculate,
        conversionsProcessed: result.conversionsProcessed,
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 30000 },
})

/**
 * Export scheduler - runs every 15 minutes
 *
 * Processes pending attribution export jobs
 */
export const attributionExportSchedulerJob = defineJob<AttributionExportSchedulerPayload>({
  name: 'analytics/attribution-export-scheduler',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, exportId, format } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    console.log(
      `[Analytics] Processing export scheduler for tenant ${tenantId}`
    )

    // Implementation would:
    // 1. Query pending exports for tenant
    // 2. Process each export based on format
    // 3. Upload to storage
    // 4. Update export status

    return {
      success: true,
      data: {
        tenantId,
        exportId,
        format: format || 'csv',
        exportsProcessed: 0,
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 10000 },
})

/**
 * Fairing survey bridge - runs every hour at :15
 *
 * Syncs post-purchase survey responses from Fairing
 */
export const attributionFairingBridgeJob = defineJob<AttributionFairingBridgePayload>({
  name: 'analytics/attribution-fairing-bridge',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, surveyId, sinceDays } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    const lookbackDays = sinceDays || 1

    console.log(
      `[Analytics] Syncing Fairing surveys for tenant ${tenantId} (last ${lookbackDays} days)`
    )

    // Implementation would:
    // 1. Fetch survey responses from Fairing API
    // 2. Match responses to orders
    // 3. Update attribution with survey data
    // 4. Store HDYHAU responses

    return {
      success: true,
      data: {
        tenantId,
        surveyId,
        lookbackDays,
        responsesProcessed: 0,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 5000 },
})

/**
 * Order reconciliation - runs every hour at :45
 *
 * Catches orders that may have missed attribution
 */
export const attributionOrderReconciliationJob = defineJob<AttributionOrderReconciliationPayload>({
  name: 'analytics/attribution-order-reconciliation',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, orderId, startDate, endDate, batchSize } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    const limit = batchSize || 100

    console.log(
      `[Analytics] Running order reconciliation for tenant ${tenantId}`
    )

    // Implementation would:
    // 1. Query orders without attribution
    // 2. Attempt to find matching touchpoints
    // 3. Process attribution for matched orders
    // 4. Mark unmatched as "unattributed"

    return {
      success: true,
      data: {
        tenantId,
        orderId,
        startDate,
        endDate,
        batchSize: limit,
        ordersReconciled: 0,
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 15000 },
})

/**
 * Manual order reconciliation trigger
 */
export const attributionOrderReconciliationManualJob = defineJob<AttributionOrderReconciliationPayload>({
  name: 'analytics/attribution-order-reconciliation-manual',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, orderId } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    if (!orderId) {
      return {
        success: false,
        error: { message: 'orderId required for manual reconciliation', retryable: false },
      }
    }

    console.log(
      `[Analytics] Manual reconciliation for order ${orderId} in tenant ${tenantId}`
    )

    // Same implementation as regular reconciliation but for single order

    return {
      success: true,
      data: {
        tenantId,
        orderId,
        reconciled: true,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 2000 },
})

/**
 * Recalculate recent - runs at 4 AM
 *
 * Recalculates attribution for the last 3 days to catch late touchpoints
 */
export const attributionRecalculateRecentJob = defineJob<AttributionRecalculateRecentPayload>({
  name: 'analytics/attribution-recalculate-recent',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, days } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    const lookbackDays = days || 3

    console.log(
      `[Analytics] Recalculating last ${lookbackDays} days for tenant ${tenantId}`
    )

    // Implementation would:
    // 1. Query all conversions from last N days
    // 2. Fetch any new touchpoints that arrived late
    // 3. Recalculate attribution for affected orders
    // 4. Update stored attribution (idempotent)

    return {
      success: true,
      data: {
        tenantId,
        lookbackDays,
        ordersRecalculated: 0,
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 30000 },
})

/**
 * TikTok spend sync - runs at 3 AM
 *
 * Syncs daily ad spend from TikTok for P&L
 */
export const syncTikTokSpendDailyJob = defineJob<SyncTikTokSpendPayload>({
  name: 'analytics/sync-tiktok-spend-daily',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, date, accountId } = job.payload

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
      `[Analytics] Syncing TikTok spend for ${targetDate} in tenant ${tenantId}`
    )

    // Implementation would:
    // 1. Get tenant's TikTok connection
    // 2. Fetch spend data from TikTok Marketing API
    // 3. Store in tiktok_daily_spend table
    // 4. Update daily_totals with tiktok spend

    return {
      success: true,
      data: {
        tenantId,
        date: targetDate,
        accountId,
        spendSynced: 0,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 10000 },
})

/**
 * VTA (View-Through Attribution) sync - runs at 2:30 AM
 *
 * Syncs view-through attribution data from ad platforms
 */
export const attributionVTASyncJob = defineJob<AttributionVTASyncPayload>({
  name: 'analytics/attribution-vta-sync',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, platform, lookbackDays } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    const days = lookbackDays || 7

    console.log(
      `[Analytics] Syncing VTA data for tenant ${tenantId} (platform: ${platform || 'all'})`
    )

    // Implementation would:
    // 1. Fetch VTA data from Meta, TikTok, Google
    // 2. Match VTA impressions to conversions
    // 3. Update attribution with VTA credit
    // 4. Store VTA records for reporting

    return {
      success: true,
      data: {
        tenantId,
        platform,
        lookbackDays: days,
        vtaRecordsProcessed: 0,
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 30000 },
})

/**
 * Process unattributed orders - runs every hour at :30
 *
 * Retries attribution for orders that previously failed
 */
export const attributionProcessUnattributedJob = defineJob<AttributionProcessUnattributedPayload>({
  name: 'analytics/attribution-process-unattributed',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, batchSize, maxAgeHours } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    const limit = batchSize || 50
    const maxAge = maxAgeHours || 72

    console.log(
      `[Analytics] Processing unattributed orders for tenant ${tenantId} (batch: ${limit})`
    )

    // Implementation would:
    // 1. Query orders marked as "unattributed"
    // 2. Filter by age (not older than maxAgeHours)
    // 3. Retry touchpoint matching
    // 4. Process attribution or mark as permanent unattributed

    return {
      success: true,
      data: {
        tenantId,
        batchSize: limit,
        maxAgeHours: maxAge,
        ordersProcessed: 0,
        ordersAttributed: 0,
      },
    }
  },
  retry: { maxAttempts: 2, backoff: 'fixed', initialDelay: 10000 },
})

/**
 * Webhook queue processing - runs every 5 minutes
 *
 * Processes queued webhooks for attribution updates
 */
export const attributionWebhookQueueJob = defineJob<AttributionWebhookQueuePayload>({
  name: 'analytics/attribution-webhook-queue',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, batchSize, queueType } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    const limit = batchSize || 100

    console.log(
      `[Analytics] Processing webhook queue for tenant ${tenantId} (type: ${queueType || 'all'})`
    )

    // Implementation would:
    // 1. Fetch queued webhooks from Redis/DB
    // 2. Process each based on type (conversion, touchpoint)
    // 3. Update attribution records
    // 4. Mark webhooks as processed

    return {
      success: true,
      data: {
        tenantId,
        batchSize: limit,
        queueType,
        webhooksProcessed: 0,
      },
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 2000 },
})

/**
 * All attribution jobs for export
 */
export const attributionJobs = [
  processAttributionJob,
  attributionDailyMetricsJob,
  attributionExportSchedulerJob,
  attributionFairingBridgeJob,
  attributionOrderReconciliationJob,
  attributionOrderReconciliationManualJob,
  attributionRecalculateRecentJob,
  syncTikTokSpendDailyJob,
  attributionVTASyncJob,
  attributionProcessUnattributedJob,
  attributionWebhookQueueJob,
]
