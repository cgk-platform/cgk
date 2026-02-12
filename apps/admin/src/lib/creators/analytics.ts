/**
 * Creator analytics data layer with tenant isolation
 */

import { sql, withTenant } from '@cgk/db'

import type {
  AnalyticsPeriod,
  ApplicationFunnel,
  CreatorHealthDashboard,
  CreatorOverviewKPIs,
  EarningsAnalytics,
  HealthCategory,
  HealthScore,
  IndividualCreatorStats,
  LeaderboardEntry,
  LeaderboardMetric,
  PerformanceLeaderboard,
  PipelineAnalytics,
} from './analytics-types'

// Helper to get date interval for period
function getPeriodInterval(period: AnalyticsPeriod): string {
  switch (period) {
    case '7d':
      return '7 days'
    case '30d':
      return '30 days'
    case '90d':
      return '90 days'
    case '12m':
      return '365 days'
    case 'all':
      return '100 years'
    default:
      return '30 days'
  }
}

// Helper to get previous period start for comparison
function getPreviousPeriodDays(period: AnalyticsPeriod): number {
  switch (period) {
    case '7d':
      return 14
    case '30d':
      return 60
    case '90d':
      return 180
    case '12m':
      return 730
    case 'all':
      return 36500
    default:
      return 60
  }
}

/**
 * Get creator overview KPIs for dashboard
 */
export async function getCreatorOverviewKPIs(
  tenantSlug: string,
  period: AnalyticsPeriod = '30d'
): Promise<CreatorOverviewKPIs> {
  return withTenant(tenantSlug, async () => {
    const interval = getPeriodInterval(period)
    const previousDays = getPreviousPeriodDays(period)

    // Get current period metrics
    const currentResult = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status != 'rejected') as total_creators,
        COUNT(*) FILTER (WHERE status = 'active') as active_creators,
        COUNT(*) FILTER (WHERE applied_at >= NOW() - INTERVAL '7 days') as new_apps_week,
        COUNT(*) FILTER (WHERE applied_at >= date_trunc('month', NOW())) as new_apps_month,
        COUNT(*) FILTER (WHERE status = 'approved' AND applied_at >= NOW() - INTERVAL ${interval}) as approved_count,
        COUNT(*) FILTER (WHERE status IN ('approved', 'rejected') AND applied_at >= NOW() - INTERVAL ${interval}) as total_decisions,
        AVG(EXTRACT(EPOCH FROM (approved_at - applied_at)) / 86400)
          FILTER (WHERE approved_at IS NOT NULL AND applied_at >= NOW() - INTERVAL ${interval}) as avg_days_to_approval,
        COUNT(*) FILTER (WHERE status = 'inactive' AND updated_at >= NOW() - INTERVAL '90 days') as churned_90d
      FROM creators
    `

    // Get previous period for comparison
    const prevResult = await sql`
      SELECT
        COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL ${interval}) as prev_total,
        COUNT(*) FILTER (WHERE status = 'active' AND created_at < NOW() - INTERVAL ${interval}) as prev_active,
        COUNT(*) FILTER (WHERE applied_at >= NOW() - INTERVAL ${`${previousDays} days`} AND applied_at < NOW() - INTERVAL ${interval}) as prev_apps
      FROM creators
    `

    // Get earnings for LTV calculation
    const earningsResult = await sql`
      SELECT
        COALESCE(SUM(amount_cents) FILTER (WHERE type != 'payout'), 0)::bigint as total_earned,
        COUNT(DISTINCT creator_id) as creator_count
      FROM balance_transactions
    `

    const current = currentResult.rows[0] || {}
    const prev = prevResult.rows[0] || {}
    const earnings = earningsResult.rows[0] || {}

    const totalCreators = Number(current.total_creators || 0)
    const prevTotalCreators = Number(prev.prev_total || 0)
    const activeCreators = Number(current.active_creators || 0)
    const prevActiveCreators = Number(prev.prev_active || 0)
    const newAppsWeek = Number(current.new_apps_week || 0)
    const newAppsMonth = Number(current.new_apps_month || 0)
    const prevApps = Number(prev.prev_apps || 0)
    const approvedCount = Number(current.approved_count || 0)
    const totalDecisions = Number(current.total_decisions || 1)
    const approvalRate = (approvedCount / totalDecisions) * 100
    const avgDaysToApproval = Number(current.avg_days_to_approval || 0)
    const churnedCreators = Number(current.churned_90d || 0)
    const churnRate = activeCreators > 0 ? (churnedCreators / activeCreators) * 100 : 0
    const totalEarned = Number(earnings.total_earned || 0)
    const creatorCount = Number(earnings.creator_count || 1)
    const avgLTV = totalEarned / creatorCount

    const calcChange = (curr: number, prev: number) => curr - prev
    const calcChangePercent = (curr: number, prev: number) =>
      prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0

    return {
      totalCreators: {
        value: totalCreators,
        previousValue: prevTotalCreators,
        change: calcChange(totalCreators, prevTotalCreators),
        changePercent: calcChangePercent(totalCreators, prevTotalCreators),
      },
      activeCreators: {
        value: activeCreators,
        previousValue: prevActiveCreators,
        change: calcChange(activeCreators, prevActiveCreators),
        changePercent: calcChangePercent(activeCreators, prevActiveCreators),
      },
      newApplicationsWeek: {
        value: newAppsWeek,
        previousValue: prevApps,
        change: calcChange(newAppsWeek, prevApps),
        changePercent: calcChangePercent(newAppsWeek, prevApps),
      },
      newApplicationsMonth: {
        value: newAppsMonth,
        previousValue: prevApps,
        change: calcChange(newAppsMonth, prevApps),
        changePercent: calcChangePercent(newAppsMonth, prevApps),
      },
      approvalRate: {
        value: approvalRate,
        previousValue: 0,
        change: 0,
        changePercent: 0,
      },
      avgTimeToApproval: {
        value: avgDaysToApproval,
        previousValue: 0,
        change: 0,
        changePercent: 0,
      },
      churnRate: {
        value: churnRate,
        previousValue: 0,
        change: 0,
        changePercent: 0,
      },
      avgCreatorLTV: {
        value: avgLTV / 100, // Convert to dollars
        previousValue: 0,
        change: 0,
        changePercent: 0,
      },
    }
  })
}

/**
 * Get application funnel analytics
 */
export async function getApplicationFunnel(
  tenantSlug: string,
  period: AnalyticsPeriod = '30d'
): Promise<ApplicationFunnel> {
  return withTenant(tenantSlug, async () => {
    const interval = getPeriodInterval(period)

    // Get funnel stage counts
    const result = await sql`
      SELECT
        COUNT(*) FILTER (WHERE applied_at >= NOW() - INTERVAL ${interval}) as applications,
        COUNT(*) FILTER (WHERE status IN ('reviewing', 'approved', 'onboarding', 'active') AND applied_at >= NOW() - INTERVAL ${interval}) as in_review,
        COUNT(*) FILTER (WHERE status IN ('approved', 'onboarding', 'active') AND applied_at >= NOW() - INTERVAL ${interval}) as approved,
        COUNT(*) FILTER (WHERE status IN ('onboarding', 'active') AND applied_at >= NOW() - INTERVAL ${interval}) as onboarding_started,
        COUNT(*) FILTER (WHERE status = 'active' AND applied_at >= NOW() - INTERVAL ${interval}) as onboarding_complete,
        COUNT(*) FILTER (WHERE status = 'active' AND applied_at >= NOW() - INTERVAL ${interval}) as first_project,
        COUNT(*) FILTER (WHERE status = 'active' AND applied_at >= NOW() - INTERVAL ${interval}) as monthly_active
      FROM creators
    `

    const row = result.rows[0] || {}
    const applications = Number(row.applications || 0)
    const inReview = Number(row.in_review || 0)
    const approved = Number(row.approved || 0)
    const onboardingStarted = Number(row.onboarding_started || 0)
    const onboardingComplete = Number(row.onboarding_complete || 0)

    // Build funnel stages
    const stages = [
      {
        name: 'Applications Received',
        count: applications,
        conversionRate: 100,
        dropOffRate: 0,
        avgTimeInStage: 0,
        previousCount: 0,
        trend: 0,
      },
      {
        name: 'In Review',
        count: inReview,
        conversionRate: applications > 0 ? (inReview / applications) * 100 : 0,
        dropOffRate: applications > 0 ? ((applications - inReview) / applications) * 100 : 0,
        avgTimeInStage: 2,
        previousCount: 0,
        trend: 0,
      },
      {
        name: 'Approved',
        count: approved,
        conversionRate: inReview > 0 ? (approved / inReview) * 100 : 0,
        dropOffRate: inReview > 0 ? ((inReview - approved) / inReview) * 100 : 0,
        avgTimeInStage: 1,
        previousCount: 0,
        trend: 0,
      },
      {
        name: 'Onboarding Started',
        count: onboardingStarted,
        conversionRate: approved > 0 ? (onboardingStarted / approved) * 100 : 0,
        dropOffRate: approved > 0 ? ((approved - onboardingStarted) / approved) * 100 : 0,
        avgTimeInStage: 3,
        previousCount: 0,
        trend: 0,
      },
      {
        name: 'Onboarding Complete',
        count: onboardingComplete,
        conversionRate: onboardingStarted > 0 ? (onboardingComplete / onboardingStarted) * 100 : 0,
        dropOffRate: onboardingStarted > 0 ? ((onboardingStarted - onboardingComplete) / onboardingStarted) * 100 : 0,
        avgTimeInStage: 5,
        previousCount: 0,
        trend: 0,
      },
    ]

    return {
      stages,
      period,
      totalApplications: applications,
      totalConverted: onboardingComplete,
      overallConversionRate: applications > 0 ? (onboardingComplete / applications) * 100 : 0,
    }
  })
}

/**
 * Get performance leaderboard
 */
export async function getPerformanceLeaderboard(
  tenantSlug: string,
  metric: LeaderboardMetric = 'earnings',
  period: AnalyticsPeriod = '30d',
  limit = 10
): Promise<PerformanceLeaderboard> {
  return withTenant(tenantSlug, async () => {
    const interval = getPeriodInterval(period)
    let entries: LeaderboardEntry[] = []

    if (metric === 'earnings') {
      const result = await sql`
        SELECT
          c.id as creator_id,
          COALESCE(c.display_name, c.first_name || ' ' || c.last_name) as creator_name,
          c.avatar_url,
          c.tier,
          COALESCE(SUM(bt.amount_cents) FILTER (WHERE bt.type != 'payout'), 0)::bigint as value
        FROM creators c
        LEFT JOIN balance_transactions bt ON bt.creator_id = c.id
          AND bt.created_at >= NOW() - INTERVAL ${interval}
        WHERE c.status IN ('active', 'approved', 'onboarding')
        GROUP BY c.id, c.display_name, c.first_name, c.last_name, c.avatar_url, c.tier
        ORDER BY value DESC
        LIMIT ${limit}
      `

      entries = result.rows.map((row, idx) => ({
        creatorId: row.creator_id as string,
        creatorName: row.creator_name as string,
        avatarUrl: row.avatar_url as string | null,
        tier: row.tier as string | null,
        value: Number(row.value || 0),
        formattedValue: `$${(Number(row.value || 0) / 100).toLocaleString()}`,
        rank: idx + 1,
        previousRank: null,
        trend: 'same' as const,
      }))
    } else if (metric === 'projects') {
      const result = await sql`
        SELECT
          c.id as creator_id,
          COALESCE(c.display_name, c.first_name || ' ' || c.last_name) as creator_name,
          c.avatar_url,
          c.tier,
          COUNT(p.id)::int as value
        FROM creators c
        LEFT JOIN projects p ON p.creator_id = c.id
          AND p.status = 'completed'
          AND p.completed_at >= NOW() - INTERVAL ${interval}
        WHERE c.status IN ('active', 'approved', 'onboarding')
        GROUP BY c.id, c.display_name, c.first_name, c.last_name, c.avatar_url, c.tier
        ORDER BY value DESC
        LIMIT ${limit}
      `

      entries = result.rows.map((row, idx) => ({
        creatorId: row.creator_id as string,
        creatorName: row.creator_name as string,
        avatarUrl: row.avatar_url as string | null,
        tier: row.tier as string | null,
        value: Number(row.value || 0),
        formattedValue: `${row.value} projects`,
        rank: idx + 1,
        previousRank: null,
        trend: 'same' as const,
      }))
    } else if (metric === 'response_time') {
      const result = await sql`
        SELECT
          c.id as creator_id,
          COALESCE(c.display_name, c.first_name || ' ' || c.last_name) as creator_name,
          c.avatar_url,
          c.tier,
          COALESCE(AVG(crm.avg_response_time_minutes), 999999)::int as value
        FROM creators c
        LEFT JOIN creator_response_metrics crm ON crm.creator_id = c.id
          AND crm.metric_date >= NOW() - INTERVAL ${interval}
        WHERE c.status IN ('active', 'approved', 'onboarding')
        GROUP BY c.id, c.display_name, c.first_name, c.last_name, c.avatar_url, c.tier
        HAVING AVG(crm.avg_response_time_minutes) IS NOT NULL
        ORDER BY value ASC
        LIMIT ${limit}
      `

      entries = result.rows.map((row, idx) => {
        const minutes = Number(row.value || 0)
        const hours = Math.round(minutes / 60 * 10) / 10
        return {
          creatorId: row.creator_id as string,
          creatorName: row.creator_name as string,
          avatarUrl: row.avatar_url as string | null,
          tier: row.tier as string | null,
          value: minutes,
          formattedValue: `${hours}h avg`,
          rank: idx + 1,
          previousRank: null,
          trend: 'same' as const,
        }
      })
    }

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*)::int as total FROM creators WHERE status IN ('active', 'approved', 'onboarding')
    `

    return {
      metric,
      period,
      entries,
      totalCount: Number(countResult.rows[0]?.total || 0),
    }
  })
}

/**
 * Get earnings analytics
 */
export async function getEarningsAnalytics(
  tenantSlug: string,
  period: AnalyticsPeriod = '30d'
): Promise<EarningsAnalytics> {
  return withTenant(tenantSlug, async () => {
    const interval = getPeriodInterval(period)

    // Get aggregate metrics
    const aggregateResult = await sql`
      SELECT
        COALESCE(SUM(amount_cents) FILTER (WHERE type = 'payout'), 0)::bigint as total_payouts,
        COALESCE(SUM(amount_cents) FILTER (WHERE type != 'payout' AND status = 'pending'), 0)::bigint as total_pending,
        COALESCE(AVG(amount_cents) FILTER (WHERE type != 'payout'), 0)::int as avg_earnings,
        COUNT(DISTINCT creator_id)::int as creator_count
      FROM balance_transactions
      WHERE created_at >= NOW() - INTERVAL ${interval}
    `

    // Get earnings distribution
    const distributionResult = await sql`
      WITH creator_earnings AS (
        SELECT
          creator_id,
          COALESCE(SUM(amount_cents) FILTER (WHERE type != 'payout'), 0) as earnings
        FROM balance_transactions
        WHERE created_at >= NOW() - INTERVAL ${interval}
        GROUP BY creator_id
      )
      SELECT
        CASE
          WHEN earnings = 0 THEN '$0'
          WHEN earnings < 5000 THEN '$1-49'
          WHEN earnings < 10000 THEN '$50-99'
          WHEN earnings < 25000 THEN '$100-249'
          WHEN earnings < 50000 THEN '$250-499'
          WHEN earnings < 100000 THEN '$500-999'
          ELSE '$1000+'
        END as bracket,
        COUNT(*)::int as count
      FROM creator_earnings
      GROUP BY bracket
      ORDER BY MIN(earnings)
    `

    // Get time series data
    const timeSeriesResult = await sql`
      SELECT
        date_trunc('day', created_at)::date as date,
        COALESCE(SUM(amount_cents) FILTER (WHERE type != 'payout'), 0)::bigint as earnings,
        COALESCE(SUM(amount_cents) FILTER (WHERE type = 'payout'), 0)::bigint as payouts,
        COALESCE(SUM(amount_cents) FILTER (WHERE status = 'pending'), 0)::bigint as pending,
        COUNT(DISTINCT creator_id)::int as creator_count
      FROM balance_transactions
      WHERE created_at >= NOW() - INTERVAL ${interval}
      GROUP BY date_trunc('day', created_at)
      ORDER BY date ASC
    `

    const agg = aggregateResult.rows[0] || {}
    const totalPayouts = Number(agg.total_payouts || 0)
    const totalPending = Number(agg.total_pending || 0)
    const avgEarnings = Number(agg.avg_earnings || 0)
    const creatorCount = Number(agg.creator_count || 1)

    // Calculate median (simplified)
    const medianEarnings = avgEarnings

    // Build distribution brackets
    const bracketOrder = ['$0', '$1-49', '$50-99', '$100-249', '$250-499', '$500-999', '$1000+']
    const distMap = new Map(distributionResult.rows.map(r => [r.bracket, Number(r.count || 0)]))
    const totalDist = distributionResult.rows.reduce((sum, r) => sum + Number(r.count || 0), 0) || 1

    const minValues = [0, 1, 50, 100, 250, 500, 1000]
    const maxValues = [0, 49, 99, 249, 499, 999, 999999]

    const distribution = bracketOrder.map((label, idx) => ({
      label,
      min: (minValues[idx] ?? 0) * 100,
      max: (maxValues[idx] ?? 0) * 100,
      count: distMap.get(label) || 0,
      percentage: ((distMap.get(label) || 0) / totalDist) * 100,
    }))

    const timeSeries = timeSeriesResult.rows.map(row => ({
      date: String(row.date),
      totalEarnings: Number(row.earnings || 0),
      payouts: Number(row.payouts || 0),
      pending: Number(row.pending || 0),
      creatorCount: Number(row.creator_count || 0),
    }))

    return {
      period,
      totalPayouts: totalPayouts / 100,
      totalPending: totalPending / 100,
      avgEarningsPerCreator: avgEarnings / 100,
      medianEarnings: medianEarnings / 100,
      commissionConversionRate: 85, // Placeholder
      roas: 3.5, // Placeholder
      distribution,
      timeSeries,
      topCreatorsShare: 45, // Placeholder
      payoutMethodBreakdown: [
        { method: 'Stripe', count: Math.floor(creatorCount * 0.7), amount: totalPayouts * 0.7 },
        { method: 'Wise', count: Math.floor(creatorCount * 0.3), amount: totalPayouts * 0.3 },
      ],
    }
  })
}

/**
 * Calculate health score for a creator
 */
function calculateHealthScore(
  lastActivityDays: number,
  earningsTrend: number,
  responseTimeHours: number,
  onTimeDeliveryPct: number,
  engagementScore: number
): { score: number; category: HealthCategory } {
  // Weights from phase doc
  const activityScore = Math.max(0, 100 - lastActivityDays * 3)
  const earningsScore = Math.min(100, Math.max(0, 50 + earningsTrend * 10))
  const responseScore = Math.max(0, 100 - responseTimeHours * 2)
  const deliveryScore = onTimeDeliveryPct

  const score =
    activityScore * 0.30 +
    earningsScore * 0.20 +
    responseScore * 0.20 +
    deliveryScore * 0.20 +
    engagementScore * 0.10

  let category: HealthCategory
  if (lastActivityDays > 90) {
    category = 'churned'
  } else if (lastActivityDays > 30) {
    category = 'inactive'
  } else if (score >= 90) {
    category = 'champions'
  } else if (score >= 70) {
    category = 'healthy'
  } else {
    category = 'at_risk'
  }

  return { score: Math.round(score), category }
}

/**
 * Get creator health dashboard
 */
export async function getCreatorHealth(
  tenantSlug: string
): Promise<CreatorHealthDashboard> {
  return withTenant(tenantSlug, async () => {
    // Get all creators with metrics
    const result = await sql`
      SELECT
        c.id as creator_id,
        COALESCE(c.display_name, c.first_name || ' ' || c.last_name) as creator_name,
        c.avatar_url,
        c.email,
        c.status,
        c.updated_at,
        EXTRACT(EPOCH FROM (NOW() - c.updated_at)) / 86400 as days_since_activity,
        COALESCE(AVG(crm.avg_response_time_minutes), 240) / 60 as avg_response_hours,
        COALESCE(
          (SELECT COUNT(*) FILTER (WHERE completed_at <= due_date) * 100.0 / NULLIF(COUNT(*), 0)
           FROM projects WHERE creator_id = c.id AND status = 'completed'),
          80
        ) as on_time_pct
      FROM creators c
      LEFT JOIN creator_response_metrics crm ON crm.creator_id = c.id
        AND crm.metric_date >= NOW() - INTERVAL '30 days'
      WHERE c.status IN ('active', 'approved', 'onboarding')
      GROUP BY c.id, c.display_name, c.first_name, c.last_name, c.avatar_url, c.email, c.status, c.updated_at
    `

    const distribution: Record<HealthCategory, number> = {
      champions: 0,
      healthy: 0,
      at_risk: 0,
      inactive: 0,
      churned: 0,
    }

    const atRiskCreators: HealthScore[] = []
    const allScores: HealthScore[] = []

    for (const row of result.rows) {
      const daysSinceActivity = Number(row.days_since_activity || 0)
      const responseHours = Number(row.avg_response_hours || 4)
      const onTimePct = Number(row.on_time_pct || 80)

      const { score, category } = calculateHealthScore(
        daysSinceActivity,
        0, // earnings trend placeholder
        responseHours,
        onTimePct,
        70 // engagement placeholder
      )

      distribution[category]++

      const indicators: string[] = []
      if (daysSinceActivity > 14) indicators.push('No recent activity')
      if (responseHours > 24) indicators.push('Slow response time')
      if (onTimePct < 70) indicators.push('Delivery delays')

      const healthScore: HealthScore = {
        creatorId: row.creator_id as string,
        creatorName: row.creator_name as string,
        avatarUrl: row.avatar_url as string | null,
        email: row.email as string,
        score,
        category,
        components: {
          activity: Math.max(0, 100 - daysSinceActivity * 3),
          earnings: 70,
          response: Math.max(0, 100 - responseHours * 2),
          delivery: onTimePct,
          engagement: 70,
        },
        lastActivity: row.updated_at as string,
        indicators,
      }

      allScores.push(healthScore)
      if (category === 'at_risk') {
        atRiskCreators.push(healthScore)
      }
    }

    // Get pending actions counts
    const pendingResult = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'onboarding')::int as onboarding_incomplete,
        COUNT(*) FILTER (WHERE payout_method IS NULL AND status = 'active')::int as payout_missing
      FROM creators
    `

    const pending = pendingResult.rows[0] || {}

    return {
      distribution,
      atRiskCreators: atRiskCreators.slice(0, 20),
      pendingActions: {
        onboardingIncomplete: Number(pending.onboarding_incomplete || 0),
        taxFormsMissing: 0, // Placeholder
        payoutSetupMissing: Number(pending.payout_missing || 0),
      },
      churnPrediction: allScores
        .filter(s => s.category === 'at_risk')
        .slice(0, 5)
        .map(s => ({
          creatorId: s.creatorId,
          creatorName: s.creatorName,
          probability: Math.min(90, 100 - s.score),
          factors: s.indicators,
        })),
    }
  })
}

/**
 * Get pipeline analytics
 */
export async function getPipelineAnalytics(
  tenantSlug: string,
  period: AnalyticsPeriod = '30d'
): Promise<PipelineAnalytics> {
  return withTenant(tenantSlug, async () => {
    const interval = getPeriodInterval(period)

    // Get stage counts and metrics
    const result = await sql`
      SELECT
        status,
        COUNT(*)::int as count,
        AVG(EXTRACT(EPOCH FROM (updated_at - COALESCE(LAG(updated_at) OVER (PARTITION BY id ORDER BY updated_at), created_at))) / 86400)::numeric(5,2) as avg_days
      FROM creators
      WHERE applied_at >= NOW() - INTERVAL ${interval}
      GROUP BY status
    `

    // Get throughput (completed per week)
    const throughputResult = await sql`
      SELECT
        COUNT(*)::int / GREATEST(1, EXTRACT(EPOCH FROM INTERVAL ${interval}) / 604800)::numeric(5,2) as per_week
      FROM creators
      WHERE status = 'active' AND approved_at >= NOW() - INTERVAL ${interval}
    `

    const stageOrder = ['applied', 'reviewing', 'approved', 'onboarding', 'active']
    const stageMap = new Map(result.rows.map(r => [r.status, r]))

    const stages = stageOrder.map(stage => ({
      stage,
      count: Number(stageMap.get(stage)?.count || 0),
      avgDaysInStage: Number(stageMap.get(stage)?.avg_days || 0),
      wipLimit: stage === 'reviewing' ? 20 : null,
      overLimit: stage === 'reviewing' && Number(stageMap.get(stage)?.count || 0) > 20,
    }))

    // Find bottleneck (longest avg time)
    const bottleneck = stages.reduce((max, s) =>
      s.avgDaysInStage > (max?.avgDaysInStage || 0) ? s : max, stages[0])

    const throughput = Number(throughputResult.rows[0]?.per_week || 0)

    return {
      period,
      totalValueAtRisk: 0, // Placeholder
      avgTimeInPipeline: stages.reduce((sum, s) => sum + s.avgDaysInStage, 0),
      bottleneckStage: bottleneck?.stage || null,
      throughputPerWeek: Math.round(throughput * 10) / 10,
      avgLeadTime: stages.reduce((sum, s) => sum + s.avgDaysInStage, 0),
      stages,
    }
  })
}

/**
 * Get individual creator stats
 */
export async function getIndividualCreatorStats(
  tenantSlug: string,
  creatorId: string
): Promise<IndividualCreatorStats | null> {
  return withTenant(tenantSlug, async () => {
    const result = await sql`
      SELECT
        c.id as creator_id,
        c.created_at as active_since,
        c.updated_at as last_activity,
        COALESCE(SUM(bt.amount_cents) FILTER (WHERE bt.type != 'payout'), 0)::bigint as lifetime_earnings,
        COALESCE(SUM(bt.amount_cents) FILTER (WHERE bt.type != 'payout' AND bt.created_at >= date_trunc('year', NOW())), 0)::bigint as ytd_earnings,
        COALESCE(SUM(bt.amount_cents) FILTER (WHERE bt.type != 'payout' AND bt.created_at >= date_trunc('month', NOW())), 0)::bigint as month_earnings,
        COALESCE(COUNT(p.id), 0)::int as total_projects,
        COALESCE(COUNT(p.id) FILTER (WHERE p.created_at >= date_trunc('month', NOW())), 0)::int as month_projects,
        COALESCE(AVG(p.total_value_cents), 0)::int as avg_project_value,
        COALESCE(AVG(CASE WHEN p.completed_at <= p.due_date THEN 100 ELSE 0 END), 0)::int as on_time_rate,
        COALESCE(AVG(crm.avg_response_time_minutes), 240) / 60 as response_time_hours,
        COALESCE(AVG(p.revision_count) * 100 / NULLIF(COUNT(p.id), 0), 0)::int as revision_rate
      FROM creators c
      LEFT JOIN balance_transactions bt ON bt.creator_id = c.id
      LEFT JOIN projects p ON p.creator_id = c.id AND p.status = 'completed'
      LEFT JOIN creator_response_metrics crm ON crm.creator_id = c.id
      WHERE c.id = ${creatorId}
      GROUP BY c.id, c.created_at, c.updated_at
    `

    if (!result.rows[0]) return null

    const row = result.rows[0]
    const daysSinceActivity = row.last_activity
      ? Math.floor((Date.now() - new Date(row.last_activity as string).getTime()) / 86400000)
      : 30

    const { score, category } = calculateHealthScore(
      daysSinceActivity,
      0,
      Number(row.response_time_hours || 4),
      Number(row.on_time_rate || 80),
      70
    )

    return {
      creatorId: row.creator_id as string,
      lifetimeEarnings: Number(row.lifetime_earnings || 0) / 100,
      ytdEarnings: Number(row.ytd_earnings || 0) / 100,
      thisMonthEarnings: Number(row.month_earnings || 0) / 100,
      totalProjects: Number(row.total_projects || 0),
      thisMonthProjects: Number(row.month_projects || 0),
      avgProjectValue: Number(row.avg_project_value || 0) / 100,
      onTimeDeliveryRate: Number(row.on_time_rate || 0),
      responseTimeAvg: Number(row.response_time_hours || 4),
      revisionRate: Number(row.revision_rate || 0),
      activeSince: row.active_since as string,
      lastActivityDate: row.last_activity as string | null,
      healthScore: score,
      healthCategory: category,
    }
  })
}
