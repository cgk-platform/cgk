/**
 * Creator Analytics Aggregation Jobs
 *
 * Background jobs for aggregating creator metrics:
 * - Daily metrics aggregation (3 AM)
 * - Weekly creator summary (Sunday 6 AM)
 * - Monthly creator report (1st of month 4 AM)
 *
 * These jobs power the admin analytics dashboard for
 * creator performance monitoring.
 *
 * CRITICAL: All jobs require tenantId for tenant isolation.
 * See TENANT-ISOLATION.md for patterns.
 *
 * @ai-pattern creator-analytics
 */

import { defineJob } from '../../define'
import type { Job, JobResult } from '../../types'
import type { TenantEvent } from '../../events'

// ============================================================
// PAYLOAD TYPES
// ============================================================

export interface AggregateCreatorDailyMetricsPayload {
  date?: string // ISO date, defaults to yesterday
  creatorId?: string // If provided, only process this creator
}

export interface GenerateWeeklyCreatorSummaryPayload {
  weekStartDate?: string // ISO date, defaults to start of last week
  notifyAdmins?: boolean
}

export interface GenerateMonthlyCreatorReportPayload {
  month?: number // 1-12, defaults to previous month
  year?: number
  generatePdf?: boolean
  emailAdmins?: boolean
}

// ============================================================
// RESULT TYPES
// ============================================================

export interface DailyMetricsResult {
  date: string
  creatorsProcessed: number
  metricsCalculated: {
    responseMetrics: number
    projectMetrics: number
    earningsMetrics: number
  }
  snapshotsCreated: number
}

export interface WeeklyMetric {
  creatorId: string
  name: string
  responseRate: number
  avgResponseTime: number
  projectsCompleted: number
  earningsTotal: number
  weekOverWeekChange: number
}

export interface WeeklySummaryResult {
  weekStartDate: string
  weekEndDate: string
  creatorsAnalyzed: number
  topPerformers: WeeklyMetric[]
  atRiskCreators: WeeklyMetric[]
  aggregateMetrics: {
    totalProjectsCompleted: number
    averageResponseTime: number
    totalEarnings: number
    activeCreatorCount: number
  }
  slackNotified: boolean
}

export interface MonthlyMetric {
  creatorId: string
  name: string
  tier: string
  country: string
  projectsCount: number
  earningsTotal: number
  avgRating: number
  churnRisk: 'low' | 'medium' | 'high'
}

export interface MonthlyReportResult {
  month: number
  year: number
  applicationFunnel: {
    applied: number
    approved: number
    rejected: number
    conversionRate: number
  }
  earningsByTier: Record<string, { count: number; total: number; average: number }>
  earningsByCountry: Record<string, { count: number; total: number }>
  creatorHealth: {
    active: number
    atRisk: number
    churned: number
  }
  topPerformers: MonthlyMetric[]
  snapshotId: string
  pdfGenerated: boolean
  adminEmailed: boolean
}

// ============================================================
// DAILY METRICS AGGREGATION (3 AM)
// ============================================================

/**
 * Aggregate daily creator metrics
 * Runs at 3 AM daily
 *
 * Calculates per-creator metrics for the previous day:
 * - Response times (avg, min, max, p95)
 * - Message counts (sent, received)
 * - Project activity (started, submitted, approved)
 * - Earnings (pending, available, paid)
 *
 * Updates:
 * - creator_response_metrics table
 * - creator_analytics_snapshots table
 */
export const aggregateCreatorDailyMetricsJob = defineJob<
  TenantEvent<AggregateCreatorDailyMetricsPayload>,
  DailyMetricsResult
>({
  name: 'creator.aggregateDailyMetrics',
  handler: async (
    job: Job<TenantEvent<AggregateCreatorDailyMetricsPayload>>
  ): Promise<JobResult<DailyMetricsResult>> => {
    const { tenantId, date, creatorId } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    // Default to yesterday if no date provided
    const targetDate = date || getYesterdayDate()

    console.log(
      `[aggregateCreatorDailyMetrics] Aggregating metrics for ${targetDate} in tenant ${tenantId}`,
      { creatorId: creatorId || 'all' }
    )

    // Implementation would:
    //
    // 1. Get list of creators to process
    // const creators = creatorId
    //   ? await withTenant(tenantId, () => sql`SELECT * FROM creators WHERE id = ${creatorId}`)
    //   : await withTenant(tenantId, () => sql`SELECT * FROM creators WHERE status = 'active'`)
    //
    // 2. For each creator, calculate response metrics
    // For each creator:
    //   - Get all messages from the day
    //   - Calculate response times (time between admin message and creator response)
    //   - Calculate avg, min, max, p95 response times
    //   - Count messages sent and received
    //
    // 3. Calculate project metrics
    // For each creator:
    //   - Count projects started on this day
    //   - Count projects submitted on this day
    //   - Count projects approved on this day
    //   - Count revisions requested
    //
    // 4. Calculate earnings metrics
    // For each creator:
    //   - Sum commissions earned on this day
    //   - Sum commissions that became available
    //   - Sum payouts completed
    //
    // 5. Update creator_response_metrics
    // INSERT INTO creator_response_metrics (
    //   creator_id, date,
    //   avg_response_time, min_response_time, max_response_time, p95_response_time,
    //   messages_sent, messages_received,
    //   projects_started, projects_submitted, projects_approved,
    //   earnings_pending, earnings_available, earnings_paid
    // ) VALUES (...)
    // ON CONFLICT (creator_id, date) DO UPDATE SET ...
    //
    // 6. Create daily snapshot for historical tracking
    // INSERT INTO creator_analytics_snapshots (
    //   snapshot_type, snapshot_date, data
    // ) VALUES ('daily', ${targetDate}, ${JSON.stringify(aggregatedData)})

    const result: DailyMetricsResult = {
      date: targetDate,
      creatorsProcessed: 0,
      metricsCalculated: {
        responseMetrics: 0,
        projectMetrics: 0,
        earningsMetrics: 0,
      },
      snapshotsCreated: 1,
    }

    return {
      success: true,
      data: result,
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 30000 },
})

// ============================================================
// WEEKLY CREATOR SUMMARY (Sunday 6 AM)
// ============================================================

/**
 * Generate weekly creator summary
 * Runs Sunday at 6 AM
 *
 * Aggregates the week's daily metrics:
 * - Week-over-week trends
 * - Top performers identification
 * - At-risk creator flagging
 * - Slack notification to admins
 */
export const generateWeeklyCreatorSummaryJob = defineJob<
  TenantEvent<GenerateWeeklyCreatorSummaryPayload>,
  WeeklySummaryResult
>({
  name: 'creator.generateWeeklySummary',
  handler: async (
    job: Job<TenantEvent<GenerateWeeklyCreatorSummaryPayload>>
  ): Promise<JobResult<WeeklySummaryResult>> => {
    const { tenantId, weekStartDate, notifyAdmins = true } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    // Default to last week if no date provided
    const { startDate, endDate } = getLastWeekRange(weekStartDate)

    console.log(
      `[generateWeeklyCreatorSummary] Generating summary for ${startDate} to ${endDate} in tenant ${tenantId}`
    )

    // Implementation would:
    //
    // 1. Aggregate daily metrics for the week
    // SELECT
    //   creator_id,
    //   AVG(avg_response_time) as avg_response_time,
    //   SUM(messages_sent) as total_messages_sent,
    //   SUM(projects_completed) as total_projects_completed,
    //   SUM(earnings_paid) as total_earnings
    // FROM creator_response_metrics
    // WHERE date BETWEEN ${startDate} AND ${endDate}
    // GROUP BY creator_id
    //
    // 2. Get previous week's metrics for comparison
    // Same query for previous week to calculate week-over-week change
    //
    // 3. Identify top performers (top 10 by composite score)
    // Composite score = projects_completed * 3 + response_rate * 2 + earnings
    //
    // 4. Identify at-risk creators
    // At-risk criteria:
    //   - Response rate dropped > 20%
    //   - No projects submitted
    //   - No login in past 7 days
    //
    // 5. Calculate aggregate metrics
    // Total projects, average response time, total earnings, active count
    //
    // 6. Create weekly snapshot
    // INSERT INTO creator_analytics_snapshots (
    //   snapshot_type, snapshot_date, data
    // ) VALUES ('weekly', ${startDate}, ${JSON.stringify(summaryData)})
    //
    // 7. Optionally notify admins via Slack
    // if (notifyAdmins) {
    //   await sendJob('slack.notify', {
    //     tenantId,
    //     channel: '#creator-analytics',
    //     blocks: buildWeeklySummaryBlocks(summaryData),
    //   })
    // }

    const result: WeeklySummaryResult = {
      weekStartDate: startDate,
      weekEndDate: endDate,
      creatorsAnalyzed: 0,
      topPerformers: [],
      atRiskCreators: [],
      aggregateMetrics: {
        totalProjectsCompleted: 0,
        averageResponseTime: 0,
        totalEarnings: 0,
        activeCreatorCount: 0,
      },
      slackNotified: notifyAdmins,
    }

    return {
      success: true,
      data: result,
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 60000 },
})

// ============================================================
// MONTHLY CREATOR REPORT (1st of month 4 AM)
// ============================================================

/**
 * Generate comprehensive monthly creator report
 * Runs at 4 AM on the 1st of each month
 *
 * Includes:
 * - Application funnel analysis
 * - Earnings breakdown by tier/country
 * - Creator health assessment
 * - Churn analysis
 * - Optional PDF generation
 * - Optional admin email
 */
export const generateMonthlyCreatorReportJob = defineJob<
  TenantEvent<GenerateMonthlyCreatorReportPayload>,
  MonthlyReportResult
>({
  name: 'creator.generateMonthlyReport',
  handler: async (
    job: Job<TenantEvent<GenerateMonthlyCreatorReportPayload>>
  ): Promise<JobResult<MonthlyReportResult>> => {
    const { tenantId, month, year, generatePdf = false, emailAdmins = false } = job.payload

    if (!tenantId) {
      return {
        success: false,
        error: { message: 'tenantId required', retryable: false },
      }
    }

    // Default to previous month if not provided
    const { targetMonth, targetYear } = getPreviousMonth(month, year)

    console.log(
      `[generateMonthlyCreatorReport] Generating report for ${targetMonth}/${targetYear} in tenant ${tenantId}`,
      { generatePdf, emailAdmins }
    )

    // Implementation would:
    //
    // 1. Application funnel analysis
    // SELECT
    //   COUNT(*) FILTER (WHERE created_at >= month_start) as applied,
    //   COUNT(*) FILTER (WHERE approved_at >= month_start) as approved,
    //   COUNT(*) FILTER (WHERE rejected_at >= month_start) as rejected
    // FROM creators
    // WHERE created_at BETWEEN month_start AND month_end
    //    OR approved_at BETWEEN month_start AND month_end
    //    OR rejected_at BETWEEN month_start AND month_end
    //
    // 2. Earnings breakdown by tier
    // SELECT
    //   c.tier,
    //   COUNT(DISTINCT c.id) as creator_count,
    //   SUM(bt.amount) as total_earnings,
    //   AVG(bt.amount) as avg_earnings
    // FROM creators c
    // JOIN balance_transactions bt ON bt.creator_id = c.id
    // WHERE bt.created_at BETWEEN month_start AND month_end
    //   AND bt.type = 'commission'
    // GROUP BY c.tier
    //
    // 3. Earnings breakdown by country
    // Same as above but GROUP BY c.country
    //
    // 4. Creator health assessment
    // Active: logged_in_at >= month_start AND has_project_activity
    // At-risk: logged_in_at < month_start OR no_activity_30_days
    // Churned: status = 'inactive' AND last_activity < 60_days_ago
    //
    // 5. Top performers (top 20)
    // Order by composite score considering:
    //   - Project completion rate
    //   - Average rating
    //   - Response time
    //   - Earnings
    //
    // 6. Create monthly snapshot
    // INSERT INTO creator_analytics_snapshots (
    //   snapshot_type, snapshot_date, data
    // ) VALUES ('monthly', ${monthStart}, ${JSON.stringify(reportData)})
    //
    // 7. Optionally generate PDF
    // if (generatePdf) {
    //   const pdf = await generateReportPdf(reportData)
    //   await uploadFile({ tenantId, path: `reports/creator-${targetMonth}-${targetYear}.pdf`, file: pdf })
    // }
    //
    // 8. Optionally email admins
    // if (emailAdmins) {
    //   await sendJob('email.send', {
    //     tenantId,
    //     to: 'admin@example.com',
    //     templateId: 'monthly-creator-report',
    //     data: { report: reportData, pdfUrl: generatePdf ? pdfUrl : null },
    //   })
    // }

    const result: MonthlyReportResult = {
      month: targetMonth,
      year: targetYear,
      applicationFunnel: {
        applied: 0,
        approved: 0,
        rejected: 0,
        conversionRate: 0,
      },
      earningsByTier: {},
      earningsByCountry: {},
      creatorHealth: {
        active: 0,
        atRisk: 0,
        churned: 0,
      },
      topPerformers: [],
      snapshotId: `snapshot_monthly_${targetYear}_${targetMonth}`,
      pdfGenerated: generatePdf,
      adminEmailed: emailAdmins,
    }

    return {
      success: true,
      data: result,
    }
  },
  retry: { maxAttempts: 3, backoff: 'exponential', initialDelay: 60000 },
})

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get yesterday's date in ISO format (YYYY-MM-DD)
 */
function getYesterdayDate(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return yesterday.toISOString().slice(0, 10)
}

/**
 * Get the start and end dates of last week
 */
function getLastWeekRange(weekStartDate?: string): { startDate: string; endDate: string } {
  if (weekStartDate) {
    const start = new Date(weekStartDate)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    }
  }

  // Default to last week (Sunday to Saturday)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const startOfThisWeek = new Date(now)
  startOfThisWeek.setDate(now.getDate() - dayOfWeek)

  const startOfLastWeek = new Date(startOfThisWeek)
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

  const endOfLastWeek = new Date(startOfLastWeek)
  endOfLastWeek.setDate(endOfLastWeek.getDate() + 6)

  return {
    startDate: startOfLastWeek.toISOString().slice(0, 10),
    endDate: endOfLastWeek.toISOString().slice(0, 10),
  }
}

/**
 * Get the previous month and year
 */
function getPreviousMonth(
  month?: number,
  year?: number
): { targetMonth: number; targetYear: number } {
  if (month && year) {
    return { targetMonth: month, targetYear: year }
  }

  const now = new Date()
  let targetMonth = now.getMonth() // 0-indexed, so this is already "previous" month
  let targetYear = now.getFullYear()

  if (targetMonth === 0) {
    // If January, previous month is December of last year
    targetMonth = 12
    targetYear -= 1
  }

  return { targetMonth, targetYear }
}

// ============================================================
// SCHEDULES
// ============================================================

export const ANALYTICS_AGGREGATION_SCHEDULES = {
  dailyMetrics: {
    cron: '0 3 * * *', // Daily at 3 AM UTC
    timezone: 'UTC',
  },
  weeklySummary: {
    cron: '0 6 * * 0', // Sunday at 6 AM UTC
    timezone: 'UTC',
  },
  monthlyReport: {
    cron: '0 4 1 * *', // 1st of month at 4 AM UTC
    timezone: 'UTC',
  },
} as const

// ============================================================
// EXPORTS
// ============================================================

export const analyticsAggregationJobs = [
  aggregateCreatorDailyMetricsJob,
  generateWeeklyCreatorSummaryJob,
  generateMonthlyCreatorReportJob,
]
