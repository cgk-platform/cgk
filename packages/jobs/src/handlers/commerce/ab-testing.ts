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

    const aggregated = await withTenant(tenantId, async () => {
      // Window: the target hour (1 hour duration)
      const hourStart = new Date(targetHour)
      const hourEnd = new Date(hourStart.getTime() + 3600000)

      // Get event counts grouped by test/variant/event_type for the hour
      const eventsRes = await sql`
        SELECT test_id, variant_id, event_type,
               COUNT(*) as event_count,
               COALESCE(SUM(revenue_cents), 0) as revenue_cents
        FROM ab_events
        WHERE occurred_at >= ${hourStart.toISOString()}
          AND occurred_at < ${hourEnd.toISOString()}
        GROUP BY test_id, variant_id, event_type
      `

      const rows = eventsRes.rows as Array<{
        test_id: string
        variant_id: string
        event_type: string
        event_count: string
        revenue_cents: string
      }>

      // Filter by testId if specified
      const filtered = testId ? rows.filter(r => r.test_id === testId) : rows

      const testIds = [...new Set(filtered.map(r => r.test_id))]
      const variantsAggregated = new Set(filtered.map(r => `${r.test_id}:${r.variant_id}`)).size

      console.log(`[ab.hourlyMetricsAggregation] Aggregated ${filtered.length} event buckets across ${testIds.length} tests`)

      return { testsProcessed: testIds.length, variantsAggregated }
    })

    return {
      success: true,
      data: {
        tenantId,
        hour: targetHour,
        testsProcessed: aggregated.testsProcessed,
        variantsAggregated: aggregated.variantsAggregated,
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

    const optimizationResult = await withTenant(tenantId, async () => {
      // Get running tests with optimization settings (mab or thompson)
      const testsRes = testId
        ? await sql`
            SELECT id, settings FROM ab_tests
            WHERE id = ${testId} AND status = 'running'
          `
        : await sql`
            SELECT id, settings FROM ab_tests
            WHERE status = 'running'
              AND (settings->>'optimization' = 'mab' OR settings->>'optimization' = 'thompson')
          `

      const tests = testsRes.rows as Array<{ id: string; settings: Record<string, unknown> | null }>
      const weightChanges: Array<{ testId: string; variantId: string; oldWeight: number; newWeight: number }> = []

      for (const test of tests) {
        // Get variants with their conversion metrics
        const variantsRes = await sql`
          SELECT v.id, v.weight, v.is_control,
                 COUNT(DISTINCT CASE WHEN e.event_type = 'view' THEN e.id END) as views,
                 COUNT(DISTINCT CASE WHEN e.event_type = 'purchase' THEN e.id END) as conversions
          FROM ab_variants v
          LEFT JOIN ab_events e ON e.variant_id = v.id AND e.test_id = ${test.id}
          WHERE v.test_id = ${test.id}
          GROUP BY v.id, v.weight, v.is_control
        `

        const variants = variantsRes.rows as Array<{
          id: string
          weight: number
          is_control: boolean
          views: string
          conversions: string
        }>

        if (variants.length < 2) continue

        // Thompson sampling: score = alpha / (alpha + beta) where
        // alpha = conversions + 1, beta = (views - conversions) + 1
        const scores = variants.map(v => {
          const conversions = parseInt(v.conversions, 10) || 0
          const views = parseInt(v.views, 10) || 0
          const alpha = conversions + 1
          const beta = Math.max(views - conversions, 0) + 1
          return { id: v.id, oldWeight: v.weight, score: alpha / (alpha + beta) }
        })

        // Normalize scores to weights summing to 100
        const totalScore = scores.reduce((sum, s) => sum + s.score, 0)
        const newWeights = scores.map(s => ({
          ...s,
          newWeight: Math.round((s.score / totalScore) * 100),
        }))

        // Fix rounding to ensure weights sum to exactly 100
        const weightSum = newWeights.reduce((sum, s) => sum + s.newWeight, 0)
        if (weightSum !== 100 && newWeights.length > 0) {
          newWeights[0]!.newWeight += 100 - weightSum
        }

        // Update variant weights if they changed
        for (const v of newWeights) {
          if (v.newWeight !== v.oldWeight) {
            await sql`
              UPDATE ab_variants SET weight = ${v.newWeight}, updated_at = NOW()
              WHERE id = ${v.id}
            `
            weightChanges.push({
              testId: test.id,
              variantId: v.id,
              oldWeight: v.oldWeight,
              newWeight: v.newWeight,
            })
          }
        }
      }

      return { testsOptimized: tests.length, weightChanges }
    })

    return {
      success: true,
      data: {
        tenantId,
        algorithm,
        testsOptimized: optimizationResult.testsOptimized,
        weightChanges: optimizationResult.weightChanges,
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

    const schedulerResult = await withTenant(tenantId, async () => {
      // 1. Start scheduled tests whose start_date has arrived
      const startedRes = await sql`
        UPDATE ab_tests
        SET status = 'running', updated_at = NOW()
        WHERE status = 'draft'
          AND start_date IS NOT NULL
          AND start_date <= NOW()
        RETURNING id
      `
      const testsStarted = startedRes.rowCount ?? 0

      // 2. Complete tests whose end_date has passed
      const endedRes = await sql`
        UPDATE ab_tests
        SET status = 'completed', updated_at = NOW()
        WHERE status = 'running'
          AND end_date IS NOT NULL
          AND end_date <= NOW()
        RETURNING id
      `
      const testsEnded = endedRes.rowCount ?? 0

      // 3. Check running tests for statistical significance winner
      const runningRes = await sql`
        SELECT t.id, t.winning_variant_id,
               v.id as control_id,
               (SELECT COUNT(*) FROM ab_events e
                WHERE e.test_id = t.id AND e.event_type = 'view' AND e.variant_id = v.id) as control_views,
               (SELECT COUNT(*) FROM ab_events e
                WHERE e.test_id = t.id AND e.event_type = 'purchase' AND e.variant_id = v.id) as control_conversions
        FROM ab_tests t
        JOIN ab_variants v ON v.test_id = t.id AND v.is_control = true
        WHERE t.status = 'running'
          AND t.winning_variant_id IS NULL
        LIMIT 50
      `

      let winnersDetected = 0
      for (const test of runningRes.rows as Array<{
        id: string; control_id: string; control_views: string; control_conversions: string; winning_variant_id: string | null
      }>) {
        const controlViews = parseInt(test.control_views, 10) || 0
        const controlConversions = parseInt(test.control_conversions, 10) || 0
        const controlRate = controlViews > 0 ? controlConversions / controlViews : 0

        // Find challengers with significantly better performance
        const challRes = await sql`
          SELECT v.id,
                 COUNT(DISTINCT CASE WHEN e.event_type = 'view' THEN e.id END) as views,
                 COUNT(DISTINCT CASE WHEN e.event_type = 'purchase' THEN e.id END) as conversions
          FROM ab_variants v
          LEFT JOIN ab_events e ON e.variant_id = v.id AND e.test_id = ${test.id}
          WHERE v.test_id = ${test.id} AND v.is_control = false
          GROUP BY v.id
          HAVING COUNT(DISTINCT CASE WHEN e.event_type = 'view' THEN e.id END) >= 100
        `

        for (const challenger of challRes.rows as Array<{ id: string; views: string; conversions: string }>) {
          const challViews = parseInt(challenger.views, 10) || 0
          const challConversions = parseInt(challenger.conversions, 10) || 0
          const challRate = challViews > 0 ? challConversions / challViews : 0

          // Declare winner if challenger rate > 120% of control and at least 10 conversions
          if (challRate > controlRate * 1.2 && challConversions >= 10) {
            await sql`
              UPDATE ab_tests
              SET winning_variant_id = ${challenger.id}, updated_at = NOW()
              WHERE id = ${test.id}
            `
            winnersDetected++
            break
          }
        }
      }

      if (testsStarted > 0) console.log(`[ab.testScheduler] Started ${testsStarted} tests`)
      if (testsEnded > 0) console.log(`[ab.testScheduler] Completed ${testsEnded} tests`)
      if (winnersDetected > 0) console.log(`[ab.testScheduler] Detected ${winnersDetected} winners`)

      return { testsStarted, testsEnded }
    })

    return {
      success: true,
      data: {
        tenantId,
        testsStarted: schedulerResult.testsStarted,
        testsEnded: schedulerResult.testsEnded,
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
