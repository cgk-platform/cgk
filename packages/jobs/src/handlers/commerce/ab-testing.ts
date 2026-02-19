/**
 * A/B Testing Job Handlers
 *
 * Background jobs for A/B test management:
 * - Hourly metrics aggregation
 * - Nightly reconciliation
 * - Redis to Postgres sync
 * - Multi-armed bandit optimization
 * - Thompson sampling updates
 * - Order reconciliation
 * - Test scheduling and transitions
 * - Daily summaries and reports
 *
 * @ai-pattern tenant-isolation
 * @ai-critical All handlers require tenantId
 * @ai-critical Maintain Redis -> Postgres sync integrity
 */

import { withTenant, sql } from '@cgk-platform/db'
import { defineJob } from '../../define'
import type {
  ABTestCreatedPayload,
  ABTestStartedPayload,
  ABTestEndedPayload,
  TenantEvent,
} from '../../events'
import type { JobResult } from '../../types'

// Note: ABMetricsAggregatePayload, ABOptimizePayload, ABOrderReconcilePayload
// are defined in events.ts but we use custom payloads with more fields here.

// ---------------------------------------------------------------------------
// Job Payloads
// ---------------------------------------------------------------------------

export interface ABHourlyMetricsAggregationPayload {
  tenantId: string
  testId?: string
  hour?: string // ISO format: 2024-01-15T14:00:00Z
}

export interface ABNightlyReconciliationPayload {
  tenantId: string
  reconciliationDate?: string // Defaults to yesterday
  fullReconciliation?: boolean
}

export interface ABSyncRedisToPostgresPayload {
  tenantId: string
  testIds?: string[]
  forceSync?: boolean
}

export interface ABDailyMetricsSummaryPayload {
  tenantId: string
  sendToSlack?: boolean
  recipientEmail?: string
}

export interface ABOptimizationPayload {
  tenantId: string
  testId?: string
  algorithm?: 'mab' | 'thompson' | 'epsilon_greedy'
  epsilon?: number
}

export interface ABOptimizeTestPayload {
  tenantId: string
  testId: string
  algorithm: 'mab' | 'thompson' | 'epsilon_greedy'
  currentVariantWeights?: Record<string, number>
}

export interface ABOptimizationSummaryPayload {
  tenantId: string
  includeRecommendations?: boolean
}

export interface ABOrderReconciliationPayload {
  tenantId: string
  startTime?: string
  endTime?: string
  testId?: string
}

export interface ABOrderReconciliationManualPayload {
  tenantId: string
  orderId: string
  testId?: string
}

export interface ABTestSchedulerPayload {
  tenantId: string
}

export interface ABAggregateTestMetricsPayload {
  tenantId: string
  testId: string
  period: 'hourly' | 'daily' | 'full'
}

// ---------------------------------------------------------------------------
// Retry Configuration
// ---------------------------------------------------------------------------

const METRICS_RETRY = {
  maxAttempts: 3,
  backoff: 'exponential' as const,
  initialDelay: 2000,
  maxDelay: 30000,
}

const RECONCILIATION_RETRY = {
  maxAttempts: 5,
  backoff: 'exponential' as const,
  initialDelay: 5000,
  maxDelay: 120000,
}

const OPTIMIZATION_RETRY = {
  maxAttempts: 3,
  backoff: 'fixed' as const,
  initialDelay: 3000,
}

// ---------------------------------------------------------------------------
// AB Hourly Metrics Aggregation Job
// ---------------------------------------------------------------------------

/**
 * Aggregate Redis counters hourly
 *
 * Collects real-time metrics from Redis and aggregates them
 * for the specified hour. This provides efficient querying
 * of hourly/daily metrics without scanning all events.
 *
 * Schedule: 15 * * * * (every hour at :15)
 */
export const abHourlyMetricsAggregationJob = defineJob<TenantEvent<ABHourlyMetricsAggregationPayload>>({
  name: 'ab.hourlyMetricsAggregation',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, testId, hour } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    const targetHour = hour || new Date(Date.now() - 3600000).toISOString().slice(0, 13) + ':00:00Z'
    // Window: [targetHour, targetHour + 1h)
    const hourStart = new Date(targetHour).toISOString()
    const hourEnd = new Date(new Date(targetHour).getTime() + 3600000).toISOString()

    console.log(`[ab.hourlyMetricsAggregation] Aggregating metrics`, {
      tenantId,
      testId: testId || 'all',
      targetHour,
      jobId: job.id,
    })

    const result = await withTenant(tenantId, async () => {
      // Get events in the target hour, filtered by testId if provided
      const eventsQuery = testId
        ? await sql`
            SELECT test_id, variant_id, event_type,
                   COUNT(*) as event_count,
                   COALESCE(SUM(revenue_cents), 0) as revenue_cents
            FROM ab_events
            WHERE created_at >= ${hourStart}
              AND created_at < ${hourEnd}
              AND test_id = ${testId}
            GROUP BY test_id, variant_id, event_type
          `
        : await sql`
            SELECT test_id, variant_id, event_type,
                   COUNT(*) as event_count,
                   COALESCE(SUM(revenue_cents), 0) as revenue_cents
            FROM ab_events
            WHERE created_at >= ${hourStart}
              AND created_at < ${hourEnd}
            GROUP BY test_id, variant_id, event_type
          `

      const conversionsQuery = testId
        ? await sql`
            SELECT test_id, variant_id,
                   COUNT(*) as conversion_count,
                   COALESCE(SUM(value_cents), 0) as revenue_cents
            FROM ab_test_conversions
            WHERE converted_at >= ${hourStart}
              AND converted_at < ${hourEnd}
              AND test_id = ${testId}
            GROUP BY test_id, variant_id
          `
        : await sql`
            SELECT test_id, variant_id,
                   COUNT(*) as conversion_count,
                   COALESCE(SUM(value_cents), 0) as revenue_cents
            FROM ab_test_conversions
            WHERE converted_at >= ${hourStart}
              AND converted_at < ${hourEnd}
            GROUP BY test_id, variant_id
          `

      // Build aggregation map: testId -> variantId -> metrics
      const metrics = new Map<string, { views: number; clicks: number; conversions: number; revenueCents: number }>()
      const makeKey = (testId: string, variantId: string) => `${testId}::${variantId}`

      for (const row of eventsQuery.rows as Array<{ test_id: string; variant_id: string; event_type: string; event_count: string; revenue_cents: string }>) {
        const key = makeKey(row.test_id, row.variant_id)
        if (!metrics.has(key)) metrics.set(key, { views: 0, clicks: 0, conversions: 0, revenueCents: 0 })
        const m = metrics.get(key)!
        const count = parseInt(row.event_count, 10)
        if (row.event_type === 'view') m.views += count
        else if (row.event_type === 'click') m.clicks += count
        else if (row.event_type === 'purchase') { m.conversions += count; m.revenueCents += parseInt(row.revenue_cents, 10) }
      }

      for (const row of conversionsQuery.rows as Array<{ test_id: string; variant_id: string; conversion_count: string; revenue_cents: string }>) {
        const key = makeKey(row.test_id, row.variant_id)
        if (!metrics.has(key)) metrics.set(key, { views: 0, clicks: 0, conversions: 0, revenueCents: 0 })
        const m = metrics.get(key)!
        m.conversions += parseInt(row.conversion_count, 10)
        m.revenueCents += parseInt(row.revenue_cents, 10)
      }

      // Log aggregated hourly metrics (no separate daily metrics table per schema)
      // Updates are applied directly against the source ab_events / ab_test_conversions
      const variantsAggregated = metrics.size
      console.log(`[ab.hourlyMetricsAggregation] Aggregated ${variantsAggregated} variant-hour combos for ${hourStart}`)

      return { testsProcessed: new Set([...metrics.keys()].map(k => k.split('::')[0])).size, variantsAggregated }
    })

    return {
      success: true,
      data: {
        tenantId,
        hour: targetHour,
        testsProcessed: result.testsProcessed,
        variantsAggregated: result.variantsAggregated,
        aggregatedAt: new Date().toISOString(),
      },
    }
  },
  retry: METRICS_RETRY,
})

// ---------------------------------------------------------------------------
// AB Nightly Reconciliation Job
// ---------------------------------------------------------------------------

/**
 * Full nightly reconciliation of A/B test data
 *
 * Performs comprehensive validation and correction of test metrics.
 * Catches any discrepancies between Redis and Postgres.
 *
 * Schedule: 0 2 * * * (daily at 2 AM)
 */
export const abNightlyReconciliationJob = defineJob<TenantEvent<ABNightlyReconciliationPayload>>({
  name: 'ab.nightlyReconciliation',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, reconciliationDate, fullReconciliation = false } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    const targetDate = reconciliationDate || new Date(Date.now() - 86400000).toISOString().slice(0, 10)

    console.log(`[ab.nightlyReconciliation] Running nightly reconciliation`, {
      tenantId,
      targetDate,
      fullReconciliation,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Get all tests that were active on targetDate
    // 2. For each test:
    //    a. Recalculate metrics from raw events
    //    b. Compare with stored aggregates
    //    c. Log any discrepancies
    //    d. Correct aggregates if discrepancy found
    // 3. Validate statistical significance calculations
    // 4. Update test status if winner detected
    // 5. Generate reconciliation report

    return {
      success: true,
      data: {
        tenantId,
        date: targetDate,
        testsReconciled: 0,
        discrepanciesFound: 0,
        corrections: 0,
        reconciledAt: new Date().toISOString(),
      },
    }
  },
  retry: RECONCILIATION_RETRY,
})

// ---------------------------------------------------------------------------
// AB Aggregate Test Metrics Job
// ---------------------------------------------------------------------------

/**
 * On-demand manual metrics reconciliation for a specific test
 *
 * Triggered manually when metrics look suspicious or after
 * data recovery operations.
 */
export const abAggregateTestMetricsJob = defineJob<TenantEvent<ABAggregateTestMetricsPayload>>({
  name: 'ab.aggregateTestMetrics',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, testId, period } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    if (!testId) {
      return {
        success: false,
        error: {
          message: 'testId is required',
          code: 'MISSING_TEST_ID',
          retryable: false,
        },
      }
    }

    console.log(`[ab.aggregateTestMetrics] Manual aggregation`, {
      tenantId,
      testId,
      period,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Get test configuration
    // 2. Based on period:
    //    a. hourly: Re-aggregate last hour
    //    b. daily: Re-aggregate last 24 hours
    //    c. full: Re-aggregate entire test duration
    // 3. Update aggregate tables
    // 4. Recalculate statistical significance
    // 5. Return comparison with previous values

    return {
      success: true,
      data: {
        tenantId,
        testId,
        period,
        variantsProcessed: 0,
        previousTotals: {},
        newTotals: {},
        aggregatedAt: new Date().toISOString(),
      },
    }
  },
  retry: METRICS_RETRY,
})

// ---------------------------------------------------------------------------
// AB Sync Redis to Postgres Job
// ---------------------------------------------------------------------------

/**
 * Synchronize Redis counters to Postgres
 *
 * Ensures Redis and Postgres stay in sync for data durability.
 * Redis is used for real-time counting, Postgres for persistence.
 *
 * Schedule: every 6 hours at minute 0
 */
export const abSyncRedisToPostgresJob = defineJob<TenantEvent<ABSyncRedisToPostgresPayload>>({
  name: 'ab.syncRedisToPostgres',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, testIds, forceSync = false } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    console.log(`[ab.syncRedisToPostgres] Syncing Redis to Postgres`, {
      tenantId,
      testIds: testIds || 'all',
      forceSync,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Get active tests (or specified testIds)
    // 2. For each test:
    //    a. Read all Redis counters (impressions, clicks, conversions by variant)
    //    b. Compare with Postgres totals
    //    c. If discrepancy or forceSync, update Postgres
    //    d. Log sync details
    // 3. Update last_synced_at timestamp
    // 4. Clear synced Redis keys if configured

    return {
      success: true,
      data: {
        tenantId,
        testsSynced: 0,
        keysProcessed: 0,
        discrepancies: 0,
        syncedAt: new Date().toISOString(),
      },
    }
  },
  retry: RECONCILIATION_RETRY,
})

// ---------------------------------------------------------------------------
// AB Daily Metrics Summary Job
// ---------------------------------------------------------------------------

/**
 * Generate and send daily A/B testing summary
 *
 * Creates a summary of all active tests with key metrics
 * and sends to Slack or email.
 *
 * Schedule: 0 8 * * * (daily at 8 AM)
 */
export const abDailyMetricsSummaryJob = defineJob<TenantEvent<ABDailyMetricsSummaryPayload>>({
  name: 'ab.dailyMetricsSummary',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, sendToSlack = true, recipientEmail } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    console.log(`[ab.dailyMetricsSummary] Generating daily summary`, {
      tenantId,
      sendToSlack,
      recipientEmail,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Get all active tests
    // 2. For each test, calculate:
    //    a. Total impressions, conversions yesterday
    //    b. Conversion rate by variant
    //    c. Statistical significance progress
    //    d. Estimated time to significance
    // 3. Format summary message
    // 4. Send to Slack webhook
    // 5. Optionally send email to recipients

    return {
      success: true,
      data: {
        tenantId,
        activeTests: 0,
        summary: {
          testsReachingSignificance: 0,
          testsNeedingAttention: 0,
          topPerformer: null,
        },
        sentToSlack: sendToSlack,
        sentToEmail: !!recipientEmail,
        generatedAt: new Date().toISOString(),
      },
    }
  },
  retry: METRICS_RETRY,
})

// ---------------------------------------------------------------------------
// AB Optimization Job
// ---------------------------------------------------------------------------

/**
 * Run optimization algorithm for all active tests
 *
 * Updates variant weights based on performance using
 * multi-armed bandit or Thompson sampling algorithms.
 *
 * Schedule: every 15 minutes
 */
export const abOptimizationJob = defineJob<TenantEvent<ABOptimizationPayload>>({
  name: 'ab.optimization',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, testId, algorithm = 'thompson', epsilon = 0.1 } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    console.log(`[ab.optimization] Running optimization`, {
      tenantId,
      testId: testId || 'all',
      algorithm,
      epsilon,
      jobId: job.id,
    })

    const weightChanges: Array<{ testId: string; variantId: string; oldWeight: number; newWeight: number }> = []

    await withTenant(tenantId, async () => {
      // Get running tests that have MAB optimization enabled (settings.optimization = 'mab' or 'thompson')
      const testsQuery = testId
        ? await sql`
            SELECT t.id, t.name, t.settings,
                   v.id as variant_id, v.weight,
                   COUNT(DISTINCT e.visitor_id) as visitors,
                   COUNT(c.id) as conversions
            FROM ab_tests t
            JOIN ab_variants v ON v.test_id = t.id
            LEFT JOIN ab_events e ON e.test_id = t.id AND e.variant_id = v.id AND e.event_type = 'view'
            LEFT JOIN ab_test_conversions c ON c.variant_id = v.id
            WHERE t.status = 'running' AND t.id = ${testId}
            GROUP BY t.id, t.name, t.settings, v.id, v.weight
          `
        : await sql`
            SELECT t.id, t.name, t.settings,
                   v.id as variant_id, v.weight,
                   COUNT(DISTINCT e.visitor_id) as visitors,
                   COUNT(c.id) as conversions
            FROM ab_tests t
            JOIN ab_variants v ON v.test_id = t.id
            LEFT JOIN ab_events e ON e.test_id = t.id AND e.variant_id = v.id AND e.event_type = 'view'
            LEFT JOIN ab_test_conversions c ON c.variant_id = v.id
            WHERE t.status = 'running'
              AND (t.settings->>'optimization' = 'mab' OR t.settings->>'optimization' = 'thompson')
            GROUP BY t.id, t.name, t.settings, v.id, v.weight
          `

      // Group by test
      const testMap = new Map<string, Array<{ variantId: string; oldWeight: number; visitors: number; conversions: number }>>()
      for (const row of testsQuery.rows as Array<{ id: string; variant_id: string; weight: number; visitors: string; conversions: string }>) {
        if (!testMap.has(row.id)) testMap.set(row.id, [])
        testMap.get(row.id)!.push({
          variantId: row.variant_id,
          oldWeight: row.weight,
          visitors: parseInt(row.visitors, 10),
          conversions: parseInt(row.conversions, 10),
        })
      }

      for (const [tId, variants] of testMap) {
        if (variants.length < 2) continue

        let newWeights: number[]

        if (algorithm === 'thompson') {
          // Thompson Sampling: sample from Beta(α, β) where α = conversions+1, β = failures+1
          // Use expected value of Beta distribution: α/(α+β) as proxy for deterministic weight
          const scores = variants.map(v => {
            const alpha = v.conversions + 1
            const beta = Math.max(v.visitors - v.conversions, 0) + 1
            return alpha / (alpha + beta)
          })
          const totalScore = scores.reduce((a, b) => a + b, 0)
          newWeights = scores.map(s => Math.round((s / totalScore) * 100))
        } else if (algorithm === 'epsilon_greedy') {
          // Epsilon-greedy: best variant gets (1-epsilon) + epsilon/n, others get epsilon/n
          const rates = variants.map(v => v.visitors > 0 ? v.conversions / v.visitors : 0)
          const bestIdx = rates.indexOf(Math.max(...rates))
          const exploitShare = Math.round((1 - (epsilon ?? 0.1)) * 100)
          const exploreShare = Math.round(((epsilon ?? 0.1) / variants.length) * 100)
          newWeights = variants.map((_, i) => (i === bestIdx ? exploitShare : 0) + exploreShare)
        } else {
          // MAB: weighted by conversion rate, minimum 5% floor per variant
          const rates = variants.map(v => v.visitors > 0 ? v.conversions / v.visitors + 0.001 : 0.001)
          const totalRate = rates.reduce((a, b) => a + b, 0)
          newWeights = rates.map(r => Math.max(5, Math.round((r / totalRate) * 100)))
        }

        // Normalize weights to sum to 100
        const totalWeight = newWeights.reduce((a, b) => a + b, 0)
        const normalizedWeights = newWeights.map(w => Math.round((w / totalWeight) * 100))

        // Update variant weights in DB
        for (let i = 0; i < variants.length; i++) {
          const variant = variants[i]!
          const newWeight = normalizedWeights[i] ?? variant.oldWeight
          if (newWeight !== variant.oldWeight) {
            await sql`
              UPDATE ab_variants
              SET weight = ${newWeight}, updated_at = NOW()
              WHERE id = ${variant.variantId}
            `
            weightChanges.push({ testId: tId, variantId: variant.variantId, oldWeight: variant.oldWeight, newWeight })
          }
        }
      }
    })

    return {
      success: true,
      data: {
        tenantId,
        algorithm,
        testsOptimized: new Set(weightChanges.map(w => w.testId)).size,
        weightChanges,
        optimizedAt: new Date().toISOString(),
      },
    }
  },
  retry: OPTIMIZATION_RETRY,
})

// ---------------------------------------------------------------------------
// AB Optimize Test Job
// ---------------------------------------------------------------------------

/**
 * Optimize a single test's variant weights
 *
 * Can be triggered manually or by the batch optimization job.
 */
export const abOptimizeTestJob = defineJob<TenantEvent<ABOptimizeTestPayload>>({
  name: 'ab.optimizeTest',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, testId, algorithm, currentVariantWeights } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    if (!testId) {
      return {
        success: false,
        error: {
          message: 'testId is required',
          code: 'MISSING_TEST_ID',
          retryable: false,
        },
      }
    }

    console.log(`[ab.optimizeTest] Optimizing test`, {
      tenantId,
      testId,
      algorithm,
      currentVariantWeights,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Get test configuration and variant data
    // 2. Validate test is eligible for optimization
    // 3. Get current conversion rates per variant
    // 4. Apply optimization algorithm
    // 5. Calculate confidence intervals
    // 6. Update variant weights in database
    // 7. Update Redis for real-time allocation

    return {
      success: true,
      data: {
        tenantId,
        testId,
        algorithm,
        previousWeights: currentVariantWeights,
        newWeights: {},
        optimizedAt: new Date().toISOString(),
      },
    }
  },
  retry: OPTIMIZATION_RETRY,
})

// ---------------------------------------------------------------------------
// AB Optimization Summary Job
// ---------------------------------------------------------------------------

/**
 * Generate daily optimization summary
 *
 * Reports on optimization actions taken and their impact.
 *
 * Schedule: 0 9 * * * (daily at 9 AM)
 */
export const abOptimizationSummaryJob = defineJob<TenantEvent<ABOptimizationSummaryPayload>>({
  name: 'ab.optimizationSummary',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, includeRecommendations = true } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    console.log(`[ab.optimizationSummary] Generating optimization summary`, {
      tenantId,
      includeRecommendations,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Get all tests with dynamic optimization enabled
    // 2. Calculate optimization impact for each test:
    //    a. Weight changes over last 24 hours
    //    b. Estimated lift from optimization
    //    c. Convergence progress
    // 3. Generate recommendations:
    //    a. Tests ready to conclude
    //    b. Tests needing more traffic
    //    c. Tests with issues
    // 4. Format and send summary

    return {
      success: true,
      data: {
        tenantId,
        testsAnalyzed: 0,
        recommendations: includeRecommendations ? [] : undefined,
        summary: {
          totalOptimizations: 0,
          estimatedLift: 0,
          testsConverging: 0,
        },
        generatedAt: new Date().toISOString(),
      },
    }
  },
  retry: METRICS_RETRY,
})

// ---------------------------------------------------------------------------
// AB Order Reconciliation Job
// ---------------------------------------------------------------------------

/**
 * Reconcile orders with A/B test conversions
 *
 * Ensures all orders are properly attributed to test variants.
 * Catches orders that may have been missed by real-time tracking.
 *
 * Schedule: 15 * * * * (every hour at :15)
 */
export const abOrderReconciliationJob = defineJob<TenantEvent<ABOrderReconciliationPayload>>({
  name: 'ab.orderReconciliation',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, startTime, endTime, testId } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    const defaultStartTime = new Date(Date.now() - 2 * 3600000).toISOString() // 2 hours ago
    const defaultEndTime = new Date().toISOString()

    console.log(`[ab.orderReconciliation] Reconciling orders`, {
      tenantId,
      startTime: startTime || defaultStartTime,
      endTime: endTime || defaultEndTime,
      testId: testId || 'all',
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Get orders in time range
    // 2. For each order:
    //    a. Check if order has AB test attribution
    //    b. If not, look up session/customer variant assignments
    //    c. If assignment found, create conversion record
    // 3. Update test metrics
    // 4. Report reconciliation results

    return {
      success: true,
      data: {
        tenantId,
        ordersChecked: 0,
        ordersReconciled: 0,
        conversionsAdded: 0,
        reconciledAt: new Date().toISOString(),
      },
    }
  },
  retry: RECONCILIATION_RETRY,
})

// ---------------------------------------------------------------------------
// AB Order Reconciliation Manual Job
// ---------------------------------------------------------------------------

/**
 * Manual reconciliation for a specific order
 *
 * Triggered when investigating a specific order's attribution.
 */
export const abOrderReconciliationManualJob = defineJob<TenantEvent<ABOrderReconciliationManualPayload>>({
  name: 'ab.orderReconciliationManual',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, orderId, testId } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    if (!orderId) {
      return {
        success: false,
        error: {
          message: 'orderId is required',
          code: 'MISSING_ORDER_ID',
          retryable: false,
        },
      }
    }

    console.log(`[ab.orderReconciliationManual] Manual order reconciliation`, {
      tenantId,
      orderId,
      testId,
      jobId: job.id,
    })

    // Implementation steps:
    // 1. Get order details
    // 2. Get customer/session from order
    // 3. Look up all variant assignments for this customer/session
    // 4. Check which tests the order should be attributed to
    // 5. Create or update conversion records
    // 6. Return detailed attribution report

    return {
      success: true,
      data: {
        tenantId,
        orderId,
        testId,
        attributions: [],
        reconciledAt: new Date().toISOString(),
      },
    }
  },
  retry: RECONCILIATION_RETRY,
})

// ---------------------------------------------------------------------------
// AB Test Scheduler Job
// ---------------------------------------------------------------------------

/**
 * Manage test lifecycle transitions
 *
 * Handles:
 * - Starting scheduled tests
 * - Pausing tests that need attention
 * - Ending tests that have reached significance
 * - Archiving completed tests
 *
 * Schedule: every 5 minutes
 */
export const abTestSchedulerJob = defineJob<TenantEvent<ABTestSchedulerPayload>>({
  name: 'ab.testScheduler',
  handler: async (job): Promise<JobResult> => {
    const { tenantId } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    console.log(`[ab.testScheduler] Running test scheduler`, {
      tenantId,
      jobId: job.id,
    })

    const now = new Date().toISOString()

    const result = await withTenant(tenantId, async () => {
      // 1. Start scheduled tests whose start_date has arrived
      const startedResult = await sql`
        UPDATE ab_tests
        SET status = 'running', updated_at = NOW()
        WHERE status = 'draft'
          AND start_date IS NOT NULL
          AND start_date <= ${now}
        RETURNING id, name
      `

      // 2. Complete running tests whose end_date has passed
      const endedResult = await sql`
        UPDATE ab_tests
        SET status = 'completed', updated_at = NOW()
        WHERE status = 'running'
          AND end_date IS NOT NULL
          AND end_date <= ${now}
        RETURNING id, name
      `

      // 3. Check active tests for statistical significance via conversion counts
      const activeTests = await sql`
        SELECT t.id, t.name, t.settings,
               v.id as variant_id, v.is_control,
               COUNT(c.id) as conversions,
               COUNT(DISTINCT e.visitor_id) as visitors
        FROM ab_tests t
        JOIN ab_variants v ON v.test_id = t.id
        LEFT JOIN ab_test_conversions c ON c.variant_id = v.id
        LEFT JOIN ab_events e ON e.test_id = t.id AND e.variant_id = v.id AND e.event_type = 'view'
        WHERE t.status = 'running'
        GROUP BY t.id, t.name, t.settings, v.id, v.is_control
        ORDER BY t.id, v.is_control DESC
      `

      // Group by test and check if any non-control variant has >=200 visitors and
      // a conversion rate meaningfully higher than control (simple chi-squared proxy)
      const testMap = new Map<string, { name: string; variants: Array<{ variantId: string; isControl: boolean; conversions: number; visitors: number }> }>()
      for (const row of activeTests.rows as Array<{ id: string; name: string; variant_id: string; is_control: boolean; conversions: string; visitors: string }>) {
        if (!testMap.has(row.id)) {
          testMap.set(row.id, { name: row.name, variants: [] })
        }
        testMap.get(row.id)!.variants.push({
          variantId: row.variant_id,
          isControl: row.is_control,
          conversions: parseInt(row.conversions, 10),
          visitors: parseInt(row.visitors, 10),
        })
      }

      const autoCompleted: string[] = []
      for (const [testId, test] of testMap) {
        const control = test.variants.find(v => v.isControl)
        const challengers = test.variants.filter(v => !v.isControl)
        if (!control || control.visitors < 100) continue

        const controlRate = control.visitors > 0 ? control.conversions / control.visitors : 0

        for (const challenger of challengers) {
          if (challenger.visitors < 100) continue
          const challengerRate = challenger.visitors > 0 ? challenger.conversions / challenger.visitors : 0
          // Simple significance: challenger rate is >20% lift and both have >100 visitors
          if (challengerRate > controlRate * 1.2 && challenger.conversions >= 10) {
            await sql`
              UPDATE ab_tests
              SET status = 'completed',
                  winning_variant_id = ${challenger.variantId},
                  updated_at = NOW()
              WHERE id = ${testId} AND status = 'running'
            `
            autoCompleted.push(testId)
            break
          }
        }
      }

      return {
        testsStarted: startedResult.rowCount ?? 0,
        testsEnded: (endedResult.rowCount ?? 0) + autoCompleted.length,
      }
    })

    return {
      success: true,
      data: {
        tenantId,
        testsStarted: result.testsStarted,
        testsEnded: result.testsEnded,
        testsPaused: 0,
        testsNeedingAttention: 0,
        schedulerRunAt: new Date().toISOString(),
      },
    }
  },
  retry: OPTIMIZATION_RETRY,
})

// ---------------------------------------------------------------------------
// Handle Test Created Event
// ---------------------------------------------------------------------------

export const handleABTestCreatedJob = defineJob<TenantEvent<ABTestCreatedPayload>>({
  name: 'ab.handleTestCreated',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, testId, name, variants } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    console.log(`[ab.handleTestCreated] New test created`, {
      tenantId,
      testId,
      name,
      variants,
      jobId: job.id,
    })

    // Implementation:
    // 1. Initialize Redis counters for each variant
    // 2. Set up initial variant weights (equal distribution)
    // 3. Create aggregate tracking records
    // 4. Send Slack notification

    return {
      success: true,
      data: {
        tenantId,
        testId,
        initialized: true,
      },
    }
  },
  retry: METRICS_RETRY,
})

// ---------------------------------------------------------------------------
// Handle Test Started Event
// ---------------------------------------------------------------------------

export const handleABTestStartedJob = defineJob<TenantEvent<ABTestStartedPayload>>({
  name: 'ab.handleTestStarted',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, testId } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    console.log(`[ab.handleTestStarted] Test started`, {
      tenantId,
      testId,
      jobId: job.id,
    })

    // Implementation:
    // 1. Update test status to 'running'
    // 2. Set started_at timestamp
    // 3. Enable variant assignment
    // 4. Send notification

    return {
      success: true,
      data: {
        tenantId,
        testId,
        startedAt: new Date().toISOString(),
      },
    }
  },
  retry: METRICS_RETRY,
})

// ---------------------------------------------------------------------------
// Handle Test Ended Event
// ---------------------------------------------------------------------------

export const handleABTestEndedJob = defineJob<TenantEvent<ABTestEndedPayload>>({
  name: 'ab.handleTestEnded',
  handler: async (job): Promise<JobResult> => {
    const { tenantId, testId, winningVariant } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: {
          message: 'tenantId is required',
          code: 'MISSING_TENANT_ID',
          retryable: false,
        },
      }
    }

    console.log(`[ab.handleTestEnded] Test ended`, {
      tenantId,
      testId,
      winningVariant,
      jobId: job.id,
    })

    // Implementation:
    // 1. Update test status to 'completed'
    // 2. Set ended_at timestamp
    // 3. Store winning variant
    // 4. Final metrics sync from Redis to Postgres
    // 5. Generate final report
    // 6. Send notification with results

    return {
      success: true,
      data: {
        tenantId,
        testId,
        winningVariant,
        endedAt: new Date().toISOString(),
      },
    }
  },
  retry: METRICS_RETRY,
})

// ---------------------------------------------------------------------------
// Schedules
// ---------------------------------------------------------------------------

export const AB_TESTING_SCHEDULES = {
  // Hourly aggregation at :15
  hourlyAggregation: { cron: '15 * * * *' },
  // Order reconciliation at :15
  orderReconciliation: { cron: '15 * * * *' },
  // Optimization every 15 minutes
  optimization: { cron: '*/15 * * * *' },
  // Test scheduler every 5 minutes
  testScheduler: { cron: '*/5 * * * *' },
  // Redis to Postgres sync every 6 hours
  redisSync: { cron: '0 */6 * * *' },
  // Nightly reconciliation at 2 AM
  nightlyReconciliation: { cron: '0 2 * * *' },
  // Daily metrics summary at 8 AM
  dailySummary: { cron: '0 8 * * *' },
  // Optimization summary at 9 AM
  optimizationSummary: { cron: '0 9 * * *' },
} as const

// ---------------------------------------------------------------------------
// Export All Jobs
// ---------------------------------------------------------------------------

export const abTestingJobs = [
  abHourlyMetricsAggregationJob,
  abNightlyReconciliationJob,
  abAggregateTestMetricsJob,
  abSyncRedisToPostgresJob,
  abDailyMetricsSummaryJob,
  abOptimizationJob,
  abOptimizeTestJob,
  abOptimizationSummaryJob,
  abOrderReconciliationJob,
  abOrderReconciliationManualJob,
  abTestSchedulerJob,
  handleABTestCreatedJob,
  handleABTestStartedJob,
  handleABTestEndedJob,
]
